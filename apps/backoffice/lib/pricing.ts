// apps/backoffice/lib/pricing.ts
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
 * DEPRECATED - Ahora se usa el trigger SQL automático
 * Esta función ya no se usa, el cálculo se hace automáticamente en BD
 */
export async function calculateSellPrice(
  productId: string,
  marginPercentage: number = 30 // % de margen por defecto, configurable más adelante
): Promise<number> {
  // Los triggers SQL se encargan automáticamente del cálculo
  // Esta función solo existe por compatibilidad
  const supabase = createSupabaseClient()

  const { data: product } = await supabase
    .from('products')
    .select('precio_promedio')
    .eq('id', productId)
    .single()

  return product?.precio_promedio || 0
}

/**
 * DEPRECATED - Los triggers SQL se encargan automáticamente
 * Ya no es necesario llamar a esta función manualmente
 */
export async function updateProductPrice(
  productId: string,
  marginPercentage?: number
): Promise<boolean> {
  // Los triggers SQL automáticamente actualizan el precio_promedio
  // cuando se insertan/actualizan/eliminan batches
  console.log(`⚠️ updateProductPrice() is deprecated for product ${productId} - triggers handle this automatically`)
  return true
}

/**
 * Actualiza los precios de todos los productos activos
 */
export async function updateAllProductPrices(marginPercentage?: number): Promise<void> {
  const supabase = createSupabaseClient()

  try {
    const { data: products } = await supabase
      .from('products')
      .select('id')
      .eq('is_active', true)

    if (products) {
      console.log(`Actualizando precios de ${products.length} productos...`)

      for (const product of products) {
        await updateProductPrice(product.id, marginPercentage)
      }

      console.log('Actualización de precios completada')
    }
  } catch (error) {
    console.error('Error updating all product prices:', error)
  }
}

/**
 * Configuración global de margen - en el futuro se puede mover a base de datos
 */
export const DEFAULT_MARGIN_PERCENTAGE = 20 // 20% de margen por defecto