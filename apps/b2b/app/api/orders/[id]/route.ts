import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyAuth } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { user } = authResult
    if (!user?.customer) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
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

    console.log('🔍 API Debug - Fetching order:', {
      orderId,
      customerId: user.customer.id,
      userEmail: user.email
    })

    // Primero verificar si el pedido existe sin relaciones
    const { data: basicOrder, error: basicError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('customer_id', user.customer.id)
      .single()

    console.log('🔍 Basic order check:', { basicOrder, basicError })

    if (basicError || !basicOrder) {
      console.error('❌ Basic order not found:', basicError)

      // Verificar si existe sin customer_id filter
      const { data: orderExists } = await supabase
        .from('orders')
        .select('id, customer_id')
        .eq('id', orderId)
        .single()

      console.log('🔍 Order exists without customer filter:', orderExists)

      return NextResponse.json(
        { success: false, error: 'Pedido no encontrado' },
        { status: 404 }
      )
    }

    // Obtener items del pedido por separado para mejor control de errores
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)

    console.log('📦 Order items query:', { orderItems, itemsError })

    // Obtener backorder items si existen
    const { data: backorderItems, error: backorderError } = await supabase
      .from('backorder_items')
      .select('*')
      .eq('order_id', orderId)

    console.log('📋 Backorder items query:', { backorderItems, backorderError })

    // Usar el pedido básico y añadir las relaciones manualmente
    const order = {
      ...basicOrder,
      items: orderItems || [],
      backorder_items: backorderItems || []
    }

    console.log('✅ Final order object:', {
      id: order.id,
      status: order.status,
      customer_id: order.customer_id,
      items_count: order.items?.length || 0,
      backorder_count: order.backorder_items?.length || 0
    })

    // Obtener información del cliente desde la tabla customers
    const { data: customerInfo, error: customerError } = await supabase
      .from('customers')
      .select('name, company_name, phone, address')
      .eq('id', user.customer.id)
      .single()

    if (customerError) {
      console.warn('Could not fetch customer info:', customerError)
    }

    // Enriquecer el pedido con información del cliente
    const enrichedOrder = {
      ...order,
      customer_name: customerInfo?.name || user.name || 'Cliente',
      customer_company: customerInfo?.company_name || '',
      customer_phone: customerInfo?.phone || '',
      customer_address: customerInfo?.address || '',
      has_backorder: (order.backorder_items && order.backorder_items.length > 0) || false,
    }

    console.log('📋 Final enriched order:', {
      id: enrichedOrder.id,
      customer_name: enrichedOrder.customer_name,
      items_count: enrichedOrder.items?.length || 0,
      has_backorder: enrichedOrder.has_backorder
    })

    return NextResponse.json({
      success: true,
      data: enrichedOrder
    })

  } catch (error) {
    console.error('Get Order API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}