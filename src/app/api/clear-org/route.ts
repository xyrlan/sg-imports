import { NextResponse, type NextRequest } from 'next/server';
import { COOKIE_ORG_NAME, COOKIE_SIG_NAME } from '@/lib/cookie-signature';

/**
 * Clears the organization cookie and redirects to select-organization.
 * Used when the org in the cookie is invalid (deleted, nuked by seed, or user lost membership)
 * to break the redirect loop between dashboard and select-organization.
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const redirectUrl = `${requestUrl.origin}/select-organization`;
  const response = NextResponse.redirect(redirectUrl);

  // Clear org cookies by setting maxAge to 0
  response.cookies.set(COOKIE_ORG_NAME, '', { maxAge: 0, path: '/' });
  response.cookies.set(COOKIE_SIG_NAME, '', { maxAge: 0, path: '/' });

  return response;
}
