import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0 // No cachear NUNCA

export async function GET(request: NextRequest) {
  try {
    // Cache bust - añadir timestamp para forzar lectura fresca
    const timestamp = Date.now()

    // 🚨 DEBUG: Verificar qué Supabase URL está usando
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    console.log(`🔍 ORDERS API - Supabase URL: ${supabaseUrl}`)
    console.log(`🔍 ORDERS API - Fetching all orders [${timestamp}]`)

    // Headers anti-cache AGRESIVOS para resolver problemas de estados
    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0, private',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Last-Modified': new Date().toUTCString(),
      'ETag': `"${timestamp}-${Math.random()}"`,
      'Vary': 'Accept-Encoding, User-Agent'
    }

    // Verificar que tenemos el service_role key
    console.log('🔑 Service Role Key length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0)
    console.log('🔑 Service Role Key starts with:', process.env.SUPABASE_SERVICE_ROLE_KEY?.slice(0, 20))

    // SOLUCIÓN DEFINITIVA: Crear cliente fresco en cada request
    // Esto evita que Supabase reutilice conexiones con cache
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { persistSession: false },
        db: { schema: 'public' },
        global: {
          headers: {
            'Cache-Control': 'no-cache, no-store',
            'X-Request-ID': `orders-${timestamp}`
          }
        }
      }
    )

    // Query con logs detallados
    const { data: orders, error } = await supabase
      .from('orders')
      .select(`
        id,
        customer_id,
        status,
        payment_status,
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

    console.log('🔧 Query result:', {
      hasError: !!error,
      errorMessage: error?.message,
      errorCode: error?.code,
      errorDetails: error?.details,
      ordersCount: orders?.length || 0,
      ordersIsArray: Array.isArray(orders)
    })

    // DEBUG: Ver estados RAW de la BD
    console.log('📊 RAW orders from DB:', orders?.map(o => ({
      id: o.id.slice(0, 8),
      status: o.status,
      payment_status: o.payment_status,
      updated_at: o.updated_at
    })))

    console.log(`🔧 Query executed with cache buster for ${orders?.length || 0} orders`)

    if (error) {
      console.error('❌ Database error:', error)
      return NextResponse.json(
        { success: false, error: 'Error al obtener pedidos' },
        { status: 500, headers }
      )
    }

    if (!orders || !Array.isArray(orders) || orders.length === 0) {
      console.log('📋 No orders found in database - returning empty array')
      console.log(`🚨 DEBUG: Is this expected? Check if Supabase URL matches: ${supabaseUrl}`)
      return NextResponse.json({
        success: true,
        data: []
      }, { headers })
    }

    // 🚨 DEBUG: Mostrar primeros IDs de pedidos encontrados
    console.log(`📦 Found ${orders.length} orders. First 3 IDs:`, orders.slice(0, 3).map(o => o.id.slice(0, 8)))

    // Type guard: En este punto sabemos que orders es un array válido
    const validOrders = orders as any[]

    // Obtener información de clientes y backorder items para cada pedido
    const ordersWithDetails = await Promise.all(
      validOrders.map(async (order) => {
        // Obtener información del cliente
        const { data: customer } = await supabase
          .from('customers')
          .select('name, company_name, phone, address')
          .eq('id', order.customer_id)
          .single()

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