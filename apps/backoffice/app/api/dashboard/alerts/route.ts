import { createSupabaseClient } from '@/lib/supabase'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

interface Alert {
  id: string
  tipo: 'stock_bajo' | 'caducidad' | 'precio'
  titulo: string
  descripcion: string
  fecha: string
  prioridad: 'alta' | 'media' | 'baja'
}

export async function GET() {
  try {
    const supabase = createSupabaseClient()
    const alertas: Alert[] = []

    // 1. Alertas de stock bajo
    const { data: stockBajo } = await supabase
      .from('products')
      .select('id, nombre, stock_actual, stock_minimo')
      .lte('stock_actual', 0)
      .limit(3)

    if (stockBajo) {
      stockBajo.forEach(product => {
        alertas.push({
          id: `stock-${product.id}`,
          tipo: 'stock_bajo',
          titulo: product.stock_actual === 0 ? 'Sin stock' : 'Stock crítico',
          descripcion: `${product.nombre} - Stock: ${product.stock_actual} (mín: ${product.stock_minimo})`,
          fecha: new Date().toISOString().split('T')[0],
          prioridad: product.stock_actual === 0 ? 'alta' : 'media'
        })
      })
    }

    // 2. Alertas de próxima caducidad (próximos 7 días)
    const fechaLimite = new Date()
    fechaLimite.setDate(fechaLimite.getDate() + 7)

    const { data: proximasCaducidades } = await supabase
      .from('batches')
      .select(`
        id, 
        cantidad, 
        caducidad,
        products (
          id,
          nombre
        )
      `)
      .lte('caducidad', fechaLimite.toISOString().split('T')[0])
      .gt('cantidad', 0)
      .limit(3)

    if (proximasCaducidades) {
      proximasCaducidades.forEach((batch: any) => {
        if (batch.products) {
          const diasRestantes = Math.ceil(
            (new Date(batch.caducidad).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          )
          
          alertas.push({
            id: `caducidad-${batch.id}`,
            tipo: 'caducidad',
            titulo: 'Próxima caducidad',
            descripcion: `${batch.products.nombre} caduca en ${diasRestantes} días (${batch.cantidad} unidades)`,
            fecha: new Date().toISOString().split('T')[0],
            prioridad: diasRestantes <= 2 ? 'alta' : 'media'
          })
        }
      })
    }

    // 3. Alertas de variación de precios (productos con entradas recientes)
    const fechaReciente = new Date()
    fechaReciente.setDate(fechaReciente.getDate() - 30)

    const { data: entradasRecientes } = await supabase
      .from('entradas')
      .select('productos, created_at')
      .gte('created_at', fechaReciente.toISOString())
      .eq('estado', 'completada')
      .limit(10)

    if (entradasRecientes) {
      // Analizar variaciones de precio (simplificado)
      const productosConPrecios: { [key: string]: number[] } = {}
      
      entradasRecientes.forEach((entrada: any) => {
        if (entrada.productos && Array.isArray(entrada.productos)) {
          entrada.productos.forEach((prod: any) => {
            if (prod.nombre && prod.precio) {
              if (!productosConPrecios[prod.nombre]) {
                productosConPrecios[prod.nombre] = []
              }
              productosConPrecios[prod.nombre].push(prod.precio)
            }
          })
        }
      })

      // Detectar variaciones significativas (>10%)
      Object.entries(productosConPrecios).forEach(([nombreProducto, precios]) => {
        if (precios.length >= 2) {
          const precioAnterior = precios[precios.length - 2]
          const precioActual = precios[precios.length - 1]
          const variacion = ((precioActual - precioAnterior) / precioAnterior) * 100

          if (Math.abs(variacion) > 10) {
            alertas.push({
              id: `precio-${nombreProducto.replace(' ', '-').toLowerCase()}`,
              tipo: 'precio',
              titulo: 'Variación de precio',
              descripcion: `${nombreProducto} ${variacion > 0 ? '+' : ''}${variacion.toFixed(1)}% respecto a última compra`,
              fecha: new Date().toISOString().split('T')[0],
              prioridad: Math.abs(variacion) > 25 ? 'alta' : 'baja'
            })
          }
        }
      })
    }

    // Ordenar por prioridad (alta > media > baja) y fecha
    const ordenPrioridad = { alta: 3, media: 2, baja: 1 }
    alertas.sort((a, b) => {
      if (ordenPrioridad[a.prioridad] !== ordenPrioridad[b.prioridad]) {
        return ordenPrioridad[b.prioridad] - ordenPrioridad[a.prioridad]
      }
      return new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    })

    return NextResponse.json({ 
      alerts: alertas.slice(0, 5) // Mostrar solo las 5 más importantes
    })

  } catch (error) {
    console.error('Error al obtener alertas:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}