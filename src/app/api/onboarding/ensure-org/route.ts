import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getUserOrganizations } from '@/services/organization.service';
import { createClient } from '@/lib/supabase/server';
const COOKIE_NAME = 'active_organization_id';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/**
 * Route Handler: Ensure organization cookie is set before onboarding
 * Called when user lands on /onboarding without a valid org cookie.
 * Sets cookie and redirects back to /onboarding.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;

  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const userOrgs = await getUserOrganizations(user.id);

  if (userOrgs.length === 0) {
    return NextResponse.redirect(`${origin}/create-organization`);
  }

  const activeOrgId = userOrgs[0].organization.id;

  const response = NextResponse.redirect(`${origin}/onboarding`);
  response.cookies.set(COOKIE_NAME, activeOrgId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });

  return response;
}
