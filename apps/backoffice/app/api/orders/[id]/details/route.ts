import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(
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

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'ID de pedido requerido' },
        { status: 400, headers }
      )
    }

    console.log('🔍 Backoffice API - Fetching order details for:', orderId)

    // Obtener el pedido básico
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        id,
        customer_id,
        status,
        total_amount,
        total_items,
        notes,
        has_backorder,
        order_number,
        delivery_date,
        cancelled_at,
        cancellation_reason,
        created_at,
        updated_at
      `)
      .eq('id', orderId)
      .single()

    if (orderError || !order) {
      console.error('❌ Order not found:', orderError)
      return NextResponse.json(
        { success: false, error: 'Pedido no encontrado' },
        { status: 404, headers }
      )
    }

    console.log('📋 Order found:', order.id.slice(0, 8))

    // Obtener información del cliente
    const { data: customer } = await supabase
      .from('customers')
      .select('name, company_name, phone, address')
      .eq('id', order.customer_id)
      .single()

    // Obtener items del pedido
    const { data: orderItems, error: itemsError } = await supabase
      .from('order_items')
      .select(`
        id,
        product_id,
        product_name,
        quantity,
        unit_price,
        discount_percentage,
        total_price
      `)
      .eq('order_id', orderId)

    console.log('📦 Order items:', orderItems?.length || 0)

    if (itemsError) {
      console.warn('⚠️ Error fetching order items:', itemsError)
    }

    // No hay tabla backorder_items en el schema actual

    // Construir la respuesta completa
    const orderDetails = {
      id: order.id,
      customer_name: customer?.name || 'Cliente desconocido',
      customer_company: customer?.company_name,
      customer_phone: customer?.phone,
      customer_address: customer?.address,
      status: order.status,
      total_amount: order.total_amount,
      total_items: order.total_items,
      order_number: order.order_number,
      delivery_date: order.delivery_date,
      cancelled_at: order.cancelled_at,
      cancellation_reason: order.cancellation_reason,
      notes: order.notes,
      has_backorder: order.has_backorder || false,
      created_at: order.created_at,
      updated_at: order.updated_at,
      items: orderItems || [],
      backorder_items: []
    }

    console.log('✅ Order details compiled successfully')

    return NextResponse.json({
      success: true,
      data: orderDetails
    }, { headers })

  } catch (error) {
    console.error('Backoffice Order Details API Error:', error)
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