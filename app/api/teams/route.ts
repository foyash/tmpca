import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// Public. Returns teams with member counts. Used by /login registration preview.
export async function GET() {
  const supabase = getSupabaseAdmin();
  const [{ data: teams, error: tErr }, { data: students, error: sErr }] =
    await Promise.all([
      supabase.from('teams').select('team_number,name').order('team_number'),
      supabase.from('students').select('team_number'),
    ]);
  if (tErr || sErr) {
    return NextResponse.json(
      { error: tErr?.message || sErr?.message },
      { status: 500 },
    );
  }

  const counts = new Map<number, number>();
  for (const s of students ?? []) {
    counts.set(s.team_number, (counts.get(s.team_number) ?? 0) + 1);
  }

  return NextResponse.json({
    teams: (teams ?? []).map((t) => ({
      team_number: t.team_number,
      name: t.name,
      member_count: counts.get(t.team_number) ?? 0,
    })),
  });
}
