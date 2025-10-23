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
        image_url: body.image_url,
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

// DELETE - Eliminar un producto (soft delete si tiene pedidos asociados)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseClient()

    // Verificar que el producto existe
    const { data: existingProduct, error: checkError } = await supabase
      .from('products')
      .select('id, nombre')
      .eq('id', params.id)
      .single()

    if (checkError || !existingProduct) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

    // Verificar si el producto tiene pedidos asociados
    const { data: orderItems, error: orderCheckError } = await supabase
      .from('order_items')
      .select('id')
      .eq('product_id', params.id)
      .limit(1)

    if (orderCheckError) {
      console.error('Error al verificar pedidos:', orderCheckError)
      return NextResponse.json(
        { error: 'Error al verificar referencias del producto' },
        { status: 500 }
      )
    }

    // Si tiene pedidos asociados, hacer soft delete (marcar como inactivo)
    if (orderItems && orderItems.length > 0) {
      const { error: updateError } = await supabase
        .from('products')
        .update({
          is_active: false,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.id)

      if (updateError) {
        console.error('Error al desactivar producto:', updateError)
        return NextResponse.json(
          { error: 'Error al desactivar producto' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        soft_delete: true,
        message: 'El producto no se puede eliminar porque tiene pedidos asociados. Se ha marcado como inactivo.'
      })
    }

    // Si no tiene pedidos, hacer hard delete (eliminar físicamente)
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', params.id)

    if (deleteError) {
      console.error('Error al eliminar producto:', deleteError)
      return NextResponse.json(
        { error: 'Error al eliminar producto' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      soft_delete: false,
      message: 'Producto eliminado correctamente'
    })

  } catch (error) {
    console.error('Error interno:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}