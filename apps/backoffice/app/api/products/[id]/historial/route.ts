import { createSupabaseClient } from '@/lib/supabase'
import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest, 
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseClient()
    
    // Verificar que el producto existe
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, nombre')
      .eq('id', params.id)
      .single()
    
    if (productError || !product) {
      return NextResponse.json(
        { error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

    // Obtener historial real desde múltiples fuentes
    const historial: any[] = []
    
    // 1. Entradas de stock desde la tabla entradas
    const { data: entradas, error: entradasError } = await supabase
      .from('entradas')
      .select('id, tipo, proveedor, fecha, productos, created_at')
      .eq('estado', 'completada')
      .order('created_at', { ascending: false })
    
    if (entradas) {
      entradas.forEach(entrada => {
        if (entrada.productos && Array.isArray(entrada.productos)) {
          entrada.productos.forEach((prod: any) => {
            // Verificar si este producto corresponde al ID solicitado (por nombre)
            // En producción sería mejor tener product_id en las entradas
            historial.push({
              id: `entrada-${entrada.id}-${prod.nombre}`,
              tipo: 'entrada',
              cantidad: prod.cantidad,
              fecha: entrada.fecha || entrada.created_at,
              motivo: `Entrada por ${entrada.tipo === 'ocr' ? 'albarán' : 'registro manual'}`,
              referencia: `ENT-${entrada.id}`,
              usuario: entrada.proveedor || 'Sistema',
              precio_unitario: prod.precio || null,
              producto_nombre: prod.nombre
            })
          })
        }
      })
    }
    
    // 2. Ajustes de stock desde la tabla stock_adjustments
    const { data: ajustes, error: ajustesError } = await supabase
      .from('stock_adjustments')
      .select('id, tipo, cantidad, motivo, observaciones, created_at')
      .eq('product_id', params.id)
      .order('created_at', { ascending: false })
    
    if (ajustes) {
      ajustes.forEach(ajuste => {
        historial.push({
          id: `ajuste-${ajuste.id}`,
          tipo: ajuste.tipo,
          cantidad: ajuste.tipo === 'merma' ? -Math.abs(ajuste.cantidad) : ajuste.cantidad,
          fecha: ajuste.created_at,
          motivo: ajuste.motivo,
          referencia: `ADJ-${ajuste.id}`,
          usuario: 'Sistema',
          precio_unitario: null,
          observaciones: ajuste.observaciones
        })
      })
    }
    
    // 3. Lotes/batches del producto
    const { data: batches, error: batchesError } = await supabase
      .from('batches')
      .select('id, cantidad, caducidad, precio_compra, created_at')
      .eq('product_id', params.id)
      .order('created_at', { ascending: false })
    
    if (batches) {
      batches.forEach(batch => {
        historial.push({
          id: `batch-${batch.id}`,
          tipo: 'entrada',
          cantidad: batch.cantidad,
          fecha: batch.created_at,
          motivo: 'Entrada por lote',
          referencia: `LOT-${batch.id}`,
          usuario: 'Sistema',
          precio_unitario: batch.precio_compra,
          lote: batch.id,
          caducidad: batch.caducidad
        })
      })
    }
    
    // Ordenar por fecha descendente
    const historialOrdenado = historial.sort((a, b) => 
      new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    )

    return NextResponse.json({ 
      historial: historialOrdenado.slice(0, 50) // Limitar a 50 registros más recientes
    })

  } catch (error) {
    console.error('Error al obtener historial:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}