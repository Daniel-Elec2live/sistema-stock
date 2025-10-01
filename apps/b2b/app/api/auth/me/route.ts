import { NextRequest, NextResponse } from 'next/server'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 /api/auth/me - Verifying auth from HTTP-only cookie...')

    const authResult = await verifyAuth(request)

    console.log('🔐 /api/auth/me - Auth result:', authResult.success ? 'Valid' : 'Invalid')

    if (!authResult.success || !authResult.user) {
      console.log('❌ /api/auth/me - No valid session')
      return NextResponse.json(
        { success: false, error: authResult.error ?? 'Sesión no válida' },
        { status: 401 }
      )
    }

    const user = authResult.user

    // Obtener token de la cookie para devolverlo al cliente
    const token = request.cookies.get('auth_token')?.value

    console.log('✅ /api/auth/me - Returning user:', { email: user.email, hasToken: !!token })

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          customer: user.customer ? {
            id: user.customer.id,
            name: user.customer.name,
            company_name: user.customer.company_name,
            phone: user.customer.phone,
            address: user.customer.address,
            is_approved: user.customer.is_approved,
            created_at: user.customer.created_at,
            updated_at: user.customer.updated_at
          } : null
        },
        token: token // Devolver token para uso en otros endpoints desde cliente
      }
    })

  } catch (error) {
    console.error('Auth me API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// Ejemplo de curl:
// curl -X GET "http://localhost:3001/api/auth/me" \
//   -H "Authorization: Bearer YOUR_JWT_TOKEN"