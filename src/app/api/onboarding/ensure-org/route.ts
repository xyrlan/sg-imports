import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  signOrganizationCookie,
  COOKIE_ORG_NAME,
  COOKIE_SIG_NAME,
} from '@/lib/cookie-signature';
import { getAuthenticatedUser } from '@/services/auth.service';
import { getUserOrganizations } from '@/services/organization.service';

const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: COOKIE_MAX_AGE,
  path: '/',
};

/**
 * Route Handler: Ensure organization cookie is set before onboarding
 * Called when user lands on /onboarding without a valid org cookie.
 * Sets cookie (with HMAC sig) and redirects back to /onboarding.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;

  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  const userOrgs = await getUserOrganizations(user.id);

  if (userOrgs.length === 0) {
    return NextResponse.redirect(`${origin}/create-organization`);
  }

  const activeOrgId = userOrgs[0].organization.id;
  const sig = signOrganizationCookie(activeOrgId);

  const response = NextResponse.redirect(`${origin}/onboarding`);
  response.cookies.set(COOKIE_ORG_NAME, activeOrgId, cookieOptions);
  response.cookies.set(COOKIE_SIG_NAME, sig, cookieOptions);

  return response;
}
