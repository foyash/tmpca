import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// POST /api/admin/reset — wipes all student-generated data, keeps deliverables
// and course_config. Protected by proxy.ts (/api/admin/* matcher).
//
// Order per SPEC §9: ratings → team_grades → students → teams.
// Plus: delete the corresponding auth.users rows so students table doesn't
// leave dangling Supabase Auth accounts.
//
// Note: spec asks for a transaction. The Supabase JS client doesn't expose
// arbitrary transactions; we run the deletes sequentially in the spec's order
// (which avoids FK conflicts). At 30-student scale this is fine; partial
// failure can be recovered by re-running reset.
export async function POST() {
  const supabase = getSupabaseAdmin();

  // Capture auth_user_ids before we wipe the students table.
  const { data: students, error: fetchErr } = await supabase
    .from('students')
    .select('auth_user_id');
  if (fetchErr) {
    return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  }
  const authIds = (students ?? [])
    .map((s) => s.auth_user_id)
    .filter((id): id is string => !!id);

  // 1. ratings
  {
    const { error } = await supabase
      .from('ratings')
      .delete()
      .gte('id', 0);
    if (error) {
      return NextResponse.json(
        { error: `ratings: ${error.message}` },
        { status: 500 },
      );
    }
  }

  // 2. team_grades
  {
    const { error } = await supabase
      .from('team_grades')
      .delete()
      .gte('deliverable_id', 0);
    if (error) {
      return NextResponse.json(
        { error: `team_grades: ${error.message}` },
        { status: 500 },
      );
    }
  }

  // 3. students
  {
    const { error } = await supabase
      .from('students')
      .delete()
      .neq('email', '');
    if (error) {
      return NextResponse.json(
        { error: `students: ${error.message}` },
        { status: 500 },
      );
    }
  }

  // 4. teams
  {
    const { error } = await supabase
      .from('teams')
      .delete()
      .gte('team_number', 0);
    if (error) {
      return NextResponse.json(
        { error: `teams: ${error.message}` },
        { status: 500 },
      );
    }
  }

  // 5. auth.users — best-effort cleanup. Failures here don't roll back the rest.
  const failures: string[] = [];
  for (const id of authIds) {
    const { error } = await supabase.auth.admin.deleteUser(id);
    if (error) failures.push(`${id}: ${error.message}`);
  }
  if (failures.length > 0) {
    return NextResponse.json(
      {
        ok: true,
        warning: `Data wiped, but ${failures.length} auth user(s) could not be deleted: ${failures.join('; ')}`,
      },
      { status: 207 },
    );
  }

  return NextResponse.json({
    ok: true,
    deleted: {
      students: students?.length ?? 0,
      authUsers: authIds.length,
    },
  });
}
