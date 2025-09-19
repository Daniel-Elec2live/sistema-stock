// apps/backoffice/app/api/stock/adjustment/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseClient } from '@/lib/supabase'

const adjustmentSchema = z.object({
  product_id: z.string(),
  tipo: z.enum(['merma', 'correccion', 'devolucion', 'inventario']),
  cantidad: z.number(),
  motivo: z.string().min(1, 'Motivo es requerido'),
  observaciones: z.string().optional()
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const data = adjustmentSchema.parse(body)

    const supabase = createSupabaseClient()

    // Obtener el stock actual del producto para cantidad_anterior
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('stock_actual')
      .eq('id', data.product_id)
      .single()

    if (productError || !product) {
      throw new Error(`Error obteniendo producto: ${productError?.message || 'Producto no encontrado'}`)
    }

    const stockAnterior = product.stock_actual
    
    // 1. Crear registro de ajuste
    const { data: adjustment, error: adjustmentError } = await supabase
      .from('stock_adjustments')
      .insert({
        product_id: data.product_id,
        tipo: data.tipo,
        cantidad: data.cantidad,
        cantidad_anterior: stockAnterior,
        motivo: data.motivo,
        observaciones: data.observaciones,
        usuario: 'system', // TODO: Obtener del usuario autenticado
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (adjustmentError) {
      throw new Error(`Error creando ajuste: ${adjustmentError.message}`)
    }
    
    // 2. Actualizar stock según el tipo de ajuste
    let stockChange: number

    switch (data.tipo) {
      case 'merma':
        stockChange = -data.cantidad // Restar del stock
        break
      case 'devolucion':
        stockChange = data.cantidad // Sumar al stock
        break
      case 'correccion':
      case 'inventario':
        stockChange = data.cantidad // Usar directamente la diferencia calculada
        break
      default:
        throw new Error(`Tipo de ajuste no válido: ${data.tipo}`)
    }
    
    // 3. Calcular y actualizar stock del producto
    const newStock = stockAnterior + stockChange

    // Validar que el stock no sea negativo
    if (newStock < 0) {
      throw new Error(`Stock insuficiente. Stock actual: ${stockAnterior}, cambio: ${stockChange}`)
    }

    const { error: stockError } = await supabase
      .from('products')
      .update({
        stock_actual: newStock,
        updated_at: new Date().toISOString()
      })
      .eq('id', data.product_id)
    
    if (stockError) {
      throw new Error(`Error actualizando stock: ${stockError.message}`)
    }
    
    return NextResponse.json({
      success: true,
      adjustment_id: adjustment.id,
      message: 'Ajuste registrado correctamente'
    })
    
  } catch (error) {
    console.error('Error en POST /api/stock/adjustment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    )
  }
}