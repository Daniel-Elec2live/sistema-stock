import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Cliente Supabase con service role - bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    db: {
      schema: 'public'
    }
  }
)

export const runtime = 'nodejs'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    // Intento 1: Update normal
    const { data, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', params.id)
      .select('id, is_approved, rejected_at, updated_at')
      .single()

    console.log('[APPROVE] Raw Supabase response:', {
      data: data,
      error: error,
      errorCode: error?.code,
      errorMessage: error?.message,
      errorDetails: error?.details,
      errorHint: error?.hint
    })

    // Si no hay error, verificar si realmente se actualizó
    if (!error && data) {
      console.log('[APPROVE] Update appeared successful, verifying actual change...')

      // Verificación inmediata
      const { data: immediateCheck } = await supabase
        .from('customers')
        .select('is_approved, rejected_at')
        .eq('id', params.id)
        .single()

      console.log('[APPROVE] Immediate verification:', {
        expectedApproved: approved,
        actualApproved: immediateCheck?.is_approved,
        actualRejectedAt: immediateCheck?.rejected_at,
        changeApplied: immediateCheck?.is_approved === approved
      })
    }

    if (error) {
      console.error('[APPROVE] Error updating customer approval:', error)
      return NextResponse.json(
        { success: false, error: `Error al actualizar cliente: ${error.message} (Code: ${error.code})` },
        { status: 500 }
      )
    }

    if (!data) {
      console.error('[APPROVE] No data returned after update - possible RLS issue')
      return NextResponse.json(
        { success: false, error: 'Update completed but no data returned - check RLS policies' },
        { status: 500 }
      )
    }

    console.log('[APPROVE] Cliente actualizado exitosamente:', data)

    // Verificación independiente para confirmar persistencia
    setTimeout(async () => {
      try {
        const { data: verifyData } = await supabase
          .from('customers')
          .select('id, is_approved, rejected_at')
          .eq('id', params.id)
          .single()

        console.log('[APPROVE] Verification check:', {
          customerId: params.id,
          expectedApproved: approved,
          actualApproved: verifyData?.is_approved,
          actualRejectedAt: verifyData?.rejected_at,
          persistenceOk: verifyData?.is_approved === approved
        })
      } catch (verifyError) {
        console.error('[APPROVE] Verification error:', verifyError)
      }
    }, 500)

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