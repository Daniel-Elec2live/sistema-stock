import { NextRequest } from 'next/server'
import jwt from 'jsonwebtoken'
import { supabase } from './supabase'
import { AuthUser } from './types'

interface JWTPayload {
  userId: string
  email: string
  customerId: string
  iat: number
  exp: number
}

interface AuthResult {
  success: boolean
  user?: AuthUser
  error?: string
}

export async function verifyAuth(request: NextRequest): Promise<AuthResult> {
  try {
    // Obtener token del header Authorization o de las cookies
    let token = ''

    const authHeader = request.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7) // Remover "Bearer "
    } else {
      // Si no hay header, buscar en cookies
      token = request.cookies.get('auth_token')?.value || ''
    }

    if (!token) {
      return { success: false, error: 'Token de autorización requerido' }
    }

    // Verificar JWT
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured')
      return { success: false, error: 'Error de configuración del servidor' }
    }

    let decoded: JWTPayload
    try {
      decoded = jwt.verify(token, jwtSecret) as JWTPayload
    } catch (jwtError) {
      return { success: false, error: 'Token inválido o expirado' }
    }

    // Obtener información actual del usuario desde la base de datos
    const { data: user, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        customers!customers_user_id_fkey (
          id,
          email,
          name,
          company_name,
          phone,
          address,
          is_approved,
          created_at,
          updated_at
        )
      `)
      .eq('id', decoded.userId)
      .single()

    if (userError || !user) {
      return { success: false, error: 'Usuario no encontrado' }
    }

    // Verificar que el usuario tenga un perfil de cliente
    if (!user.customers || user.customers.length === 0) {
      return { success: false, error: 'Perfil de cliente no encontrado' }
    }

    const customer = user.customers[0]

    // Verificar que el customer ID del token coincida con el actual
    if (customer.id !== decoded.customerId) {
      return { success: false, error: 'Token inválido' }
    }

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        customer: {
          id: customer.id,
          email: customer.email,
          name: customer.name,
          company_name: customer.company_name,
          phone: customer.phone,
          address: customer.address,
          is_approved: customer.is_approved,
          created_at: customer.created_at,
          updated_at: customer.updated_at
        }
      }
    }

  } catch (error) {
    console.error('Auth verification error:', error)
    return { success: false, error: 'Error verificando autenticación' }
  }
}

// Middleware helper para verificar que el cliente esté aprobado
export async function verifyApprovedAuth(request: NextRequest): Promise<AuthResult> {
  const authResult = await verifyAuth(request)
  
  if (!authResult.success) {
    return authResult
  }

  if (!authResult.user?.customer?.is_approved) {
    return { success: false, error: 'Cliente pendiente de aprobación' }
  }

  return authResult
}

// Función para generar hash de contraseña (para use en otros lugares)
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs')
  return bcrypt.hash(password, 12)
}

// Función para verificar contraseña
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs')
  return bcrypt.compare(password, hash)
}

// Función para generar JWT token
export function generateToken(payload: { userId: string; email: string; customerId: string }): string {
  const jwtSecret = process.env.JWT_SECRET
  if (!jwtSecret) {
    throw new Error('JWT_SECRET not configured')
  }

  return jwt.sign(payload, jwtSecret, { expiresIn: '7d' })
}

// Función para verificar token sin request (para uso general)
export function verifyToken(token: string): JWTPayload | null {
  try {
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.log('❌ JWT_SECRET not configured')
      return null
    }

    const decoded = jwt.verify(token, jwtSecret) as JWTPayload
    console.log('✅ Token decoded successfully:', { userId: decoded.userId, email: decoded.email })
    return decoded
  } catch (error) {
    console.log('❌ Token verification failed:', error)
    return null
  }
}

// Función para refrescar token (si está próximo a expirar)
export function shouldRefreshToken(decoded: JWTPayload): boolean {
  const now = Math.floor(Date.now() / 1000)
  const timeUntilExpiry = decoded.exp - now
  const oneDayInSeconds = 24 * 60 * 60

  // Refrescar si expira en menos de 1 día
  return timeUntilExpiry < oneDayInSeconds
}

// Función para extraer token de diferentes fuentes
export function extractToken(request: NextRequest): string | null {
  // Prioridad: Header Authorization > Cookie > Query param
  const authHeader = request.headers.get('authorization')
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7)
  }

  // Fallback a cookie (para requests desde el browser)
  const cookieToken = request.cookies.get('auth_token')?.value
  if (cookieToken) {
    return cookieToken
  }

  // Fallback a query param (para links especiales)
  const queryToken = request.nextUrl.searchParams.get('token')
  if (queryToken) {
    return queryToken
  }

  return null
}