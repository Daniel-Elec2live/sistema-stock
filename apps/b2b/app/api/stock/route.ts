import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { ProductWithDiscount, ProductFilters } from '@/lib/types'
import { verifyAuth } from '@/lib/auth'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    
    // Extraer filtros de query params
    const filters: ProductFilters = {
      search: searchParams.get('search') || undefined,
      categoria: searchParams.get('categoria') || searchParams.get('category') || undefined, // compatibilidad
      min_precio: searchParams.get('min_precio') ? parseFloat(searchParams.get('min_precio')!) : undefined,
      max_precio: searchParams.get('max_precio') ? parseFloat(searchParams.get('max_precio')!) : undefined,
      solo_con_stock: searchParams.get('solo_con_stock') === 'true' || searchParams.get('in_stock_only') === 'true', // compatibilidad
      ordenar_por: (searchParams.get('ordenar_por') as 'nombre' | 'precio_promedio' | 'stock_actual') || 'nombre',
      orden: (searchParams.get('orden') as 'asc' | 'desc') || 'asc'
    }

    // Construir query base para productos (campos en español)
    let query = supabase
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
      .eq('is_active', true) // Solo productos activos

    // Aplicar filtros
    if (filters.search) {
      query = query.ilike('nombre', `%${filters.search}%`)
    }
    
    if (filters.categoria) {
      query = query.eq('categoria', filters.categoria)
    }
    
    if (filters.min_precio) {
      query = query.gte('precio_promedio', filters.min_precio)
    }
    
    if (filters.max_precio) {
      query = query.lte('precio_promedio', filters.max_precio)
    }
    
    if (filters.solo_con_stock) {
      query = query.gt('stock_actual', 0)
    }

    // Aplicar ordenamiento
    const sortColumn = filters.ordenar_por || 'nombre'
    const sortOrder = filters.orden || 'asc'
    query = query.order(sortColumn, { ascending: sortOrder === 'asc' })

    const { data: products, error: productsError } = await query

    if (productsError) {
      console.error('Error fetching products:', productsError)
      return NextResponse.json(
        { success: false, error: 'Error al obtener productos' },
        { status: 500 }
      )
    }

    if (!products) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    // Obtener descuentos del cliente una sola vez
    const { data: customerDiscounts, error: discountsError } = await supabase
      .from('customer_discounts')
      .select('*')
      .eq('customer_id', user.customer?.id)
      .eq('is_active', true)

    if (discountsError) {
      console.error('Error fetching customer discounts:', discountsError)
    }

    // Calcular precios finales aplicando descuentos
    const productsWithDiscounts: ProductWithDiscount[] = products.map((product) => {
      const basePrice = product.precio_promedio || 0
      let bestDiscount = 0

      if (customerDiscounts) {
        // Buscar descuentos aplicables por prioridad:
        // 1. Descuento específico de producto
        // 2. Descuento por categoría
        // 3. Descuento general

        // 1. Descuento específico de producto
        const productDiscount = customerDiscounts.find(d => d.product_id === product.id)
        if (productDiscount) {
          bestDiscount = productDiscount.discount_percentage
        } else {
          // 2. Descuento por categoría
          const categoryDiscount = customerDiscounts.find(d => d.category === product.categoria)
          if (categoryDiscount) {
            bestDiscount = categoryDiscount.discount_percentage
          } else {
            // 3. Descuento general (product_id y category son null)
            const generalDiscount = customerDiscounts.find(d => !d.product_id && !d.category)
            if (generalDiscount) {
              bestDiscount = generalDiscount.discount_percentage
            }
          }
        }
      }

      // Calcular precio final aplicando descuento
      const discountAmount = (basePrice * bestDiscount) / 100
      const finalPrice = Math.max(0, basePrice - discountAmount)

      return {
        ...product,
        discount_percentage: bestDiscount,
        discounted_price: finalPrice,
        final_price: finalPrice
      }
    })

    return NextResponse.json({
      success: true,
      data: productsWithDiscounts,
      meta: {
        total: productsWithDiscounts.length,
        filters: filters
      }
    })

  } catch (error) {
    console.error('Stock API Error:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// Ejemplo de curl:
// curl -X GET "http://localhost:3001/api/stock?search=tomate&category=verduras&in_stock_only=true&sort_by=price&sort_order=asc" \
//   -H "Authorization: Bearer YOUR_JWT_TOKEN"