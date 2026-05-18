import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { ADMIN_COOKIE_NAME } from '@/lib/auth';
import { getSupabaseServer } from '@/lib/supabase/server';

export async function POST() {
  // Clear Supabase student session (if any).
  const supabase = await getSupabaseServer();
  await supabase.auth.signOut().catch(() => null);

  // Clear admin JWT cookie (if any).
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE_NAME);

  return NextResponse.json({ ok: true });
}
