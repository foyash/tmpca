import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

export const ADMIN_COOKIE_NAME = 'tmcpa_admin';
export const ADMIN_SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8h per SPEC §5

export type AdminClaims = JWTPayload & { role: 'admin' };

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is not set. See SPEC §7.');
  }
  return new TextEncoder().encode(secret);
}

export async function signAdminToken(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('8h')
    .sign(getSecret());
}

export async function verifyAdminToken(
  token: string,
): Promise<AdminClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      algorithms: ['HS256'],
    });
    if (payload.role !== 'admin') return null;
    return payload as AdminClaims;
  } catch {
    return null;
  }
}

/**
 * Verify the admin cookie. Returns the claims if valid, null otherwise.
 * For use in route handlers that aren't covered by proxy.ts.
 */
export async function getAdminClaimsFromCookies(
  cookieStore: { get: (name: string) => { value: string } | undefined },
): Promise<AdminClaims | null> {
  const token = cookieStore.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyAdminToken(token);
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
