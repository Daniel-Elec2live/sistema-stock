// apps/backoffice/app/api/entries/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseClient } from '@/lib/supabase'
import { updateProductPrice } from '@/lib/pricing'
import type { SupabaseClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Tipo para producto en la entrada
interface ProductoEntrada {
  nombre: string
  cantidad: number
  precio: number
  unidad: string
  caducidad?: string
}

const entrySchema = z.object({
  tipo: z.enum(['ocr', 'manual']),
  proveedor: z.string().min(1, 'Proveedor es requerido'),
  fecha: z.string().min(1, 'Fecha es requerida'),
  documento_url: z.string().optional(),
  archivo_nombre: z.string().optional(),
  productos: z.array(z.object({
    nombre: z.string().min(1, 'Nombre es requerido'),
    cantidad: z.number().min(0.01, 'Cantidad debe ser mayor a 0'),
    precio: z.number().min(0, 'Precio debe ser mayor o igual a 0'),
    unidad: z.string().min(1, 'Unidad es requerida'),
    caducidad: z.string().optional()
  })).min(1, 'Debe haber al menos un producto')
})

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '20')
    const order = searchParams.get('order') || 'desc'
    
    const supabase = createSupabaseClient()
    
    const { data: entries, error } = await supabase
      .from('entries')
      .select('*')
      .order('created_at', { ascending: order === 'asc' })
      .limit(limit)
    
    if (error) {
      console.error('Error obteniendo entradas:', error)
      return NextResponse.json(
        { error: 'Error obteniendo entradas' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({ entries: entries || [] })
    
  } catch (error) {
    console.error('Error interno:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tipo, documento_url, archivo_nombre, ...data } = entrySchema.parse(body)
    
    const supabase = createSupabaseClient()
    
    if (tipo === 'ocr') {
      // 1. Crear entrada pendiente en BD
      const { data: entrada, error: entradaError } = await supabase
        .from('entries')
        .insert({
          tipo: 'ocr',
          estado: 'processing',
          documento_url,
          archivo_nombre,
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (entradaError) {
        throw new Error(`Error creando entrada: ${entradaError.message}`)
      }
      
      // 2. Llamar al servicio OCR en Hetzner
      const ocrResponse = await fetch(`${process.env.OCR_SERVICE_URL}/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OCR_SERVICE_TOKEN}`
        },
        body: JSON.stringify({
          image_url: documento_url,
          callback_url: `${process.env.NEXTAUTH_URL}/api/ocr/callback`,
          entry_id: entrada.id
        })
      })
      
      if (!ocrResponse.ok) {
        // Marcar entrada como error
        await supabase
          .from('entries')
          .update({ estado: 'error' })
          .eq('id', entrada.id)
        
        throw new Error('Error llamando al servicio OCR')
      }
      
      return NextResponse.json({
        id: entrada.id,
        status: 'processing',
        message: 'Documento enviado para procesamiento OCR'
      })
      
    } else {
      // Entrada manual
      const { data: entrada, error: entradaError } = await supabase
        .from('entries')
        .insert({
          tipo: 'manual',
          estado: 'completed',
          proveedor_text: data.proveedor,
          fecha_factura: data.fecha,
          productos: data.productos,
          created_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (entradaError) {
        throw new Error(`Error creando entrada: ${entradaError.message}`)
      }
      
      // Actualizar stock y precios para cada producto
      if (data.productos) {
        const processedProductIds = new Set<string>()
        for (const producto of data.productos) {
          const productId = await updateStock(supabase, producto as ProductoEntrada, data.proveedor || 'Proveedor Desconocido')

          // Actualizar precio de venta basado en nueva entrada
          if (productId && !processedProductIds.has(productId)) {
            await updateProductPrice(productId)
            processedProductIds.add(productId)
          }
        }
      }
      
      return NextResponse.json({
        id: entrada.id,
        status: 'completed',
        message: 'Entrada registrada correctamente'
      })
    }
    
  } catch (error) {
    console.error('Error en POST /api/entries:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, estado, ...data } = body
    
    const supabase = createSupabaseClient()
    
    // Actualizar entrada
    const { error: updateError } = await supabase
      .from('entries')
      .update({
        estado,
        proveedor_text: data.proveedor,
        fecha_factura: data.fecha,
        productos: data.productos,
        validated_at: new Date().toISOString()
      })
      .eq('id', id)
    
    if (updateError) {
      throw new Error(`Error actualizando entrada: ${updateError.message}`)
    }
    
    // Si se valida, actualizar stock y precios
    if (estado === 'validated' && data.productos) {
      const processedProductIds = new Set<string>()
      for (const producto of data.productos) {
        const productId = await updateStock(supabase, producto as ProductoEntrada, data.proveedor || 'Proveedor Desconocido')

        // Actualizar precio de venta basado en nueva entrada
        if (productId && !processedProductIds.has(productId)) {
          await updateProductPrice(productId)
          processedProductIds.add(productId)
        }
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Entrada validada y stock actualizado'
    })
    
  } catch (error) {
    console.error('Error en PUT /api/entries:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// Función auxiliar para actualizar stock
async function updateStock(supabase: SupabaseClient, producto: ProductoEntrada, proveedor: string): Promise<string | null> {
  // 1. Buscar o crear producto
  let { data: existingProduct } = await supabase
    .from('products')
    .select('id')
    .eq('nombre', producto.nombre)
    .single()
  
  if (!existingProduct) {
    // Generar referencia automática para producto nuevo
    const prefijo = proveedor.substring(0, 3).toUpperCase()
    const { count } = await supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('proveedor', proveedor)
    
    const siguienteNumero = (count || 0) + 1
    const referencia = `${prefijo}25${siguienteNumero.toString().padStart(3, '0')}`
    
    const { data: newProduct, error } = await supabase
      .from('products')
      .insert({
        nombre: producto.nombre,
        unidad: producto.unidad,
        categoria: 'Otros', // Valor por defecto obligatorio
        proveedor: proveedor, // Campo obligatorio
        referencia: referencia, // Referencia automática
        stock_minimo: 5, // valor por defecto
        stock_actual: 0
      })
      .select()
      .single()
    
    if (error) throw error
    existingProduct = newProduct
  }

  // Verificar que tenemos un producto válido
  if (!existingProduct) {
    throw new Error(`Error: No se pudo obtener o crear el producto ${producto.nombre}`)
  }
  
  // 2. Crear lote SIEMPRE (con o sin caducidad)
  const defaultExpiry = new Date()
  defaultExpiry.setFullYear(defaultExpiry.getFullYear() + 2) // 2 años por defecto

  await supabase
    .from('batches')
    .insert({
      product_id: existingProduct.id,
      cantidad: producto.cantidad,
      cantidad_inicial: producto.cantidad, // Cantidad inicial = cantidad actual
      caducidad: producto.caducidad && producto.caducidad.trim() !== ''
        ? producto.caducidad
        : defaultExpiry.toISOString().split('T')[0], // YYYY-MM-DD
      precio_compra: producto.precio
    })
  
  // 3. Actualizar stock global
  // Primero obtener el stock actual
  const { data: currentProduct } = await supabase
    .from('products')
    .select('stock_actual')
    .eq('id', existingProduct.id)
    .single()

  if (currentProduct) {
    const newStock = currentProduct.stock_actual + producto.cantidad
    await supabase
      .from('products')
      .update({
        stock_actual: newStock,
        updated_at: new Date().toISOString()
      })
      .eq('id', existingProduct.id)
  }

  return existingProduct?.id || null
}