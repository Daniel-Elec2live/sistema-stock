import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'pending', 'approved', 'all'

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
      .order('created_at', { ascending: false })

    // Filtrar por estado si se especifica
    if (status === 'pending') {
      query = query.eq('is_approved', false)
    } else if (status === 'approved') {
      query = query.eq('is_approved', true)
    }

    const { data: customers, error } = await query

    if (error) {
      console.error('Error fetching customers:', error)
      return NextResponse.json(
        { success: false, error: 'Error al obtener clientes' },
        { status: 500 }
      )
    }

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