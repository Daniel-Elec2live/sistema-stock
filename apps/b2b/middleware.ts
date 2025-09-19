import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

export const runtime = 'nodejs'

// Rutas que requieren autenticación
const protectedRoutes = [
  '/catalogo',
  '/producto',
  '/carrito', 
  '/checkout',
  '/pedidos',
  '/confirmacion'
]

// Rutas solo para usuarios no autenticados
const authOnlyRoutes = ['/login', '/register']


export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  
  // Permitir archivos estáticos, API routes y Next.js internals
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Obtener token de autenticación
  const token = request.cookies.get('auth_token')?.value || 
                request.headers.get('authorization')?.replace('Bearer ', '')

  console.log('🔍 Middleware - Path:', pathname)
  console.log('🍪 Middleware - Token from cookies:', token ? 'Found' : 'Not found')

  let isAuthenticated = false

  if (token) {
    const decoded = verifyToken(token)
    console.log('🔐 Middleware - Token verification:', decoded ? 'Valid' : 'Invalid')
    if (decoded) {
      isAuthenticated = true
    }
  }

  console.log('✅ Middleware - Is authenticated:', isAuthenticated)

  // Verificar si la ruta actual está protegida
  const isProtectedRoute = protectedRoutes.some(route => 
    pathname.startsWith(route)
  )
  
  const isAuthOnlyRoute = authOnlyRoutes.some(route => 
    pathname.startsWith(route)
  )

  // Redirigir usuarios no autenticados de rutas protegidas
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('from', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirigir usuarios autenticados de rutas de auth
  if (isAuthOnlyRoute && isAuthenticated) {
    const fromParam = request.nextUrl.searchParams.get('from')
    const redirectTo = fromParam && fromParam.startsWith('/') ? fromParam : '/catalogo'
    return NextResponse.redirect(new URL(redirectTo, request.url))
  }

  // Redirigir raíz a catálogo si está autenticado, a login si no
  if (pathname === '/') {
    const redirectTo = isAuthenticated ? '/catalogo' : '/login'
    return NextResponse.redirect(new URL(redirectTo, request.url))
  }

  // Headers de seguridad adicionales
  const response = NextResponse.next()
  
  // Prevenir embedding en iframe
  response.headers.set('X-Frame-Options', 'DENY')
  
  // Prevenir MIME type sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff')
  
  // XSS Protection
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  
  // No cachear páginas que requieren autenticación
  if (isProtectedRoute) {
    response.headers.set('Cache-Control', 'no-store, must-revalidate')
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*$).*)',
  ],
}