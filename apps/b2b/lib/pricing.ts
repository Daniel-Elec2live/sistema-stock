// apps/b2b/lib/pricing.ts
import { createSupabaseClient } from './supabase'

interface BatchPriceData {
  cantidad: number
  precio_compra: number
}

interface EntryProductData {
  nombre: string
  cantidad: number
  precio: number
}

/**
 * Calcula el precio de venta de un producto basado en:
 * 1. Media ponderada de precios de compra de batches/entradas
 * 2. Margen de ganancia aplicado
 */
export async function calculateSellPrice(
  productId: string,
  marginPercentage: number = 20 // % de margen por defecto, configurable más adelante
): Promise<number> {
  const supabase = createSupabaseClient()

  try {
    // 1. Obtener precios de batches (más preciso)
    const { data: batches } = await supabase
      .from('batches')
      .select('cantidad, precio_compra')
      .eq('product_id', productId)
      .not('precio_compra', 'is', null)

    let weightedAverage = 0
    let totalQuantity = 0

    // Calcular media ponderada de batches
    if (batches && batches.length > 0) {
      let totalCost = 0
      totalQuantity = 0

      for (const batch of batches as BatchPriceData[]) {
        totalCost += batch.cantidad * batch.precio_compra
        totalQuantity += batch.cantidad
      }

      if (totalQuantity > 0) {
        weightedAverage = totalCost / totalQuantity
      }
    }

    // 2. Si no hay batches, buscar en entries como fallback
    if (weightedAverage === 0) {
      const { data: entries } = await supabase
        .from('entries')
        .select('productos')
        .eq('estado', 'completed')
        .not('productos', 'is', null)

      if (entries) {
        let totalCost = 0
        totalQuantity = 0

        for (const entry of entries) {
          if (entry.productos && Array.isArray(entry.productos)) {
            for (const producto of entry.productos as EntryProductData[]) {
              // Buscar producto por nombre (mejorar con ID en el futuro)
              const { data: productMatch } = await supabase
                .from('products')
                .select('id')
                .eq('id', productId)
                .eq('nombre', producto.nombre)
                .single()

              if (productMatch && producto.precio && producto.cantidad) {
                totalCost += producto.cantidad * producto.precio
                totalQuantity += producto.cantidad
              }
            }
          }
        }

        if (totalQuantity > 0) {
          weightedAverage = totalCost / totalQuantity
        }
      }
    }

    // 3. Si no hay datos históricos, retornar 0
    if (weightedAverage === 0) {
      return 0
    }

    // 4. Aplicar margen de ganancia
    const sellPrice = weightedAverage * (1 + marginPercentage / 100)

    return Math.round(sellPrice * 100) / 100 // Redondear a 2 decimales

  } catch (error) {
    console.error('Error calculating sell price:', error)
    return 0
  }
}

/**
 * Configuración global de margen - en el futuro se puede mover a base de datos
 */
export const DEFAULT_MARGIN_PERCENTAGE = 20 // 20% de margen por defecto