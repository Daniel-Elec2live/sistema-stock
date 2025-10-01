import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // CRÍTICO: Crear cliente fresh en cada request, no reutilizar instancia global
    const supabase = createSupabaseClient()

    console.log('[APPROVE] Iniciando solicitud para cliente:', params.id)

    const body = await request.json()
    console.log('[APPROVE] Body recibido:', body)

    const { approved } = body

    if (typeof approved !== 'boolean') {
      console.log('[APPROVE] Error: approved no es boolean:', typeof approved, approved)
      return NextResponse.json(
        { success: false, error: 'approved debe ser boolean' },
        { status: 400 }
      )
    }

    // Verificar que el cliente existe primero
    const { data: existingCustomer, error: fetchError } = await supabase
      .from('customers')
      .select('id, is_approved, rejected_at')
      .eq('id', params.id)
      .single()

    if (fetchError) {
      console.error('[APPROVE] Error fetching customer:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Error al buscar cliente' },
        { status: 500 }
      )
    }

    if (!existingCustomer) {
      console.log('[APPROVE] Cliente no encontrado:', params.id)
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    console.log('[APPROVE] Cliente actual:', existingCustomer)

    // Actualizar estado de aprobación del cliente
    const updateData: any = {
      is_approved: approved,
      updated_at: new Date().toISOString()
    }

    // Si se rechaza, agregar timestamp de rechazo
    // Si se aprueba, limpiar timestamp de rechazo
    if (approved) {
      updateData.rejected_at = null
    } else {
      updateData.rejected_at = new Date().toISOString()
    }

    console.log('[APPROVE] Datos a actualizar:', updateData)
    console.log('[APPROVE] Supabase config:', {
      url: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING',
      serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING',
      serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
    })

    // CRÍTICO: Forzar escritura inmediata sin cache
    // Usar .maybeSingle() en lugar de .single() para evitar errores si no encuentra
    const { data, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', params.id)
      .select('id, is_approved, rejected_at, updated_at')
      .single()

    if (error) {
      console.error('[APPROVE] Error al actualizar:', {
        code: error.code,
        message: error.message,
        details: error.details
      })
      return NextResponse.json(
        { success: false, error: `Error al actualizar cliente: ${error.message}` },
        { status: 500 }
      )
    }

    if (!data) {
      console.error('[APPROVE] No se retornaron datos tras update - revisar RLS policies')
      return NextResponse.json(
        { success: false, error: 'Update completado pero sin datos retornados' },
        { status: 500 }
      )
    }

    console.log('[APPROVE] ✅ Cliente actualizado:', {
      id: data.id,
      is_approved: data.is_approved,
      rejected_at: data.rejected_at
    })

    return NextResponse.json({
      success: true,
      customer: data,
      message: approved ? 'Cliente aprobado correctamente' : 'Cliente rechazado'
    })

  } catch (error) {
    console.error('[APPROVE] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: `Error interno del servidor: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}