import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server';
import { SignInInput } from '@/lib/validation';

export async function POST(request: Request) {
  const parsed = SignInInput.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input.' },
      { status: 400 },
    );
  }

  const supabase = await getSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return NextResponse.json(
      { error: 'Incorrect email or password.' },
      { status: 401 },
    );
  }

  return NextResponse.json({ ok: true });
}
