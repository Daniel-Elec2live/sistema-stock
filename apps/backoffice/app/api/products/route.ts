// apps/backoffice/app/api/products/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseClient } from '@/lib/supabase'

export const runtime = 'nodejs'

const productSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido'),
  descripcion: z.string().optional(),
  unidad: z.string().min(1, 'Unidad es requerida'),
  stock_minimo: z.number().min(0, 'Stock mínimo debe ser mayor o igual a 0'),
  stock_maximo: z.number().optional(),
  categoria: z.string().min(1, 'Categoría es requerida'),
  proveedor: z.string().min(1, 'Proveedor es requerido'),
  referencia: z.string().min(1, 'Referencia es requerida')
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl
    const search = searchParams.get('search')
    const categoria = searchParams.get('categoria')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    
    const supabase = createSupabaseClient()
    
    let query = supabase
      .from('products')
      .select(`
        *,
        batches (
          id,
          cantidad,
          caducidad,
          precio_compra
        )
      `)
      .order('nombre')
      .range(offset, offset + limit - 1)
    
    if (search) {
      query = query.ilike('nombre', `%${search}%`)
    }
    
    if (categoria) {
      query = query.eq('categoria', categoria)
    }
    
    const { data: products, error } = await query
    
    if (error) {
      throw new Error(`Error obteniendo productos: ${error.message}`)
    }
    
    return NextResponse.json({
      success: true,
      products
    })
    
  } catch (error) {
    console.error('Error en GET /api/products:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = productSchema.parse(body)
    
    const supabase = createSupabaseClient()
    
    // Generar referencia automática: 3 letras + 25 + número
    const { proveedor, referencia, ...restData } = data
    
    console.log('Datos recibidos:', { proveedor, referencia, restData })
    
    // Generar referencia automática: 3 letras del proveedor + 25 + número correlativo
    const prefijo = proveedor.substring(0, 3).toUpperCase()
    const { count } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('proveedor', proveedor)
    
    const siguienteNumero = (count || 0) + 1
    const referenciaGenerada = `${prefijo}25${siguienteNumero.toString().padStart(3, '0')}`
    
    const insertData = {
      ...restData,
      proveedor, // Campo directo de texto
      referencia: referenciaGenerada, // Referencia automática
      stock_actual: 0,
      created_at: new Date().toISOString()
    }
    
    console.log('Datos a insertar:', insertData)
    
    const { data: product, error } = await supabase
      .from('products')
      .insert(insertData)
      .select()
      .single()
    
    if (error) {
      throw new Error(`Error creando producto: ${error.message}`)
    }
    
    return NextResponse.json({
      success: true,
      product,
      message: 'Producto creado correctamente'
    })
    
  } catch (error) {
    console.error('Error en POST /api/products:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    )
  }
}