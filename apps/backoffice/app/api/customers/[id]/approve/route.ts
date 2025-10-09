import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createSupabaseClient, updateWithConsistency } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createSupabaseClient()
    const body = await request.json()
    const { approved } = body

    if (typeof approved !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'approved debe ser boolean' },
        { status: 400 }
      )
    }

    console.log('[CUSTOMER APPROVE] Processing:', {
      customerId: params.id.slice(0, 8),
      approved,
      timestamp: new Date().toISOString()
    })

    // Verificar que el cliente existe
    const { data: existingCustomer } = await supabase
      .from('customers')
      .select('id, is_approved, rejected_at')
      .eq('id', params.id)
      .single()

    if (!existingCustomer) {
      return NextResponse.json(
        { success: false, error: 'Cliente no encontrado' },
        { status: 404 }
      )
    }

    // Preparar datos de actualización
    const updateData: any = {
      is_approved: approved,
      updated_at: new Date().toISOString(),
      rejected_at: approved ? null : new Date().toISOString()
    }

    // ⭐ SOLUCIÓN: UPDATE atómico con RETURNING clause
    // Esto garantiza read-after-write consistency
    const { data, error } = await updateWithConsistency(
      supabase,
      'customers',
      updateData,
      { id: params.id }
    )

    if (error) {
      console.error('[CUSTOMER APPROVE] ❌ Update failed:', error)
      return NextResponse.json(
        { success: false, error: `Error al actualizar cliente: ${error.message}` },
        { status: 500 }
      )
    }

    console.log('[CUSTOMER APPROVE] ✅ Update successful:', {
      customerId: params.id.slice(0, 8),
      is_approved: (data as any).is_approved,
      rejected_at: (data as any).rejected_at,
      confirmed: (data as any).is_approved === approved
    })

    // ⭐ REVALIDAR cache de Next.js para forzar datos frescos en próximo GET
    revalidatePath('/api/customers')
    revalidatePath('/clientes')

    return NextResponse.json({
      success: true,
      customer: data,
      message: approved ? 'Cliente aprobado correctamente' : 'Cliente rechazado'
    })

  } catch (error) {
    console.error('[CUSTOMER APPROVE] 🚨 Critical error:', error)
    return NextResponse.json(
      { success: false, error: `Error interno del servidor: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}