import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Use getUser() para maior segurança, ou continue com getClaims() se performance for crítica
  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  // Configurações de rotas
  const publicRoutes = ['/login', '/register']
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  const isAuthFlow = pathname.startsWith('/auth') || pathname.startsWith('/api/auth') || pathname.startsWith('/verify-email')

  // 1. Caso: Usuário não autenticado
  if (!user) {
    if (isPublicRoute || isAuthFlow) {
      return supabaseResponse
    }
    return redirectTo('/login', request, supabaseResponse)
  }

  // 2. Caso: Usuário autenticado
  const isOnboarded = user.user_metadata?.onboarded === true
  const hasOrg = request.cookies.has('active_organization_id')

  // Lógica de Redirecionamento de Auth (Não deixa logado ir para /login)
  if (isPublicRoute) {
    return redirectTo('/dashboard', request, supabaseResponse)
  }

  // Lógica de Onboarding
  if (!isOnboarded) {
    const allowed = ['/onboarding', '/logout', '/api/onboarding']
    if (!allowed.some(path => pathname.startsWith(path))) {
      return redirectTo('/onboarding', request, supabaseResponse)
    }
    return supabaseResponse
  }

  // Lógica de Seleção de Organização
  if (isOnboarded && !hasOrg) {
    const allowed = ['/select-organization', '/create-organization', '/logout']
    if (!allowed.some(path => pathname.startsWith(path))) {
      return redirectTo('/select-organization', request, supabaseResponse)
    }
    return supabaseResponse
  }

  // Se logado, onboarded e com org, não faz sentido estar em onboarding ou select
  if (pathname === '/onboarding' || pathname === '/select-organization') {
    return redirectTo('/dashboard', request, supabaseResponse)
  }

  return supabaseResponse
}

// Helper para garantir que cookies sejam passados no redirecionamento
function redirectTo(path: string, request: NextRequest, responseWithCookies: NextResponse) {
  const url = request.nextUrl.clone()
  url.pathname = path
  const res = NextResponse.redirect(url)
  
  // Copia os cookies que o Supabase possa ter setado/atualizado
  responseWithCookies.cookies.getAll().forEach(cookie => {
    res.cookies.set(cookie.name, cookie.value, cookie)
  })
  
  return res
}