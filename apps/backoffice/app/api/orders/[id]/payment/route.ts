import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const timestamp = Date.now()

    // Crear cliente fresco con headers únicos (igual que en orders/[id]/status)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false },
        db: { schema: 'public' },
        global: {
          headers: {
            'Cache-Control': 'no-cache, no-store',
            'X-Request-ID': `payment-${timestamp}`
          }
        }
      }
    )

    const resolvedParams = await params
    const orderId = resolvedParams.id

    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    }

    const body = await request.json()
    const { payment_status } = body

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'ID de pedido requerido' },
        { status: 400, headers }
      )
    }

    // Solo pending o paid
    const validPaymentStatuses = ['pending', 'paid']
    if (!payment_status || !validPaymentStatuses.includes(payment_status)) {
      return NextResponse.json(
        { success: false, error: 'Estado de pago invalido (solo pending o paid)' },
        { status: 400, headers }
      )
    }

    console.log('[PAYMENT STATUS] Updating payment:', {
      orderId: orderId.slice(0, 8),
      newPaymentStatus: payment_status,
      timestamp: new Date().toISOString()
    })

    // Verificar que el pedido existe
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id, payment_status')
      .eq('id', orderId)
      .single()

    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: 'Pedido no encontrado' },
        { status: 404, headers }
      )
    }

    // PASO 1: Ejecutar UPDATE simple
    const { error: updateError } = await supabase
      .from('orders')
      .update({
        payment_status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)

    if (updateError) {
      console.error('[PAYMENT STATUS] Error al actualizar:', updateError)
      return NextResponse.json(
        { success: false, error: 'Error al actualizar el estado de pago' },
        { status: 500, headers }
      )
    }

    // PASO 2: VERIFICAR el estado real despues del UPDATE
    // Añadir cache-busting query (igual que en orders route)
    const { data: verifiedOrder, error: verifyError } = await supabase
      .from('orders')
      .select('payment_status, updated_at')
      .eq('id', orderId)
      .gte('created_at', '2000-01-01') // Cache buster
      .single()

    if (verifyError || !verifiedOrder) {
      console.error('[PAYMENT STATUS] ❌ Error al verificar:', verifyError)
      return NextResponse.json(
        { success: false, error: 'Error al verificar el pago actualizado' },
        { status: 500, headers }
      )
    }

    const actualPaymentStatus = verifiedOrder.payment_status
    const statusChangedByTrigger = actualPaymentStatus !== payment_status

    console.log('[PAYMENT STATUS] ✅ Update verificado:', {
      orderId: orderId.slice(0, 8),
      oldPaymentStatus: existingOrder.payment_status,
      requestedPaymentStatus: payment_status,
      actualPaymentStatus: actualPaymentStatus,
      statusMatches: !statusChangedByTrigger
    })

    return NextResponse.json({
      success: true,
      data: {
        order_id: orderId,
        old_payment_status: existingOrder.payment_status,
        new_payment_status: actualPaymentStatus, // Estado REAL de la BD
        status_changed_by_trigger: statusChangedByTrigger,
        updated_at: verifiedOrder.updated_at
      }
    }, { headers })

  } catch (error) {
    console.error('[PAYMENT STATUS] Error critico:', error)
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
