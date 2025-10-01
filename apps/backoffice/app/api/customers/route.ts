import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    // 🚨 DEBUG: Verificar qué Supabase URL está usando
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
    console.log(`🔍 CUSTOMERS API - Supabase URL: ${supabaseUrl}`)

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
      .gte('created_at', '2000-01-01') // Cache-busting: filtro siempre true, fuerza query fresca
      .order('created_at', { ascending: false })

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

    // 🚨 DEBUG: Verificar resultados
    if (!customers || customers.length === 0) {
      console.log('📋 No customers found in database - returning empty array')
      console.log(`🚨 DEBUG: Is this expected? Check if Supabase URL matches: ${supabaseUrl}`)
    } else {
      console.log(`👥 Found ${customers.length} customers. First 3 IDs:`, customers.slice(0, 3).map(c => c.id.slice(0, 8)))
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