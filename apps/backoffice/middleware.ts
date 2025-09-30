import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const basicAuth = request.headers.get('authorization')
  const url = request.nextUrl

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1]
    const [user, pwd] = atob(authValue).split(':')

    if (user === process.env.ADMIN_USER && pwd === process.env.ADMIN_PASSWORD) {
      return NextResponse.next()
    }
  }

  return new Response('Acceso restringido', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Backoffice La Traviata"',
    },
  })
}

export const config = {
  // Excluir TODAS las API routes y archivos estáticos del middleware de autenticación
  // Solo aplicar autenticación básica a las páginas del dashboard
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|logo.png).*)'],
}