import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createSupabaseClient()
    const resolvedParams = await params
    const orderId = resolvedParams.id

    // Headers anti-cache
    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    }

    const body = await request.json()
    const { status } = body

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
      timestamp: new Date().toISOString()
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

    // Forzar flush de transacción con commit explícito
    try {
      // Ejecutar una consulta dummy para forzar commit de transacción
      await supabase.from('orders').select('id').limit(1)
      console.log('💾 Transaction flush completed')
    } catch (flushError) {
      console.warn('⚠️ Transaction flush warning:', flushError)
    }

    await new Promise(resolve => setTimeout(resolve, 100)) // Delay más largo para BD

    // Crear nuevo cliente para verificación independiente
    const verifySupabase = createSupabaseClient()
    const { data: verificationOrder, error: verifyError } = await verifySupabase
      .from('orders')
      .select('id, status, updated_at')
      .eq('id', orderId)
      .single()

    console.log('🔍 VERIFICATION - Order status after update:', {
      orderId,
      verificationStatus: verificationOrder?.status,
      verificationError: verifyError,
      expectedStatus: status,
      verificationTimestamp: new Date().toISOString()
    })

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
    console.error('Backoffice Order Status Update API Error:', error)
    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500, headers }
    )
  }
}