// apps/backoffice/app/api/products/generate-reference/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const proveedor = searchParams.get('proveedor')
    
    if (!proveedor) {
      return NextResponse.json(
        { error: 'Proveedor es requerido' },
        { status: 400 }
      )
    }
    
    const supabase = createSupabaseClient()
    
    // Generar prefijo: 3 primeros caracteres del proveedor en mayúsculas
    const prefijo = proveedor.substring(0, 3).toUpperCase()
    
    // Contar productos existentes de este proveedor para determinar el siguiente número
    const { count } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('proveedor', proveedor)
    
    // El siguiente número será count + 1, con padding de 3 dígitos
    const siguienteNumero = (count || 0) + 1
    const numeroFormateado = siguienteNumero.toString().padStart(3, '0')
    
    // Generar referencia completa: PREFIX25XXX
    const referencia = `${prefijo}25${numeroFormateado}`
    
    return NextResponse.json({ referencia })
    
  } catch (error) {
    console.error('Error generando referencia:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}