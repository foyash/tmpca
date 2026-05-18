import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import {
  signAdminToken,
  constantTimeEqual,
  ADMIN_COOKIE_NAME,
  ADMIN_SESSION_MAX_AGE_SECONDS,
} from '@/lib/auth';

const InputSchema = z.object({
  code: z.string().min(1).max(32),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = InputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input.' }, { status: 400 });
  }

  const expected = process.env.INSTRUCTOR_CODE;
  if (!expected) {
    return NextResponse.json(
      { error: 'Server misconfigured: INSTRUCTOR_CODE is not set.' },
      { status: 500 },
    );
  }

  if (!constantTimeEqual(parsed.data.code, expected)) {
    return NextResponse.json({ error: 'Invalid access code.' }, { status: 401 });
  }

  const token = await signAdminToken();
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
  });

  return NextResponse.json({ ok: true });
}
