import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { verifyAuth } from '@/lib/auth'

const CancelOrderSchema = z.object({
  reason: z.string().optional()
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { user } = authResult
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const orderId = resolvedParams.id

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'ID de pedido requerido' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { reason } = CancelOrderSchema.parse(body)

    // Verificar que el pedido existe y pertenece al cliente
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items(
          id,
          product_id,
          quantity,
          product_name
        )
      `)
      .eq('id', orderId)
      .eq('customer_id', user.customer!.id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: 'Pedido no encontrado' },
        { status: 404 }
      )
    }

    // Verificar que el pedido se puede cancelar
    if (order.status === 'cancelled') {
      return NextResponse.json(
        { success: false, error: 'El pedido ya está cancelado' },
        { status: 400 }
      )
    }

    if (order.status === 'delivered') {
      return NextResponse.json(
        { success: false, error: 'No se puede cancelar un pedido entregado' },
        { status: 400 }
      )
    }

    // Solo permitir cancelación por el cliente si está en estado 'pending'
    if (order.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Solo se pueden cancelar pedidos en estado pendiente' },
        { status: 400 }
      )
    }

    // Reponer el stock automáticamente usando la función SQL
    for (const item of order.order_items) {
      const { error: stockError } = await supabase
        .rpc('restore_stock', {
          product_id_param: item.product_id,
          quantity_param: item.quantity
        })

      if (stockError) {
        console.error(`Error restoring stock for product ${item.product_id}:`, stockError)
        // En producción, manejar esto con una cola de tareas o retry
      }
    }

    // Actualizar el estado del pedido
    const { error: updateError } = await supabase
      .from('orders')
      .update({ 
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancellation_reason: reason,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('Error updating order status:', updateError)
      return NextResponse.json(
        { success: false, error: 'Error al cancelar el pedido' },
        { status: 500 }
      )
    }

    // Registrar la cancelación en un log (opcional)
    await supabase
      .from('order_logs')
      .insert({
        order_id: orderId,
        action: 'cancelled',
        details: { reason, cancelled_by: 'customer' },
        created_at: new Date().toISOString()
      })

    return NextResponse.json({
      success: true,
      message: 'Pedido cancelado exitosamente. El stock ha sido repuesto automáticamente.',
      data: {
        order_id: orderId,
        status: 'cancelled',
        stock_restored: order.order_items.map((item: any) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          quantity_restored: item.quantity
        }))
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Cancel Order Error:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// Ejemplo de curl:
// curl -X POST "http://localhost:3001/api/orders/123e4567-e89b-12d3-a456-426614174000/cancel" \
//   -H "Content-Type: application/json" \
//   -H "Authorization: Bearer YOUR_JWT_TOKEN" \
//   -d '{"reason": "Cambio de planes del cliente"}'