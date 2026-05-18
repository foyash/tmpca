import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentStudent } from '@/lib/supabase/queries';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// GET ?deliverable_id=N — returns the current student's rating drafts for this
// deliverable (so the rating flow can hydrate when a user reloads mid-form).
export async function GET(request: Request) {
  const student = await getCurrentStudent();
  const url = new URL(request.url);
  const deliverableId = Number(url.searchParams.get('deliverable_id'));
  if (!Number.isInteger(deliverableId) || deliverableId < 1) {
    return NextResponse.json({ error: 'Missing or invalid deliverable_id.' }, { status: 400 });
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('ratings')
    .select('*')
    .eq('rater_email', student.email)
    .eq('deliverable_id', deliverableId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ratings: data });
}

const PutSchema = z.object({
  deliverable_id: z.number().int().positive(),
  ratee_email: z.string().email(),
  contribution: z.number().min(0).max(5),
  professionalism: z.number().min(0).max(5),
  cont_comment: z.string().max(2000).nullable().optional(),
  prof_comment: z.string().max(2000).nullable().optional(),
});

// PUT — upsert a single draft rating. Rater = current student. submitted stays false
// (or remains true if already submitted — but in practice submitted rows are read-only).
export async function PUT(request: Request) {
  const student = await getCurrentStudent();
  const parsed = PutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? 'Invalid input.',
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }
  const { deliverable_id, ratee_email, contribution, professionalism, cont_comment, prof_comment } =
    parsed.data;

  const supabase = getSupabaseAdmin();

  // SPEC §9 watch-out: ratee must be in the same team as the rater.
  const { data: ratee } = await supabase
    .from('students')
    .select('team_number')
    .eq('email', ratee_email)
    .maybeSingle();
  if (!ratee || ratee.team_number !== student.team_number) {
    return NextResponse.json(
      { error: 'You can only rate teammates on your own team.' },
      { status: 403 },
    );
  }

  // Verify the deliverable exists and is open.
  const { data: deliverable } = await supabase
    .from('deliverables')
    .select('status')
    .eq('id', deliverable_id)
    .maybeSingle();
  if (!deliverable) {
    return NextResponse.json({ error: 'Deliverable not found.' }, { status: 404 });
  }
  if (deliverable.status !== 'open') {
    return NextResponse.json(
      { error: 'This deliverable is not open for ratings.' },
      { status: 403 },
    );
  }

  // Block edits after submission.
  const { data: existing } = await supabase
    .from('ratings')
    .select('submitted')
    .eq('deliverable_id', deliverable_id)
    .eq('rater_email', student.email)
    .eq('ratee_email', ratee_email)
    .maybeSingle();
  if (existing?.submitted) {
    return NextResponse.json(
      { error: 'These ratings are already submitted and cannot be edited.' },
      { status: 409 },
    );
  }

  const { error } = await supabase.from('ratings').upsert(
    {
      deliverable_id,
      rater_email: student.email,
      ratee_email,
      contribution,
      professionalism,
      cont_comment: cont_comment ?? null,
      prof_comment: prof_comment ?? null,
      submitted: false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'deliverable_id,rater_email,ratee_email' },
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

const SubmitSchema = z.object({ deliverable_id: z.number().int().positive() });

// POST — submit all of the current student's drafts for a deliverable. All-or-nothing:
// every teammate must have a draft row before this succeeds.
export async function POST(request: Request) {
  const student = await getCurrentStudent();
  const parsed = SubmitSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Missing deliverable_id.' }, { status: 400 });
  }
  const { deliverable_id } = parsed.data;

  const supabase = getSupabaseAdmin();

  // Count of teammates I should have rated
  const { count: teamSize, error: teamErr } = await supabase
    .from('students')
    .select('email', { count: 'exact', head: true })
    .eq('team_number', student.team_number);
  if (teamErr || teamSize == null) {
    return NextResponse.json(
      { error: teamErr?.message ?? 'Could not count team members.' },
      { status: 500 },
    );
  }

  // Count of drafts I have for this deliverable
  const { count: draftCount, error: countErr } = await supabase
    .from('ratings')
    .select('id', { count: 'exact', head: true })
    .eq('deliverable_id', deliverable_id)
    .eq('rater_email', student.email);
  if (countErr || draftCount == null) {
    return NextResponse.json(
      { error: countErr?.message ?? 'Could not count drafts.' },
      { status: 500 },
    );
  }
  if (draftCount < teamSize) {
    return NextResponse.json(
      {
        error: `Rate all teammates first. ${draftCount} of ${teamSize} ready.`,
      },
      { status: 400 },
    );
  }

  // Atomically flip submitted=true on every draft for this rater + deliverable.
  const { error: updErr } = await supabase
    .from('ratings')
    .update({ submitted: true, updated_at: new Date().toISOString() })
    .eq('deliverable_id', deliverable_id)
    .eq('rater_email', student.email);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
