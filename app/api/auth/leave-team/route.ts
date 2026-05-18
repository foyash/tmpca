import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';
import { getCurrentStudent } from '@/lib/supabase/queries';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { getSupabaseServer } from '@/lib/supabase/server';
import { ADMIN_COOKIE_NAME } from '@/lib/auth';

// POST — student deletes their own account.
// Requires `{ confirm: "LEAVE" }` body so a stray fetch can't accidentally
// wipe an account. Cascades: auth.users → students → ratings → empty team.
const Schema = z.object({ confirm: z.literal('LEAVE') });

export async function POST(request: Request) {
  const parsed = Schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Confirmation required. Type "LEAVE" to confirm.' },
      { status: 400 },
    );
  }

  const student = await getCurrentStudent();
  const admin = getSupabaseAdmin();

  // Sign out the Supabase session first so the cookie is cleared on the response.
  const supabase = await getSupabaseServer();
  await supabase.auth.signOut().catch(() => null);

  // Belt-and-braces: clear the admin cookie too in case they were impersonating
  // (not a real flow today, but cheap to be safe).
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);

  if (student.auth_user_id) {
    const { error } = await admin.auth.admin.deleteUser(student.auth_user_id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    // Shouldn't happen for properly registered students, but fall back gracefully.
    const { error } = await admin.from('students').delete().eq('email', student.email);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  // GC the team if they were the last member.
  const { count } = await admin
    .from('students')
    .select('email', { count: 'exact', head: true })
    .eq('team_number', student.team_number);
  if (count === 0) {
    await admin.from('teams').delete().eq('team_number', student.team_number);
  }

  return NextResponse.json({ ok: true });
}
