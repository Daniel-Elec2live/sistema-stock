import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { supabase } from '@/lib/supabase'
import { LoginSchema } from '@/lib/validations'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📥 Login request body:', { email: body.email, password: body.password ? '[HIDDEN]' : 'undefined' })
    
    const { email, password } = LoginSchema.parse(body)
    console.log('✅ Login validation passed')

    // Buscar usuario por email
    console.log('🔍 Searching for user with email:', email.toLowerCase())
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, email, password_hash')
      .eq('email', email.toLowerCase())
      .single()

    if (userError || !user) {
      console.log('❌ User not found or error:', userError)
      return NextResponse.json(
        { success: false, error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    console.log('👤 User found:', { id: user.id, email: user.email })

    // Buscar perfil de customer asociado (query separada para evitar problemas con JOINs)
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('id, name, company_name, phone, address, is_approved, created_at, updated_at')
      .eq('user_id', user.id)

    console.log('🔍 Customer query result:', {
      found: customers?.length || 0,
      error: customerError,
      customers: customers
    })

    // Verificar contraseña
    console.log('🔐 Verifying password...')
    const isValidPassword = await bcrypt.compare(password, user.password_hash)
    console.log('🔐 Password valid:', isValidPassword)

    if (!isValidPassword) {
      console.log('❌ Invalid password')
      return NextResponse.json(
        { success: false, error: 'Credenciales inválidas' },
        { status: 401 }
      )
    }

    // Verificar que el usuario tenga un perfil de cliente
    if (customerError || !customers || customers.length === 0) {
      console.log('❌ No customer profile found for user:', {
        error: customerError,
        customersLength: customers?.length
      })
      return NextResponse.json(
        { success: false, error: 'Perfil de cliente no encontrado. Por favor contacta al administrador.' },
        { status: 403 }
      )
    }

    const customer = customers[0]
    console.log('✅ Customer profile found:', { id: customer.id, name: customer.name, isApproved: customer.is_approved })

    // Generar JWT token
    const jwtSecret = process.env.JWT_SECRET
    if (!jwtSecret) {
      console.error('JWT_SECRET not configured')
      return NextResponse.json(
        { success: false, error: 'Error de configuración del servidor' },
        { status: 500 }
      )
    }

    const token = jwt.sign(
      { 
        userId: user.id,
        email: user.email,
        customerId: customer.id
      },
      jwtSecret,
      { expiresIn: '7d' }
    )

    // Actualizar último login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', user.id)

    // Preparar respuesta del usuario (sin password_hash)
    const userResponse = {
      id: user.id,
      email: user.email,
      customer: {
        id: customer.id,
        name: customer.name,
        company_name: customer.company_name,
        phone: customer.phone,
        address: customer.address,
        is_approved: customer.is_approved,
        created_at: customer.created_at,
        updated_at: customer.updated_at
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        user: userResponse,
        token,
        expires_in: '7d'
      },
      message: customer.is_approved 
        ? 'Inicio de sesión exitoso'
        : 'Inicio de sesión exitoso. Tu cuenta está pendiente de aprobación.'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Login API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// Ejemplo de curl:
// curl -X POST "http://localhost:3001/api/auth/login" \
//   -H "Content-Type: application/json" \
//   -d '{"email": "cliente@ejemplo.com", "password": "miPassword123"}'