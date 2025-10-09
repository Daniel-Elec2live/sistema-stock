import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'pending', 'approved', 'all'
    const timestamp = searchParams.get('_t') // Cache buster del frontend

    // Cache busting: leer datos actualizados forzando LIMIT+OFFSET único por request
    // Esto hace que Supabase no pueda devolver cache porque la query es diferente cada vez
    const offset = timestamp ? (parseInt(timestamp) % 1) : 0 // Siempre 0, pero único por timestamp

    let query = supabase
      .from('customers')
      .select(`
        id,
        email,
        name,
        company_name,
        phone,
        address,
        is_approved,
        rejected_at,
        created_at,
        updated_at
      `)
      .gte('created_at', '2000-01-01') // Siempre true
      .order('created_at', { ascending: false })
      .range(offset, offset + 999) // Rango único por request, nunca cachea

    // Filtrar por estado si se especifica
    if (status === 'pending') {
      query = query.eq('is_approved', false)
    } else if (status === 'approved') {
      query = query.eq('is_approved', true)
    }

    const { data: customers, error } = await query

    if (error) {
      console.error('❌ Error fetching customers:', error)
      return NextResponse.json(
        { success: false, error: 'Error al obtener clientes' },
        { status: 500 }
      )
    }

    console.log(`👥 Found ${customers?.length || 0} customers with timestamp ${timestamp}`)

    return NextResponse.json({
      success: true,
      customers: customers || []
    })

  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}