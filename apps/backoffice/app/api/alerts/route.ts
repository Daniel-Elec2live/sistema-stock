// apps/backoffice/app/api/alerts/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'
import { sendStockAlert } from '@/lib/email'

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
export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '10')

    console.log('[ALERTS] 📥 Fetching alerts with limit:', limit)

    const supabase = createSupabaseClient()

    // Stock bajo - obtener todos los productos y filtrar en memoria
    // (PostgREST no soporta comparaciones entre columnas directamente)
    console.log('[ALERTS] 🔍 Querying all products from database...')

    const { data: allProducts, error: productsError } = await supabase
      .from('products')
      .select('id, nombre, stock_actual, stock_minimo')
      .order('stock_actual', { ascending: true })

    console.log('[ALERTS] 📊 All products query result:', {
      totalCount: allProducts?.length || 0,
      error: productsError?.message,
      sample: allProducts?.slice(0, 3).map(p => ({
        nombre: p.nombre,
        actual: p.stock_actual,
        minimo: p.stock_minimo,
        isBelowMin: p.stock_actual < p.stock_minimo
      }))
    })

    // Filtrar productos con stock bajo
    const stockBajo = allProducts?.filter(p => p.stock_actual < p.stock_minimo).slice(0, limit)

    console.log('[ALERTS] ⚠️  Stock bajo filtered result:', {
      count: stockBajo?.length || 0,
      products: stockBajo?.map(p => ({ nombre: p.nombre, actual: p.stock_actual, minimo: p.stock_minimo }))
    })
    
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

    // Enviar emails para alertas de stock (agotado o crítico)
    if (stockBajo && stockBajo.length > 0) {
      console.log('[ALERTS] 📧 Preparing to send', stockBajo.length, 'stock alert emails...')

      // Enviar emails en paralelo sin bloquear respuesta
      Promise.all(
        stockBajo.map(product => {
          const alertType = product.stock_actual === 0 ? 'out_of_stock' : 'critical'
          console.log('[ALERTS] 📤 Sending email for:', product.nombre, `(${alertType})`)

          return sendStockAlert({
            productName: product.nombre,
            currentStock: product.stock_actual,
            minimumStock: product.stock_minimo,
            alertType
          })
        })
      )
        .then(results => {
          const successful = results.filter(r => r.success).length
          console.log('[ALERTS] ✅ Successfully sent', successful, 'of', results.length, 'emails')
        })
        .catch(err => console.error('[ALERTS] ❌ Error enviando emails de stock:', err))
    } else {
      console.log('[ALERTS] ℹ️  No stock alerts to send emails for')
    }

    const response = {
      alertas,
      resumen: {
        stock_bajo: stockBajo?.length || 0,
        caducidades_proximas: caducidades?.length || 0,
        total: alertas.length
      }
    }

    console.log('[ALERTS] 📤 Returning response:', {
      totalAlerts: response.alertas.length,
      stockBajo: response.resumen.stock_bajo,
      caducidades: response.resumen.caducidades_proximas,
      alertIds: response.alertas.slice(0, 3).map(a => a.id)
    })

    return NextResponse.json(response)
    
  } catch (error) {
    console.error('Error en GET /api/alerts:', error)
    return NextResponse.json(
      { error: 'Error obteniendo alertas' },
      { status: 500 }
    )
  }
}