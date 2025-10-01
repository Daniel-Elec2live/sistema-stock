import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  // Endpoint de debug para ver qué cookies llegan al servidor
  const cookies = request.cookies.getAll()
  const authToken = request.cookies.get('auth_token')

  console.log('🍪 DEBUG - All cookies:', cookies)
  console.log('🔑 DEBUG - auth_token:', authToken ? 'exists' : 'null')

  return NextResponse.json({
    cookies: cookies,
    auth_token: authToken ? { exists: true, length: authToken.value.length } : null,
    headers: {
      cookie: request.headers.get('cookie')
    }
  })
}
