import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import { verifyAuth } from '@/lib/auth'
import { BackorderItem } from '@/lib/types'

// Esquema de validación para crear pedido
const CreateOrderSchema = z.object({
  items: z.array(z.object({
    product_id: z.string().uuid(),
    quantity: z.number().min(1)
  })).min(1),
  allow_backorder: z.boolean().default(false),
  notes: z.string().optional()
})

export async function GET(request: NextRequest) {
  try {
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

    const { searchParams } = request.nextUrl
    
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')
    const status = searchParams.get('status')

    // Construir query para pedidos del cliente
    let query = supabase
      .from('orders')
      .select(`
        *,
        order_items(
          id,
          product_id,
          product_name,
          quantity,
          unit_price,
          discount_percentage,
          total_price
        )
      `)
      .eq('customer_id', user.customer!.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: orders, error } = await query

    if (error) {
      console.error('Error fetching orders:', error)
      return NextResponse.json(
        { success: false, error: 'Error al obtener pedidos' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: orders || []
    })

  } catch (error) {
    console.error('Orders GET Error:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
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

    // Verificar que el cliente esté aprobado
    if (!user.customer?.is_approved) {
      return NextResponse.json(
        { success: false, error: 'Cliente pendiente de aprobación' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validatedData = CreateOrderSchema.parse(body)

    // Obtener productos con nombres en español
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, nombre, precio_promedio, stock_actual, categoria')
      .in('id', validatedData.items.map(item => item.product_id))
      .eq('is_active', true)

    if (productsError) {
      return NextResponse.json(
        { success: false, error: 'Error al verificar productos' },
        { status: 500 }
      )
    }

    if (!products || products.length !== validatedData.items.length) {
      return NextResponse.json(
        { success: false, error: 'Algunos productos no fueron encontrados' },
        { status: 400 }
      )
    }

    // Verificar stock y calcular backorders
    const backorderItems: BackorderItem[] = []
    const orderItems = []
    let hasBackorder = false
    let totalAmount = 0

    // Calcular precios usando el nuevo sistema
    for (const requestedItem of validatedData.items) {
      const product = products.find(p => p.id === requestedItem.product_id)!
      const availableStock = product.stock_actual

      // Usar función SQL para calcular precio final
      const { data: priceData, error: priceError } = await supabase
        .rpc('calcular_precio_final', {
          producto_id: product.id,
          cliente_id: user.customer?.id
        })
        .single()

      if (priceError) {
        console.error('Error calculating price for product:', product.id, priceError)
        return NextResponse.json(
          { success: false, error: 'Error al calcular precios' },
          { status: 500 }
        )
      }

      const unitPrice = (priceData as any)?.precio_final || 0
      const discount = (priceData as any)?.descuento_aplicado || 0

      if (availableStock >= requestedItem.quantity) {
        // Stock suficiente
        orderItems.push({
          product_id: product.id,
          product_name: product.nombre,
          quantity: requestedItem.quantity,
          unit_price: unitPrice,
          discount_percentage: discount,
          total_price: unitPrice * requestedItem.quantity
        })
        totalAmount += unitPrice * requestedItem.quantity
      } else {
        // Stock insuficiente
        if (!validatedData.allow_backorder) {
          return NextResponse.json({
            success: false,
            error: 'Stock insuficiente',
            data: {
              product_name: product.nombre,
              requested: requestedItem.quantity,
              available: availableStock
            }
          }, { status: 400 })
        }

        hasBackorder = true
        
        // Agregar cantidad disponible al pedido
        if (availableStock > 0) {
          orderItems.push({
            product_id: product.id,
            product_name: product.nombre,
            quantity: availableStock,
            unit_price: unitPrice,
            discount_percentage: discount,
            total_price: unitPrice * availableStock
          })
          totalAmount += unitPrice * availableStock
        }

        // Registrar backorder
        backorderItems.push({
          product_id: product.id,
          product_name: product.nombre,
          requested_quantity: requestedItem.quantity,
          available_quantity: availableStock,
          backorder_quantity: requestedItem.quantity - availableStock
        })
      }
    }

    if (orderItems.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No hay productos disponibles para el pedido'
      }, { status: 400 })
    }

    // Crear el pedido
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        customer_id: user.customer?.id,
        status: 'pending',
        total_amount: totalAmount,
        total_items: orderItems.reduce((sum, item) => sum + item.quantity, 0),
        has_backorder: hasBackorder,
        backorder_items: hasBackorder ? backorderItems : null,
        notes: validatedData.notes
      })
      .select()
      .single()

    if (orderError) {
      console.error('Error creating order:', orderError)
      return NextResponse.json(
        { success: false, error: 'Error al crear el pedido' },
        { status: 500 }
      )
    }

    // Crear items del pedido
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(
        orderItems.map(item => ({
          ...item,
          order_id: order.id
        }))
      )

    if (itemsError) {
      console.error('Error creating order items:', itemsError)
      return NextResponse.json(
        { success: false, error: 'Error al crear items del pedido' },
        { status: 500 }
      )
    }

    // Reservar stock usando la función SQL
    for (const item of orderItems) {
      const { data: reserveResult, error: stockError } = await supabase
        .rpc('reserve_stock', {
          product_id_param: item.product_id,
          quantity_param: item.quantity
        })

      if (stockError || reserveResult === false) {
        console.error('Error reserving stock:', stockError)
        // En producción aquí haríamos rollback completo
        return NextResponse.json(
          { success: false, error: 'Error al reservar stock' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        order_id: order.id,
        total_amount: totalAmount,
        has_backorder: hasBackorder,
        backorder_items: hasBackorder ? backorderItems : undefined
      },
      message: hasBackorder 
        ? 'Pedido creado con artículos pendientes por falta de stock'
        : 'Pedido creado exitosamente'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Orders POST Error:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// Ejemplo de curl para crear pedido:
// curl -X POST "http://localhost:3001/api/orders" \
//   -H "Content-Type: application/json" \
//   -H "Authorization: Bearer YOUR_JWT_TOKEN" \
//   -d '{
//     "items": [
//       {"product_id": "123e4567-e89b-12d3-a456-426614174000", "quantity": 2},
//       {"product_id": "123e4567-e89b-12d3-a456-426614174001", "quantity": 1}
//     ],
//     "allow_backorder": true,
//     "notes": "Pedido urgente"
//   }'