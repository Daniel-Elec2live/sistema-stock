import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const UpdateDiscountSchema = z.object({
  discount_percentage: z.number().min(0).max(100).optional(),
  valid_from: z.string().nullable().optional(),
  valid_until: z.string().nullable().optional(),
  is_active: z.boolean().optional()
})

// PUT - Actualizar descuento
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseClient()
    const body = await request.json()
    const validatedData = UpdateDiscountSchema.parse(body)

    const { data: discount, error } = await supabase
      .from('customer_discounts')
      .update({
        ...validatedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', params.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating discount:', error)
      return NextResponse.json(
        { success: false, error: 'Error al actualizar descuento' },
        { status: 500 }
      )
    }

    if (!discount) {
      return NextResponse.json(
        { success: false, error: 'Descuento no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      discount,
      message: 'Descuento actualizado correctamente'
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

// DELETE - Eliminar descuento
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseClient()
    const { error } = await supabase
      .from('customer_discounts')
      .delete()
      .eq('id', params.id)

    if (error) {
      console.error('Error deleting discount:', error)
      return NextResponse.json(
        { success: false, error: 'Error al eliminar descuento' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Descuento eliminado correctamente'
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}