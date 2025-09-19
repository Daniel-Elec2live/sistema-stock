import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { supabase } from '@/lib/supabase'
import { RegisterSchema } from '@/lib/validations'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    console.log('📥 Registration request body:', JSON.stringify(body, null, 2))
    
    const validatedData = RegisterSchema.parse(body)
    console.log('✅ Validation passed:', JSON.stringify(validatedData, null, 2))

    const { email, password, name, company_name, phone, address } = validatedData

    // Verificar si el email ya existe
    const { data: existingUser, error: userCheckError } = await supabase
      .from('users')
      .select('email')
      .eq('email', email.toLowerCase())
      .single()

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'El email ya está registrado' },
        { status: 409 }
      )
    }

    if (userCheckError && userCheckError.code !== 'PGRST116') {
      // PGRST116 es "not found", que es lo que esperamos
      console.error('Error checking user:', userCheckError)
      return NextResponse.json(
        { success: false, error: 'Error verificando usuario existente' },
        { status: 500 }
      )
    }

    // Hash de la contraseña
    const saltRounds = 12
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // Crear usuario
    const { data: newUser, error: userError } = await supabase
      .from('users')
      .insert({
        email: email.toLowerCase(),
        password_hash: passwordHash,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id, email')
      .single()

    if (userError || !newUser) {
      console.error('Error creating user:', userError)
      return NextResponse.json(
        { success: false, error: 'Error creando usuario' },
        { status: 500 }
      )
    }

    // Determinar si auto-aprobar (solo en desarrollo o configuración específica)
    const autoApprove = process.env.NEXT_PUBLIC_AUTO_APPROVE_CUSTOMERS === 'true'

    // Crear perfil de cliente
    const { data: newCustomer, error: customerError } = await supabase
      .from('customers')
      .insert({
        user_id: newUser.id,
        email: email.toLowerCase(),
        name: name.trim(),
        company_name: company_name?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        is_approved: autoApprove,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (customerError || !newCustomer) {
      console.error('Error creating customer:', customerError)
      
      // Rollback: eliminar usuario creado
      await supabase
        .from('users')
        .delete()
        .eq('id', newUser.id)

      return NextResponse.json(
        { success: false, error: 'Error creando perfil de cliente' },
        { status: 500 }
      )
    }

    // Log de registro (opcional, para auditoría)
    const { error: logError } = await supabase
      .from('audit_logs')
      .insert({
        action: 'customer_registered',
        entity_type: 'customer',
        entity_id: newCustomer.id,
        details: {
          email: email.toLowerCase(),
          auto_approved: autoApprove,
          company_name: company_name || null
        },
        created_at: new Date().toISOString()
      });

    if (logError) {
      console.warn('Failed to log registration:', logError);
      // No fallar el registro por un error de log
    }

    // TODO: Enviar email de bienvenida (en Fase 2)
    // TODO: Notificar al admin de nuevo registro (en Fase 2)

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: newUser.id,
          email: newUser.email
        },
        customer: {
          id: newCustomer.id,
          name: newCustomer.name,
          company_name: newCustomer.company_name,
          is_approved: newCustomer.is_approved
        }
      },
      message: autoApprove 
        ? 'Registro exitoso. Ya puedes iniciar sesión y realizar pedidos.'
        : 'Registro exitoso. Tu cuenta está pendiente de aprobación por nuestro equipo.'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.log('❌ Zod validation error:', JSON.stringify(error.issues, null, 2))
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('❌ Register API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// Ejemplo de curl:
// curl -X POST "http://localhost:3001/api/auth/register" \
//   -H "Content-Type: application/json" \
//   -d '{
//     "email": "nuevo@cliente.com",
//     "password": "MiPassword123",
//     "confirmPassword": "MiPassword123",
//     "name": "Juan Pérez",
//     "company_name": "Restaurante El Buen Sabor",
//     "phone": "+34 666 123 456",
//     "address": "Calle Principal 123, Madrid"
//   }'