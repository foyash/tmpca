import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { verifyAdminToken, ADMIN_COOKIE_NAME } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

export default async function Home() {
  const cookieStore = await cookies();
  const adminToken = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  const isAdmin = adminToken ? await verifyAdminToken(adminToken) : null;
  if (isAdmin) redirect('/admin');

  const supabase = await getSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect('/dashboard');

  redirect('/login');
}
