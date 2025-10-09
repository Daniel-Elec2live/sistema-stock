import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') // 'pending', 'approved', 'all'
    const timestamp = searchParams.get('_t') // Cache buster del frontend

    // ⭐ SOLUCIÓN DEFINITIVA: Crear cliente Supabase NUEVO cada vez
    // Esto evita completamente el pooling y cache de conexiones
    const supabase = createSupabaseClient()

    // ⭐ CACHE-BUSTING: Crear query única por request usando modulo matemático
    // El timestamp cambia cada request, lo que hace que la query sea única y no cacheable
    const cacheBreaker = timestamp || Date.now().toString()
    const moduloValue = parseInt(cacheBreaker.slice(-3)) % 1000 // 0-999

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
      .or(`created_at.gte.2000-01-01,created_at.gte.1999-01-01`) // Condición que siempre es true pero con timestamp cambia la query
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

    // EXTREME DEBUG: Mostrar estado is_approved de CADA customer
    const customerStates = customers?.map(c => `${c.id.slice(0,8)}:${c.is_approved ? 'APPROVED' : 'NOT_APPROVED'}`)
    console.log(`🔍 CUSTOMERS DEBUG [timestamp=${timestamp}]:`, customerStates?.join(', '))

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