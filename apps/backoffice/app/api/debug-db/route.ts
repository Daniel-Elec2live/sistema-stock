import { NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET() {
  try {
    console.log('🔍 DIRECT DB DEBUG - Connecting to database')

    const supabase = createSupabaseClient()

    // Query 1: SQL directo sin cache
    const { data: rawQuery, error: rawError } = await supabase
      .rpc('get_order_status_direct', {})
      .single()

    if (rawError) {
      console.log('⚠️ RPC no disponible, usando query directa')
    }

    // Query 2: Consulta directa con SQL
    const { data: directQuery, error: directError } = await supabase
      .from('orders')
      .select('id, status, updated_at')
      .order('updated_at', { ascending: false })
      .limit(10)

    // Query 3: Forzar nuevo cliente
    const freshClient = createSupabaseClient()
    const { data: freshQuery, error: freshError } = await freshClient
      .from('orders')
      .select('id, status, updated_at')
      .order('updated_at', { ascending: false })
      .limit(10)

    console.log('📊 DB Debug Results:', {
      directQuery: directQuery?.length || 0,
      freshQuery: freshQuery?.length || 0,
      errors: { directError, freshError }
    })

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results: {
        direct: directQuery,
        fresh: freshQuery,
        errors: { directError, freshError }
      }
    })

  } catch (error) {
    console.error('🚨 DB Debug Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}