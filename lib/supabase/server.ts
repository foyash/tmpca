import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import 'server-only';

/**
 * Anon Supabase client bound to the request's cookies.
 * Use this in server components and route handlers that should act
 * on behalf of the signed-in student (RLS applies).
 *
 * Step 7 fills this in further as students start signing in.
 */
export async function getSupabaseServer() {
  const cookieStore = await cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    throw new Error(
      'Supabase env vars missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local.',
    );
  }

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component — setting cookies isn't allowed there.
          // Route handlers / Server Actions can ignore this safely.
        }
      },
    },
  });
}
