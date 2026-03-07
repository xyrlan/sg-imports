import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  verifyOrganizationCookie,
  COOKIE_ORG_NAME,
  COOKIE_SIG_NAME,
} from '@/lib/cookie-signature';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;

  // State machine: route classification
  const isLoggingOut = pathname === '/logout';
  const isAuthFlow = ['/login', '/register', '/auth', '/api/auth', '/verify-email'].some(
    (p) => pathname.startsWith(p)
  );
  const isOnboardingRoute =
    pathname.startsWith('/onboarding') || pathname.startsWith('/api/onboarding');
  const isOrgSelectionRoute =
    pathname.startsWith('/select-organization') ||
    pathname.startsWith('/create-organization');

  // 1. Not logged in
  if (!user) {
    if (isAuthFlow) {
      return supabaseResponse;
    }
    return redirectTo('/login', request, supabaseResponse);
  }

  // 2. Logged in on Auth routes (Login/Register)
  if (isAuthFlow && !isLoggingOut) {
    return redirectTo('/dashboard', request, supabaseResponse);
  }

  // 3. Logged in - business flow
  const isOnboarded = user.user_metadata?.onboarded === true;
  const hasOrg = request.cookies.has(COOKIE_ORG_NAME);
  const orgId = request.cookies.get(COOKIE_ORG_NAME)?.value;
  const sig = request.cookies.get(COOKIE_SIG_NAME)?.value;
  const hasValidSig = hasOrg && orgId && sig
    ? verifyOrganizationCookie(orgId, sig)
    : false;

  // Missing onboarding
  if (
    !isOnboarded &&
    !isOnboardingRoute &&
    !isOrgSelectionRoute &&
    !isLoggingOut
  ) {
    return redirectTo('/onboarding', request, supabaseResponse);
  }

  // Onboarded but no org (or invalid signature)
  if (
    isOnboarded &&
    (!hasOrg || !hasValidSig) &&
    !isOrgSelectionRoute &&
    !isLoggingOut &&
    !isOnboardingRoute
  ) {
    return redirectTo('/select-organization', request, supabaseResponse, {
      clearOrgCookies: hasOrg && !hasValidSig,
    });
  }

  // All set, but trying to access onboarding/select
  if (
    isOnboarded &&
    hasOrg &&
    hasValidSig &&
    (isOnboardingRoute || isOrgSelectionRoute)
  ) {
    return redirectTo('/dashboard', request, supabaseResponse);
  }

  return supabaseResponse;
}

function redirectTo(
  path: string,
  request: NextRequest,
  responseWithCookies: NextResponse,
  options?: { clearOrgCookies?: boolean }
) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  const res = NextResponse.redirect(url);

  if (options?.clearOrgCookies) {
    res.cookies.delete(COOKIE_ORG_NAME);
    res.cookies.delete(COOKIE_SIG_NAME);
  }

  responseWithCookies.cookies.getAll().forEach((cookie) => {
    res.cookies.set(cookie.name, cookie.value, cookie);
  });

  return res;
}
