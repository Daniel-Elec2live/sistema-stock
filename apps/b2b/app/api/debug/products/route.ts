import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // Consulta simple sin filtros para ver RAW data
    const { data: products, error } = await supabase
      .from('products')
      .select('id, nombre, image_url, is_active')
      .limit(10)

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message
      })
    }

    return NextResponse.json({
      success: true,
      data: products,
      count: products?.length || 0
    })
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
