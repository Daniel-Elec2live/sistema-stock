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

    // Calcular precios finales usando el nuevo sistema
    const productsWithDiscounts: ProductWithDiscount[] = await Promise.all(
      products.map(async (product) => {
        // Usar función SQL para calcular precio final
        const { data: priceData, error: priceError } = await supabase
          .rpc('calcular_precio_final', {
            producto_id: product.id,
            cliente_id: user.customer?.id
          })
          .single()

        if (priceError) {
          console.error('Error calculating price for product:', product.id, priceError)
          // Fallback: precio base sin descuento
          return {
            ...product,
            discount_percentage: 0,
            discounted_price: product.precio_promedio || 0,
            final_price: product.precio_promedio || 0
          }
        }

        return {
          ...product,
          discount_percentage: priceData.descuento_aplicado || 0,
          discounted_price: priceData.precio_final || 0,
          final_price: priceData.precio_final || 0,
          // Campos extra para debug (opcional)
          precio_compra_promedio: priceData.precio_compra_promedio,
          precio_con_margen: priceData.precio_con_margen,
          margen_aplicado: priceData.margen_aplicado
        }
      })
    )

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