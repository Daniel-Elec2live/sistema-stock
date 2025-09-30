import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // LOG INMEDIATO - Confirmar que la request LLEGA al handler
  console.log('🚀 [PATCH /api/orders/[id]/status] REQUEST RECEIVED:', {
    timestamp: new Date().toISOString(),
    url: request.url,
    method: request.method,
    headers: Object.fromEntries(request.headers.entries())
  })

  try {
    const supabase = createSupabaseClient()
    const resolvedParams = await params
    const orderId = resolvedParams.id

    console.log('🔑 [PATCH] Extracted orderId:', orderId)

    // Headers anti-cache
    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    }

    const body = await request.json()
    const { status } = body

    console.log('📦 [PATCH] Request body parsed:', { status, orderId })

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'ID de pedido requerido' },
        { status: 400, headers }
      )
    }

    if (!status || !['pending', 'confirmed', 'prepared', 'delivered', 'cancelled'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Estado de pedido inválido' },
        { status: 400, headers }
      )
    }

    console.log('🔄 Backoffice API - Updating order status:', {
      orderId,
      newStatus: status,
      timestamp: new Date().toISOString(),
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30) + '...'
    })

    // Verificar que el pedido existe
    const { data: existingOrder, error: fetchError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('id', orderId)
      .single()

    if (fetchError || !existingOrder) {
      console.error('❌ Order not found:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Pedido no encontrado' },
        { status: 404, headers }
      )
    }

    // Preparar los datos de actualización
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    // Añadir timestamp específico según el estado
    switch (status) {
      case 'cancelled':
        updateData.cancelled_at = new Date().toISOString()
        // Nota: El trigger de cancelación debería reponer el stock automáticamente
        break
      // Los estados confirmed, prepared, delivered no tienen timestamps específicos en el schema actual
      // Se usa updated_at para todos
    }

    // Actualizar el pedido
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .select('*')
      .single()

    if (updateError) {
      console.error('❌ Update error:', updateError)
      console.error('❌ Update error details:', {
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint,
        code: updateError.code
      })
      return NextResponse.json(
        { success: false, error: 'Error al actualizar el pedido' },
        { status: 500, headers }
      )
    }

    console.log('✅ Order status updated successfully:', {
      orderId,
      oldStatus: existingOrder.status,
      newStatus: status,
      actualUpdatedData: updatedOrder
    })

    // VERIFICACIÓN INMEDIATA: Comprobar si el update realmente se persistió
    const { data: verifyOrder, error: verifyError } = await supabase
      .from('orders')
      .select('id, status, updated_at')
      .eq('id', orderId)
      .single()

    console.log('🔍 IMMEDIATE VERIFICATION after update:', {
      orderId,
      expectedStatus: status,
      actualStatus: verifyOrder?.status,
      actualUpdated: verifyOrder?.updated_at,
      verifyError: verifyError?.message,
      updateWasSuccessful: !updateError,
      verificationMatches: verifyOrder?.status === status
    })

    if (verifyOrder?.status !== status) {
      console.error('🚨 CRITICAL: Update appeared successful but verification failed!')
      console.error('🚨 This indicates RLS policies or transaction rollback issues')
    }

    // SIMULACIÓN: Ver qué devolverá el endpoint GET /api/orders inmediatamente después
    const { data: simulateGetAll, error: simError } = await supabase
      .from('orders')
      .select('id, status, updated_at')
      .order('created_at', { ascending: false })
      .limit(10)

    console.log('🎭 SIMULATION - What GET /api/orders will return RIGHT NOW:')
    simulateGetAll?.forEach((o: any) => {
      console.log(`  ORDER ${o.id.slice(0, 8)}: status="${o.status}" updated_at="${o.updated_at}"`)
    })
    console.log('🎭 END SIMULATION')

    console.log('✅ Order status update completed successfully')

    return NextResponse.json({
      success: true,
      data: {
        order_id: orderId,
        old_status: existingOrder.status,
        new_status: status,
        updated_at: updateData.updated_at
      }
    }, { headers })

  } catch (error) {
    console.error('🚨 [PATCH] CRITICAL ERROR in handler:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    })
    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
    return NextResponse.json(
      {
        success: false,
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500, headers }
    )
  }
}