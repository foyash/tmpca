import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// All routes here are admin-only — guarded by proxy.ts (/api/admin/:path*).

const TransferSchema = z.object({
  team_number: z.number().int().min(1).max(99),
});

// PATCH ?email=X — transfer the student to a different team.
// Effects:
//   - Upserts the target team if it doesn't exist (matches registration's behavior).
//   - Updates students.team_number to the new team.
//   - Deletes all ratings where the student is rater OR ratee (across all
//     deliverables). They start fresh on the new team.
export async function PATCH(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'Missing email.' }, { status: 400 });
  }

  const parsed = TransferSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input.' },
      { status: 400 },
    );
  }
  const { team_number } = parsed.data;

  const supabase = getSupabaseAdmin();

  const { data: student } = await supabase
    .from('students')
    .select('email,team_number')
    .eq('email', email)
    .maybeSingle();
  if (!student) {
    return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
  }
  if (student.team_number === team_number) {
    return NextResponse.json(
      { error: 'Student is already on that team.' },
      { status: 400 },
    );
  }

  // Make sure the target team exists.
  const { error: teamErr } = await supabase
    .from('teams')
    .upsert({ team_number, name: `Team ${team_number}` }, { onConflict: 'team_number' });
  if (teamErr) {
    return NextResponse.json({ error: teamErr.message }, { status: 500 });
  }

  // Wipe their ratings (as rater or ratee) — fresh start on the new team.
  // Two deletes because Supabase doesn't support OR filters across columns
  // in the JS client.
  const oldTeam = student.team_number;
  {
    const { error } = await supabase
      .from('ratings')
      .delete()
      .eq('rater_email', email);
    if (error) {
      return NextResponse.json(
        { error: `ratings (rater): ${error.message}` },
        { status: 500 },
      );
    }
  }
  {
    const { error } = await supabase
      .from('ratings')
      .delete()
      .eq('ratee_email', email);
    if (error) {
      return NextResponse.json(
        { error: `ratings (ratee): ${error.message}` },
        { status: 500 },
      );
    }
  }

  // Now move the team.
  const { error: updErr } = await supabase
    .from('students')
    .update({ team_number })
    .eq('email', email);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  // If the old team is now empty, garbage-collect it.
  const { count: oldTeamCount } = await supabase
    .from('students')
    .select('email', { count: 'exact', head: true })
    .eq('team_number', oldTeam);
  if (oldTeamCount === 0) {
    await supabase.from('teams').delete().eq('team_number', oldTeam);
  }

  return NextResponse.json({ ok: true });
}

// DELETE ?email=X — remove the student from the class entirely.
// Effects:
//   - Deletes the auth.users row, which cascades to students, which cascades
//     to all rating rows (rater and ratee). Then garbage-collects empty teams.
//   - Student needs to register again to come back.
export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get('email');
  if (!email) {
    return NextResponse.json({ error: 'Missing email.' }, { status: 400 });
  }

  const supabase = getSupabaseAdmin();

  const { data: student } = await supabase
    .from('students')
    .select('email,team_number,auth_user_id')
    .eq('email', email)
    .maybeSingle();
  if (!student) {
    return NextResponse.json({ error: 'Student not found.' }, { status: 404 });
  }

  // Best path: delete the auth user — cascades to students and ratings.
  if (student.auth_user_id) {
    const { error } = await supabase.auth.admin.deleteUser(student.auth_user_id);
    if (error) {
      return NextResponse.json(
        { error: `auth.users: ${error.message}` },
        { status: 500 },
      );
    }
  } else {
    // Seeded students without auth_user_id: fall back to direct delete.
    // ratings cascade from students.email automatically.
    const { error } = await supabase.from('students').delete().eq('email', email);
    if (error) {
      return NextResponse.json(
        { error: `students: ${error.message}` },
        { status: 500 },
      );
    }
  }

  // GC empty team
  const { count } = await supabase
    .from('students')
    .select('email', { count: 'exact', head: true })
    .eq('team_number', student.team_number);
  if (count === 0) {
    await supabase.from('teams').delete().eq('team_number', student.team_number);
  }

  return NextResponse.json({ ok: true });
}
