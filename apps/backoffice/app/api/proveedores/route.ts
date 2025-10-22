import { createSupabaseClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createSupabaseClient()
    
    const { data: products, error } = await supabase
      .from('products')
      .select('proveedor')
      .not('proveedor', 'is', null)
    
    if (error) {
      console.error('Error al obtener proveedores:', error)
      return NextResponse.json(
        { error: 'Error al obtener proveedores' },
        { status: 500 }
      )
    }
    
    // Obtener lista única de proveedores
    const uniqueProveedores = new Set(
      products
        .map(p => p.proveedor)
        .filter(Boolean)
    )
    const proveedores = Array.from(uniqueProveedores).sort()

    console.log('[PROVEEDORES API] Total productos:', products?.length || 0)
    console.log('[PROVEEDORES API] Proveedores únicos:', proveedores.length)
    console.log('[PROVEEDORES API] Lista:', proveedores)

    const response = NextResponse.json({ proveedores })

    // Headers para evitar cache
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    response.headers.set('Pragma', 'no-cache')
    response.headers.set('Expires', '0')

    return response
    
  } catch (error) {
    console.error('Error interno:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}