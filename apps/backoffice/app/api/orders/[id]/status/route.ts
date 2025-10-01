import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient, updateWithConsistency } from '@/lib/supabase'

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

    // Verificar que el pedido existe (lectura rápida sin complejidad)
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, status')
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

    // ⭐ SOLUCIÓN: UPDATE atómico con RETURNING clause
    // Esto garantiza read-after-write consistency
    const { data: updatedOrder, error: updateError } = await updateWithConsistency(
      supabase,
      'orders',
      updateData,
      { id: orderId }
    )

    if (updateError) {
      console.error('[ORDER STATUS] ❌ Update failed:', updateError)
      return NextResponse.json(
        { success: false, error: 'Error al actualizar el pedido' },
        { status: 500, headers }
      )
    }

    console.log('[ORDER STATUS] ✅ Update successful:', {
      orderId: orderId.slice(0, 8),
      oldStatus: existingOrder.status,
      newStatus: (updatedOrder as any).status,
      confirmed: (updatedOrder as any).status === status
    })

    return NextResponse.json({
      success: true,
      data: {
        order_id: orderId,
        old_status: existingOrder.status,
        new_status: (updatedOrder as any).status,
        updated_at: (updatedOrder as any).updated_at
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