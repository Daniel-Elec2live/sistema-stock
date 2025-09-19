// apps/backoffice/app/api/stock/adjustments/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const product_id = searchParams.get('product_id')
    
    const supabase = createSupabaseClient()
    
    let query = supabase
      .from('stock_adjustments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
    
    // Filtrar por producto específico si se proporciona
    if (product_id) {
      query = query.eq('product_id', product_id)
    }
    
    const { data: adjustments, error } = await query
    
    if (error) {
      console.error('Error obteniendo ajustes:', error)
      return NextResponse.json(
        { error: 'Error obteniendo ajustes' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ adjustments: adjustments || [] })
    
  } catch (error) {
    console.error('Error interno:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}