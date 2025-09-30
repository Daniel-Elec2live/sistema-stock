import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()

    console.log('🔧 DEBUG - Starting comprehensive order analysis')

    // 1. Contar todos los pedidos en la BD
    const { count: totalOrders, error: countError } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })

    console.log('📊 Total orders in DB:', totalOrders, 'Error:', countError)

    // 2. Obtener los últimos 10 pedidos con todos los campos
    const { data: recentOrders, error: recentError } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    console.log('📋 Recent orders raw:', recentOrders?.map(o => ({
      id: o.id.slice(0, 8),
      status: o.status,
      customer_id: o.customer_id?.slice(0, 8),
      created_at: o.created_at
    })))

    // 3. Verificar si hay pedidos de hoy
    const today = new Date().toISOString().split('T')[0]
    const { data: todayOrders, error: todayError } = await supabase
      .from('orders')
      .select('*')
      .gte('created_at', `${today}T00:00:00.000Z`)
      .order('created_at', { ascending: false })

    console.log('🗓️ Today orders:', todayOrders?.length, 'Error:', todayError)

    // 4. Verificar si hay clientes activos
    const { count: customersCount, error: customersError } = await supabase
      .from('customers')
      .select('*', { count: 'exact', head: true })
      .eq('is_approved', true)

    console.log('👥 Approved customers:', customersCount, 'Error:', customersError)

    // 5. Verificar order_items
    const { count: itemsCount, error: itemsError } = await supabase
      .from('order_items')
      .select('*', { count: 'exact', head: true })

    console.log('📦 Order items count:', itemsCount, 'Error:', itemsError)

    // 6. Verificar si hay diferencias entre apps
    const backofficeQuery = await supabase
      .from('orders')
      .select(`
        id,
        customer_id,
        status,
        total_amount,
        created_at,
        updated_at
      `)
      .order('created_at', { ascending: false })
      .limit(5)

    console.log('🖥️ Backoffice query result:', {
      count: backofficeQuery.data?.length,
      error: backofficeQuery.error,
      sample: backofficeQuery.data?.map(o => ({
        id: o.id.slice(0, 8),
        status: o.status,
        created: o.created_at
      }))
    })

    return NextResponse.json({
      success: true,
      debug: {
        totalOrders,
        recentOrdersCount: recentOrders?.length || 0,
        todayOrdersCount: todayOrders?.length || 0,
        approvedCustomers: customersCount,
        totalOrderItems: itemsCount,
        recentOrders: recentOrders?.map(o => ({
          id: o.id.slice(0, 8),
          status: o.status,
          customer_id: o.customer_id?.slice(0, 8),
          total_amount: o.total_amount,
          created_at: o.created_at,
          updated_at: o.updated_at
        })) || [],
        todayOrders: todayOrders?.map(o => ({
          id: o.id.slice(0, 8),
          status: o.status,
          created_at: o.created_at
        })) || []
      }
    })

  } catch (error) {
    console.error('🚨 DEBUG Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}