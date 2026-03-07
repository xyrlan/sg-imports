import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) => supabaseResponse.cookies.set(name, value, options))
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: If you remove getClaims() and you use server-side rendering
  // with the Supabase client, your users may be randomly logged out.
  const { data } = await supabase.auth.getClaims()

  const user = data?.claims
  const { pathname } = request.nextUrl

  // Define public routes that don't require authentication
  const publicRoutes = ['/login', '/register']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  const isAuthCallback = pathname.startsWith('/auth') || pathname.startsWith('/api/auth')
  const isVerifyEmail = pathname.startsWith('/verify-email')

  // Case 1: User is NOT logged in
  if (!user) {
    // Allow access to public routes, auth callbacks, and verify-email
    if (isPublicRoute || isAuthCallback || isVerifyEmail) {
      return supabaseResponse
    }

    // Redirect to login for protected routes
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  // Case 2: User IS logged in
  // Allow access to verify-email page (for post-registration flow)
  if (user) {
    // 1. Pegue as flags de estado (recomendo usar user_metadata do Supabase para ser rápido)
    const isOnboarded = user.user_metadata?.onboarded === true;
    const hasOrg = request.cookies.has('active_organization_id');

    // 2. Proteção de Onboarding - rotas permitidas quando !isOnboarded
    const allowedWhenNotOnboarded = ['/onboarding', '/create-organization', '/select-organization', '/login', '/logout'];
    if (!isOnboarded && !allowedWhenNotOnboarded.includes(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = '/onboarding';
      return NextResponse.redirect(url);
    }

    // 3. Proteção de Seleção de Organização
    // Se já fez onboarding, mas não escolheu a empresa
    if (isOnboarded && !hasOrg && pathname !== '/select-organization' && pathname !== '/onboarding') {
      const url = request.nextUrl.clone();
      url.pathname = '/select-organization';
      return NextResponse.redirect(url);
    }

    // 4. Se ele já tem tudo, não deixa ele voltar para onboarding ou select-org
    if (isOnboarded && hasOrg && (pathname === '/onboarding' || pathname === '/select-organization')) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }

    // 5. Permitir /login e /logout para usuários logados (trocar conta ou sair)
    if (pathname === '/login' || pathname === '/logout') {
      return supabaseResponse;
    }

    // 6. Redirecionar usuários logados para longe de outras rotas públicas (/register)
    if (isPublicRoute) {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  // Redirect authenticated users away from auth pages
  if (isPublicRoute) {
    const url = request.nextUrl.clone()
    // Default redirect to dashboard (onboarding page will handle incomplete setup)
    url.pathname = '/dashboard'
    const redirectResponse = NextResponse.redirect(url)
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value, cookie)
    })
    return redirectResponse
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is. If you're
  // creating a new response object with NextResponse.next() make sure to:
  // 1. Pass the request in it, like so:
  //    const myNewResponse = NextResponse.next({ request })
  // 2. Copy over the cookies, like so:
  //    myNewResponse.cookies.setAll(supabaseResponse.cookies.getAll())
  // 3. Change the myNewResponse object to fit your needs, but avoid changing
  //    the cookies!
  // 4. Finally:
  //    return myNewResponse
  // If this is not done, you may be causing the browser and server to go out
  // of sync and terminate the user's session prematurely!

  return supabaseResponse
}