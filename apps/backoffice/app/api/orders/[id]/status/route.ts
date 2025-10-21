import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient, updateWithConsistency } from '@/lib/supabase'
import { sendOrderStatusUpdateToCustomer, sendOrderStatusUpdateToWarehouse } from '@/lib/email'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createSupabaseClient()
    const resolvedParams = await params
    const orderId = resolvedParams.id

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

    const validStatuses = ['pending', 'confirmed', 'prepared', 'delivered', 'cancelled']
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Estado de pedido inválido' },
        { status: 400, headers }
      )
    }

    console.log('[ORDER STATUS] Updating order:', {
      orderId: orderId.slice(0, 8),
      newStatus: status,
      timestamp: new Date().toISOString()
    })

    // Verificar que el pedido existe y obtener datos para emails
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, status, customer_id, total_amount, order_number')
      .eq('id', orderId)
      .single()

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: 'Pedido no encontrado' },
        { status: 404, headers }
      )
    }

    // Preparar datos de actualización
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'cancelled') {
      updateData.cancelled_at = new Date().toISOString()
    }

    // PASO 1: Ejecutar UPDATE
    const { error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)

    if (updateError) {
      console.error('[ORDER STATUS] ❌ Update failed:', updateError)
      return NextResponse.json(
        { success: false, error: 'Error al actualizar el pedido' },
        { status: 500, headers }
      )
    }

    // PASO 2: VERIFICAR el estado real después del UPDATE
    // Esto captura cambios hechos por triggers
    const { data: verifiedOrder, error: verifyError } = await supabase
      .from('orders')
      .select('status, stock_reserved_at, order_number, cancellation_reason, updated_at')
      .eq('id', orderId)
      .single()

    if (verifyError || !verifiedOrder) {
      console.error('[ORDER STATUS] ❌ Verification failed:', verifyError)
      return NextResponse.json(
        { success: false, error: 'Error al verificar el pedido actualizado' },
        { status: 500, headers }
      )
    }

    // PASO 3: Verificar si el trigger cambió el estado
    const actualStatus = verifiedOrder.status
    const statusChanged = actualStatus !== status

    if (statusChanged) {
      console.warn('[ORDER STATUS] ⚠️ Trigger modified status:', {
        requestedStatus: status,
        actualStatus: actualStatus,
        reason: verifiedOrder.cancellation_reason
      })

      // Si el trigger canceló el pedido, devolver error descriptivo
      if (actualStatus === 'cancelled') {
        return NextResponse.json(
          {
            success: false,
            error: verifiedOrder.cancellation_reason || 'El pedido no pudo ser confirmado',
            actual_status: actualStatus
          },
          { status: 400, headers }
        )
      }
    }

    console.log('[ORDER STATUS] ✅ Update verified:', {
      orderId: orderId.slice(0, 8),
      oldStatus: existingOrder.status,
      requestedStatus: status,
      actualStatus: actualStatus,
      statusMatches: !statusChanged,
      stockReserved: !!verifiedOrder.stock_reserved_at
    })

    // PASO 4: Enviar emails si el estado cambió realmente
    if (existingOrder.status !== actualStatus) {
      // Obtener datos del cliente y items para el email
      const { data: customer } = await supabase
        .from('customers')
        .select('name, email')
        .eq('id', existingOrder.customer_id)
        .single()

      const { data: items } = await supabase
        .from('order_items')
        .select('product_name, quantity, unit_price, total_price')
        .eq('order_id', orderId)

      if (customer && items) {
        const emailData = {
          orderId,
          orderNumber: verifiedOrder.order_number,
          customerName: customer.name,
          customerEmail: customer.email,
          status: actualStatus,
          totalAmount: existingOrder.total_amount,
          items
        }

        // Enviar emails en paralelo (esperando a que se completen)
        await Promise.all([
          sendOrderStatusUpdateToCustomer(emailData, existingOrder.status, actualStatus),
          sendOrderStatusUpdateToWarehouse(emailData, existingOrder.status, actualStatus)
        ]).catch(err => console.error('[ORDER STATUS] ❌ Error enviando emails:', err))
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        order_id: orderId,
        old_status: existingOrder.status,
        new_status: actualStatus,  // Estado REAL de la BD
        status_changed_by_trigger: statusChanged,
        updated_at: verifiedOrder.updated_at,
        stock_reserved: !!verifiedOrder.stock_reserved_at,
        order_number: verifiedOrder.order_number
      }
    }, { headers })

  } catch (error) {
    console.error('[ORDER STATUS] 🚨 Critical error:', error)
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