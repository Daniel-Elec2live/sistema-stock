import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Cliente Supabase con service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const runtime = 'nodejs'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { approved } = await request.json()

    if (typeof approved !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'approved debe ser boolean' },
        { status: 400 }
      )
    }

    // Actualizar estado de aprobación del cliente
    const { data, error } = await supabase
      .from('customers')
      .update({
        is_approved: approved,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating customer approval:', error)
      return NextResponse.json(
        { success: false, error: 'Error al actualizar cliente' },
        { status: 500 }
      )
    }

    if (!data) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      customer: data,
      message: approved ? 'Cliente aprobado correctamente' : 'Cliente rechazado'
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}