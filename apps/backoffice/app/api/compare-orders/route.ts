import { NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET() {
  try {
    console.log('🔍 COMPARISON API - Starting comparison')

    // Test 1: Consulta básica con un cliente
    const client1 = createSupabaseClient()
    const { data: orders1 } = await client1
      .from('orders')
      .select('id, status, updated_at')
      .order('updated_at', { ascending: false })
      .limit(5)

    console.log('📊 CLIENT 1 Results:', orders1?.map(o => ({
      id: o.id.slice(0, 8),
      status: o.status,
      updated_at: o.updated_at
    })))

    // Test 2: Consulta con otro cliente
    const client2 = createSupabaseClient()
    const { data: orders2 } = await client2
      .from('orders')
      .select('id, status, updated_at')
      .order('updated_at', { ascending: false })
      .limit(5)

    console.log('📊 CLIENT 2 Results:', orders2?.map(o => ({
      id: o.id.slice(0, 8),
      status: o.status,
      updated_at: o.updated_at
    })))

    // Test 3: Consulta específica del pedido que sabemos fue actualizado
    const testOrderId = '153606e2-afc9-4d98-819f-6d468ebce67b'
    const { data: specificOrder } = await client1
      .from('orders')
      .select('id, status, updated_at')
      .eq('id', testOrderId)
      .single()

    console.log('📋 SPECIFIC ORDER Test:', {
      id: specificOrder?.id?.slice(0, 8),
      status: specificOrder?.status,
      updated_at: specificOrder?.updated_at
    })

    // Test 4: Raw SQL query para verificar directamente
    const { data: rawQuery } = await client1
      .rpc('get_order_status', { order_id: testOrderId })
      .catch(() => ({ data: null })) // Si la función no existe

    console.log('📋 RAW QUERY Result:', rawQuery)

    return NextResponse.json({
      success: true,
      comparison: {
        client1_results: orders1,
        client2_results: orders2,
        specific_order: specificOrder,
        raw_query: rawQuery,
        timestamp: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('❌ Comparison API Error:', error)
    return NextResponse.json({ success: false, error: error })
  }
}