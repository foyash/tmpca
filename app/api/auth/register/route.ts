import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { RegisterInput } from '@/lib/validation';

// Two-step registration (SPEC §5, hardened against the email-confirmation toggle):
// 1) Validate input.
// 2) admin.createUser with email_confirm: true (server-only, no email sent — robust
//    whether "Confirm email" is on or off in the Supabase dashboard).
// 3) Upsert team.
// 4) Insert students row referencing auth.users.id.
// 5) signInWithPassword from the server client so @supabase/ssr sets the session cookie.
// On any failure after createUser, deletes the auth user to keep state clean.
export async function POST(request: Request) {
  const parsed = RegisterInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? 'Invalid input.',
        issues: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }
  const { name, email, password, team_number } = parsed.data;

  const admin = getSupabaseAdmin();

  // Reject duplicate email up front for a nicer error than the unique-constraint hit.
  const { data: existing } = await admin
    .from('students')
    .select('email')
    .eq('email', email)
    .maybeSingle();
  if (existing) {
    return NextResponse.json(
      { error: 'An account with that email already exists.' },
      { status: 409 },
    );
  }

  // 1) Create the auth user via the admin API. email_confirm: true marks them as
  // already-confirmed so no verification email is sent.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    return NextResponse.json(
      { error: createErr?.message ?? 'Could not create account.' },
      { status: 400 },
    );
  }
  const authUserId = created.user.id;

  // 2) Upsert team
  const { error: teamErr } = await admin.from('teams').upsert(
    { team_number, name: `Team ${team_number}` },
    { onConflict: 'team_number' },
  );
  if (teamErr) {
    await admin.auth.admin.deleteUser(authUserId).catch(() => null);
    return NextResponse.json({ error: teamErr.message }, { status: 500 });
  }

  // 3) Insert student
  const { error: studentErr } = await admin.from('students').insert({
    email,
    name,
    team_number,
    auth_user_id: authUserId,
  });
  if (studentErr) {
    await admin.auth.admin.deleteUser(authUserId).catch(() => null);
    return NextResponse.json({ error: studentErr.message }, { status: 500 });
  }

  // 4) Sign in via the SSR client so the session cookie is set on the response.
  const supabase = await getSupabaseServer();
  const { error: signInErr } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInErr) {
    // Account was created but the auto-login failed. Don't roll back — user can
    // sign in manually from the form. Surface the issue clearly.
    return NextResponse.json(
      {
        error:
          'Account created, but auto sign-in failed. Please sign in from the form.',
      },
      { status: 207 },
    );
  }

  return NextResponse.json({ ok: true });
}
