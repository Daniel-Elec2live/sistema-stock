import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('🚪 Logout - Invalidating cookie...')

    // Crear respuesta de logout exitoso
    const response = NextResponse.json({
      success: true,
      message: 'Sesión cerrada correctamente'
    })

    // Invalidar cookie estableciendo Max-Age=0 (expira inmediatamente)
    const cookieOptions = [
      'auth_token=',
      'Path=/',
      'Max-Age=0', // Expira inmediatamente
      'SameSite=None',
      'Secure',
      'HttpOnly'
    ].join('; ')

    response.headers.set('Set-Cookie', cookieOptions)
    console.log('✅ Logout - Cookie invalidated')

    return response

  } catch (error) {
    console.error('❌ Logout error:', error)
    return NextResponse.json(
      { success: false, error: 'Error al cerrar sesión' },
      { status: 500 }
    )
  }
}
