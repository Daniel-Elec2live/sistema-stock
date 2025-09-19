import { createSupabaseClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// GET - Obtener un producto por ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseClient()
    
    const { data: product, error } = await supabase
      .from('products')
      .select('*')
      .eq('id', params.id)
      .single()
    
    if (error || !product) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      )
    }
    
    return NextResponse.json({ product })
    
  } catch (error) {
    console.error('Error al obtener producto:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// PUT - Actualizar un producto
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const supabase = createSupabaseClient()
    
    // Actualizar el producto
    const { data: product, error } = await supabase
      .from('products')
      .update({
        nombre: body.nombre,
        descripcion: body.descripcion,
        unidad: body.unidad,
        stock_minimo: body.stock_minimo,
        stock_maximo: body.stock_maximo,
        categoria: body.categoria,
        proveedor: body.proveedor,
        referencia: body.referencia,
        precio_promedio: body.precio_promedio,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()
    
    if (error) {
      console.error('Error al actualizar producto:', error)
      return NextResponse.json(
        { error: 'Error al actualizar producto' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ product })
    
  } catch (error) {
    console.error('Error interno:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar un producto
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseClient()
    
    // Verificar que el producto existe
    const { data: existingProduct, error: checkError } = await supabase
      .from('products')
      .select('id')
      .eq('id', params.id)
      .single()
    
    if (checkError || !existingProduct) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      )
    }
    
    // Eliminar el producto
    const { error } = await supabase
      .from('products')
      .delete()
      .eq('id', params.id)
    
    if (error) {
      console.error('Error al eliminar producto:', error)
      return NextResponse.json(
        { error: 'Error al eliminar producto' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error interno:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}