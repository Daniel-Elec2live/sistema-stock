import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('product_id')
    const customerId = searchParams.get('customer_id')

    if (!productId) {
      return NextResponse.json({
        success: false,
        error: 'product_id is required'
      }, { status: 400 })
    }

    // 1. Obtener info del producto
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('id, nombre, precio_promedio, categoria')
      .eq('id', productId)
      .single()

    if (productError || !product) {
      return NextResponse.json({
        success: false,
        error: 'Product not found'
      }, { status: 404 })
    }

    // 2. Obtener batches del producto
    const { data: batches, error: batchesError } = await supabase
      .from('batches')
      .select('precio_compra, cantidad, caducidad')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })

    // 3. Obtener info del cliente (si se proporciona)
    let customer = null
    if (customerId) {
      const { data: customerData, error: customerError } = await supabase
        .from('customers')
        .select('id, name, descuento_general')
        .eq('id', customerId)
        .single()

      if (!customerError) {
        customer = customerData
      }
    }

    // 4. Obtener margen general
    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('valor_numerico')
      .eq('clave', 'margen_general')
      .single()

    // 5. Calcular precio usando función SQL
    const { data: priceCalculation, error: priceError } = await supabase
      .rpc('calcular_precio_final', {
        producto_id: productId,
        cliente_id: customerId || null
      })
      .single()

    // 6. Calcular manualmente para verificar
    let manualCalculation = null
    if (batches && batches.length > 0) {
      const totalCost = batches.reduce((sum, batch) => sum + (batch.precio_compra * batch.cantidad), 0)
      const totalQuantity = batches.reduce((sum, batch) => sum + batch.cantidad, 0)
      const avgPrice = totalQuantity > 0 ? totalCost / totalQuantity : 0

      const margin = settings?.valor_numerico || 30
      const priceWithMargin = avgPrice * (1 + margin / 100)

      const discount = customer?.descuento_general || 0
      const finalPrice = priceWithMargin * (1 - discount / 100)

      manualCalculation = {
        avgPrice: Math.round(avgPrice * 10000) / 10000,
        margin,
        priceWithMargin: Math.round(priceWithMargin * 10000) / 10000,
        discount,
        finalPrice: Math.round(finalPrice * 10000) / 10000
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        product: {
          id: product.id,
          nombre: product.nombre,
          precio_promedio_bd: product.precio_promedio,
          categoria: product.categoria
        },
        customer: customer ? {
          id: customer.id,
          name: customer.name,
          descuento_general: customer.descuento_general
        } : null,
        batches: batches || [],
        settings: {
          margen_general: settings?.valor_numerico || 30
        },
        sql_calculation: priceCalculation || null,
        manual_calculation: manualCalculation,
        comparison: priceCalculation && manualCalculation ? {
          sql_final: (priceCalculation as any)?.precio_final,
          manual_final: manualCalculation.finalPrice,
          difference: Math.abs((priceCalculation as any)?.precio_final - manualCalculation.finalPrice),
          match: Math.abs((priceCalculation as any)?.precio_final - manualCalculation.finalPrice) < 0.01
        } : null,
        errors: {
          productError,
          batchesError,
          settingsError,
          priceError
        }
      }
    })

  } catch (error) {
    console.error('Test Prices API Error:', error)
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 })
  }
}

// Ejemplo de uso:
// GET /api/test-prices?product_id=123e4567-e89b-12d3-a456-426614174000&customer_id=456e7890-e89b-12d3-a456-426614174001