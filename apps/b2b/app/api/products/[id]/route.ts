import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ProductWithDiscount } from '@/lib/types'
import { verifyAuth } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verificar autenticación
    const authResult = await verifyAuth(request)
    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { user } = authResult
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 401 }
      )
    }

    const resolvedParams = await params
    const productId = resolvedParams.id

    // Obtener producto específico
    const { data: product, error: productError } = await supabase
      .from('products')
      .select(`
        id,
        nombre,
        descripcion,
        unidad,
        stock_actual,
        stock_minimo,
        stock_maximo,
        categoria,
        proveedor,
        referencia,
        precio_promedio,
        brand,
        image_url,
        is_active,
        created_at,
        updated_at
      `)
      .eq('id', productId)
      .eq('is_active', true)
      .single()

    if (productError || !product) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      )
    }

    // Obtener descuentos del cliente
    const { data: discounts, error: discountsError } = await supabase
      .from('customer_discounts')
      .select('*')
      .eq('customer_id', user.customer?.id)
      .eq('is_active', true)
      .or(`valid_until.is.null,valid_until.gte.${new Date().toISOString()}`)

    if (discountsError) {
      console.error('Error fetching discounts:', discountsError)
    }

    // Aplicar descuentos
    let bestDiscount = 0

    if (discounts) {
      // Buscar descuento específico del producto
      const productDiscount = discounts.find(d => d.product_id === product.id)
      if (productDiscount) {
        bestDiscount = Math.max(bestDiscount, productDiscount.discount_percentage)
      }

      // Buscar descuento por categoría
      const categoryDiscount = discounts.find(d =>
        d.category === product.categoria && !d.product_id
      )
      if (categoryDiscount) {
        bestDiscount = Math.max(bestDiscount, categoryDiscount.discount_percentage)
      }

      // Buscar descuento general
      const generalDiscount = discounts.find(d =>
        !d.product_id && !d.category
      )
      if (generalDiscount) {
        bestDiscount = Math.max(bestDiscount, generalDiscount.discount_percentage)
      }
    }

    const discountedPrice = (product.precio_promedio || 0) * (1 - bestDiscount / 100)

    const productWithDiscount: ProductWithDiscount = {
      ...product,
      discount_percentage: bestDiscount,
      discounted_price: discountedPrice,
      final_price: discountedPrice,
      original_price: product.precio_promedio || 0
    }

    return NextResponse.json({
      success: true,
      data: productWithDiscount
    })

  } catch (error) {
    console.error('Product API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}