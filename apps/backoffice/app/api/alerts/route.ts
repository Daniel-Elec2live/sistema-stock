// apps/backoffice/app/api/alerts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

// Tipo para la respuesta de batches con relación products
interface BatchWithProduct {
  id: string
  cantidad: number
  caducidad: string
  products: {
    id: string
    nombre: string
  }
}

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')
    
    const supabase = createSupabaseClient()
    
    // Stock bajo - usando rpc o query más específica
    const { data: stockBajo } = await supabase
      .from('products')
      .select('id, nombre, stock_actual, stock_minimo')
      .filter('stock_actual', 'lt', 'stock_minimo')
      .limit(limit)
    
    // Si el filtro anterior no funciona, usar esta alternativa:
    // const { data: allProducts } = await supabase
    //   .from('products')
    //   .select('id, nombre, stock_actual, stock_minimo')
    // 
    // const stockBajo = allProducts?.filter(p => p.stock_actual < p.stock_minimo).slice(0, limit)
    
    // Caducidades próximas (próximos 7 días)
    const fechaLimite = new Date()
    fechaLimite.setDate(fechaLimite.getDate() + 7)
    
    const { data: caducidades } = await supabase
      .from('batches')
      .select(`
        id, 
        cantidad, 
        caducidad,
        products!inner (
          id,
          nombre
        )
      `)
      .lte('caducidad', fechaLimite.toISOString().split('T')[0])
      .gt('cantidad', 0)
      .order('caducidad', { ascending: true })
      .limit(limit)
    
    // Formatear alertas con tipos corregidos
    const caducidadesTipadas = caducidades as BatchWithProduct[] | null
    
    const alertas = [
      ...(stockBajo || []).map(product => ({
        id: `stock-${product.id}`,
        tipo: 'stock_bajo' as const,
        prioridad: 'alta' as const,
        titulo: 'Stock crítico',
        descripcion: `${product.nombre}: ${product.stock_actual} (mín: ${product.stock_minimo})`,
        fecha: new Date().toISOString().split('T')[0],
        product_id: product.id
      })),
      ...(caducidadesTipadas || []).map(batch => ({
        id: `caducidad-${batch.id}`,
        tipo: 'caducidad' as const,
        prioridad: 'media' as const,
        titulo: 'Próxima caducidad',
        descripcion: `${batch.products?.nombre || 'Producto'}: caduca ${batch.caducidad}`,
        fecha: new Date().toISOString().split('T')[0],
        batch_id: batch.id
      }))
    ]
    
    return NextResponse.json({
      alertas,
      resumen: {
        stock_bajo: stockBajo?.length || 0,
        caducidades_proximas: caducidades?.length || 0,
        total: alertas.length
      }
    })
    
  } catch (error) {
    console.error('Error en GET /api/alerts:', error)
    return NextResponse.json(
      { error: 'Error obteniendo alertas' },
      { status: 500 }
    )
  }
}