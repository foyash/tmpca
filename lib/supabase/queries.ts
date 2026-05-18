import { cache } from 'react';
import { redirect } from 'next/navigation';
import 'server-only';
import { getSupabaseServer } from './server';
import { getSupabaseAdmin } from './admin';
import type { StudentRow } from '@/lib/types';

/**
 * Loads the currently signed-in student row. Redirects to /login if not
 * signed in or if the auth user has no matching students row (orphaned state).
 *
 * Wrapped in React's `cache` so multiple calls in the same server request
 * (e.g. from the page + TopBar) hit Supabase only once.
 */
export const getCurrentStudent = cache(async (): Promise<StudentRow> => {
  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const admin = getSupabaseAdmin();
  const { data } = await admin
    .from('students')
    .select('*')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (!data) redirect('/login');
  return data as StudentRow;
});
