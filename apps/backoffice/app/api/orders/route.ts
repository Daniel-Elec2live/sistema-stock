import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    // Cache bust - añadir timestamp para forzar lectura fresca
    const timestamp = Date.now()
    console.log(`🔍 Backoffice API - Fetching all orders [${timestamp}]`)

    // Añadir headers anti-cache explícitos
    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    }

    const supabase = createSupabaseClient()

    console.log('🔧 Environment check:', {
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30) + '...',
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      timestamp
    })

    // Obtener todos los pedidos
    const { data: orders, error } = await supabase
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
      .order('created_at', { ascending: false })
      .limit(1000)

    console.log('📊 Raw orders from DB:', {
      count: orders?.length,
      error,
      firstOrderStatus: orders?.[0]?.status,
      firstOrderId: orders?.[0]?.id?.slice(0, 8),
      firstOrderCreated: orders?.[0]?.created_at
    })

    if (error) {
      console.error('❌ Database error:', error)
      return NextResponse.json(
        { success: false, error: 'Error al obtener pedidos' },
        { status: 500, headers }
      )
    }

    if (!orders || orders.length === 0) {
      console.log('📋 No orders found in database')
      return NextResponse.json({
        success: true,
        data: []
      }, { headers })
    }

    // Obtener información de clientes y backorder items para cada pedido
    const ordersWithDetails = await Promise.all(
      orders.map(async (order) => {
        // Obtener información del cliente
        const { data: customer } = await supabase
          .from('customers')
          .select('name, company_name, phone, address')
          .eq('id', order.customer_id)
          .single()

        console.log(`📋 Order ${order.id.slice(0, 8)}: customer=${customer?.name}, status=${order.status}`)

        return {
          id: order.id,
          customer_name: customer?.name || 'Cliente desconocido',
          customer_company: customer?.company_name,
          customer_phone: customer?.phone,
          customer_address: customer?.address,
          status: order.status,
          total_amount: order.total_amount,
          total_items: order.total_items,
          notes: order.notes,
          has_backorder: order.has_backorder || false,
          order_number: order.order_number,
          delivery_date: order.delivery_date,
          cancelled_at: order.cancelled_at,
          cancellation_reason: order.cancellation_reason,
          created_at: order.created_at,
          updated_at: order.updated_at
        }
      })
    )

    console.log(`✅ Successfully fetched ${ordersWithDetails.length} orders`)

    // Debug: Log first few orders with their statuses
    console.log('📊 Sample orders with statuses:',
      ordersWithDetails.slice(0, 3).map(o => ({
        id: o.id.slice(0, 8),
        status: o.status,
        customer: o.customer_name
      }))
    )

    return NextResponse.json({
      success: true,
      data: ordersWithDetails
    }, { headers })

  } catch (error) {
    console.error('Backoffice Orders API Error:', error)
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