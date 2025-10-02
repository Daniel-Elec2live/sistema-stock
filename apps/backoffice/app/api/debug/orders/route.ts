import { NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createSupabaseClient()

    console.log('DEBUG: Checking orders table...')
    console.log('Service Role Key exists:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .limit(10)

    console.log('Query result:', {
      success: !error,
      count: orders?.length || 0,
      error: error?.message
    })

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        details: error
      })
    }

    return NextResponse.json({
      success: true,
      data: orders,
      count: orders?.length || 0
    })
  } catch (error) {
    console.error('DEBUG Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
