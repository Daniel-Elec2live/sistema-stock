import { NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = createSupabaseClient()

    console.log('🔧 Testing Supabase connection...')

    // Test de conexión básica - contar pedidos
    const { count, error } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })

    if (error) {
      console.error('❌ Database error:', error)
      return NextResponse.json({
        success: false,
        error: 'Database connection error',
        details: error
      })
    }

    console.log(`📊 Found ${count} orders in database`)

    // Test básico de consulta - verificar estados
    const { data: orders, error: queryError } = await supabase
      .from('orders')
      .select('id, status, customer_id, created_at, updated_at')
      .order('created_at', { ascending: false })
      .limit(10)

    if (queryError) {
      console.error('❌ Query error:', queryError)
      return NextResponse.json({
        success: false,
        error: 'Query error',
        details: queryError
      })
    }

    console.log('📋 Sample orders with detailed status info:')
    orders?.forEach(o => {
      console.log(`  - ID: ${o.id.slice(0, 8)}, Status: "${o.status}", Created: ${o.created_at}, Updated: ${o.updated_at}`)
    })

    return NextResponse.json({
      success: true,
      data: {
        total_orders: count,
        sample_orders: orders,
        connection_status: 'OK'
      }
    })

  } catch (error) {
    console.error('❌ Test API Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error
    }, { status: 500 })
  }
}