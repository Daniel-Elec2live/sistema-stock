import { createSupabaseClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const proveedor = searchParams.get('proveedor')
    
    const supabase = createSupabaseClient()
    
    let query = supabase
      .from('products')
      .select('id, nombre, unidad, proveedor')
    
    // Filtrar por proveedor si se proporciona
    if (proveedor) {
      query = query.eq('proveedor', proveedor)
    }
    
    const { data: products, error } = await query.order('nombre')
    
    if (error) {
      console.error('Error al obtener productos:', error)
      return NextResponse.json(
        { error: 'Error al obtener productos' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ productos: products || [] })
    
  } catch (error) {
    console.error('Error interno:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}