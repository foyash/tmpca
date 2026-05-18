import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { getAdminClaimsFromCookies } from '@/lib/auth';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const StatusEnum = z.enum(['upcoming', 'open', 'finalized']);

async function requireAdmin() {
  const cookieStore = await cookies();
  const admin = await getAdminClaimsFromCookies(cookieStore);
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }
  return null;
}

// GET — public. Returns all deliverables ordered by number.
export async function GET() {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from('deliverables')
    .select('*')
    .order('number');
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ deliverables: data });
}

// POST — admin. Creates a new deliverable. Body is optional; defaults are applied.
const PostSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    deadline: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
      .nullable()
      .optional(),
    status: StatusEnum.optional(),
  })
  .optional();

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const body = await request.json().catch(() => ({}));
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid input.', issues: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();

  // Compute next number = max(existing.number) + 1
  const { data: existing, error: maxErr } = await supabase
    .from('deliverables')
    .select('number')
    .order('number', { ascending: false })
    .limit(1);
  if (maxErr) {
    return NextResponse.json({ error: maxErr.message }, { status: 500 });
  }
  const nextNumber = (existing?.[0]?.number ?? 0) + 1;

  // Default deadline = 2 weeks from now
  const twoWeeks = new Date();
  twoWeeks.setDate(twoWeeks.getDate() + 14);
  const defaultDeadline = twoWeeks.toISOString().slice(0, 10);

  const row = {
    number: nextNumber,
    name: parsed.data?.name ?? `Deliverable ${nextNumber}`,
    deadline: parsed.data?.deadline ?? defaultDeadline,
    status: parsed.data?.status ?? 'upcoming',
  };

  const { data: created, error: insErr } = await supabase
    .from('deliverables')
    .insert(row)
    .select()
    .single();
  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, deliverable: created }, { status: 201 });
}

// PATCH — admin. Updates a deliverable identified by ?id=N.
const PatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  deadline: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
    .nullable()
    .optional(),
  status: StatusEnum.optional(),
});

export async function PATCH(request: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const url = new URL(request.url);
  const id = Number(url.searchParams.get('id'));
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: 'Missing or invalid id.' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success || Object.keys(parsed.data).length === 0) {
    return NextResponse.json(
      { error: 'Invalid input or no fields to update.', issues: parsed.success ? null : parsed.error.flatten() },
      { status: 400 },
    );
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from('deliverables')
    .update(parsed.data)
    .eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

// DELETE — admin. Deletes a deliverable identified by ?id=N.
// Cascades to team_grades and ratings via on-delete-cascade in the schema.
export async function DELETE(request: Request) {
  const auth = await requireAdmin();
  if (auth) return auth;

  const url = new URL(request.url);
  const id = Number(url.searchParams.get('id'));
  if (!Number.isInteger(id) || id < 1) {
    return NextResponse.json({ error: 'Missing or invalid id.' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from('deliverables').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
