import { createHmac, timingSafeEqual } from 'crypto';

export const COOKIE_ORG_NAME = 'active_organization_id';
export const COOKIE_SIG_NAME = 'active_organization_sig';

/**
 * Sign organization ID with HMAC-SHA256 for cookie integrity.
 * Uses SUPABASE_AUTH_JWT_SECRET (or SUPABASE_JWT_SECRET) - already available in Supabase projects.
 */
export function signOrganizationCookie(orgId: string): string {
  const secret =
    process.env.SUPABASE_AUTH_JWT_SECRET ?? process.env.SUPABASE_JWT_SECRET;
  if (!secret) {
    throw new Error(
      'SUPABASE_AUTH_JWT_SECRET or SUPABASE_JWT_SECRET is required for cookie signing'
    );
  }
  return createHmac('sha256', secret).update(orgId).digest('hex');
}

/**
 * Verify organization cookie signature (constant-time to prevent timing attacks).
 * Returns false if orgId/sig missing or invalid.
 */
export function verifyOrganizationCookie(orgId: string, sig: string): boolean {
  if (!orgId || !sig) return false;
  const expected = signOrganizationCookie(orgId);
  if (sig.length !== expected.length) return false;
  try {
    return timingSafeEqual(
      Buffer.from(sig, 'hex'),
      Buffer.from(expected, 'hex')
    );
  } catch {
    return false;
  }
}
