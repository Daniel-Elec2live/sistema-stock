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

    console.log('🔍 DEBUG API - Checking order:', orderId)

    // Consulta directa sin cache
    const { data: order, error } = await supabase
      .from('orders')
      .select('id, status, updated_at, created_at')
      .eq('id', orderId)
      .single()

    if (error) {
      console.error('❌ Debug query error:', error)
      return NextResponse.json({ success: false, error: error.message })
    }

    console.log('📋 DEBUG - Raw order data:', {
      id: order.id,
      status: order.status,
      created_at: order.created_at,
      updated_at: order.updated_at,
      timestamp_now: new Date().toISOString()
    })

    return NextResponse.json({
      success: true,
      data: order,
      debug_info: {
        query_timestamp: new Date().toISOString(),
        supabase_config: {
          url: process.env.NEXT_PUBLIC_SUPABASE_URL?.slice(0, 30) + '...',
          has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
        }
      }
    })

  } catch (error) {
    console.error('Debug API Error:', error)
    return NextResponse.json({ success: false, error: 'Internal error' })
  }
}