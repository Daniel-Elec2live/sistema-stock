import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { z } from 'zod'

// Cliente Supabase con service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export const runtime = 'nodejs'

const DiscountSchema = z.object({
  product_id: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  discount_percentage: z.number().min(0).max(100),
  valid_from: z.string().nullable().optional(),
  valid_until: z.string().nullable().optional(),
  is_active: z.boolean().default(true)
})

// GET - Obtener descuentos de un cliente
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: discounts, error } = await supabase
      .from('customer_discounts')
      .select(`
        id,
        customer_id,
        product_id,
        category,
        discount_percentage,
        is_active,
        valid_from,
        valid_until,
        created_at,
        products:product_id (
          id,
          nombre
        )
      `)
      .eq('customer_id', params.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching discounts:', error)
      return NextResponse.json(
        { success: false, error: 'Error al obtener descuentos' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      discounts: discounts || []
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// POST - Crear descuento para un cliente
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json()
    const validatedData = DiscountSchema.parse(body)

    // Verificar que el cliente existe
    const { data: customer } = await supabase
      .from('customers')
      .select('id')
      .eq('id', params.id)
      .single()

    if (!customer) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    // Si es descuento por producto, verificar que el producto existe
    if (validatedData.product_id) {
      const { data: product } = await supabase
        .from('products')
        .select('id')
        .eq('id', validatedData.product_id)
        .single()

      if (!product) {
        return NextResponse.json(
          { success: false, error: 'Producto no encontrado' },
          { status: 404 }
        )
      }
    }

    // Crear descuento
    const { data: discount, error } = await supabase
      .from('customer_discounts')
      .insert({
        customer_id: params.id,
        ...validatedData,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating discount:', error)
      return NextResponse.json(
        { success: false, error: 'Error al crear descuento' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      discount,
      message: 'Descuento creado correctamente'
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos', details: error.issues },
        { status: 400 }
      )
    }

    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}