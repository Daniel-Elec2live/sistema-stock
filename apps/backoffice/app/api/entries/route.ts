// apps/backoffice/app/api/entries/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createSupabaseClient } from '@/lib/supabase'
import { updateProductPrice } from '@/lib/pricing'
import { matchProveedor, normalizeProveedorName } from '@/lib/proveedorMatching'
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

// Schema para entrada OCR (solo necesita documento)
const ocrEntrySchema = z.object({
  tipo: z.literal('ocr'),
  documento_url: z.string().min(1, 'documento_url es requerido para OCR'),
  archivo_nombre: z.string().optional()
})

// Schema para entrada manual (necesita todos los datos)
const manualEntrySchema = z.object({
  tipo: z.literal('manual'),
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

const entrySchema = z.discriminatedUnion('tipo', [ocrEntrySchema, manualEntrySchema])

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
    const validatedData = entrySchema.parse(body)

    const supabase = createSupabaseClient()

    if (validatedData.tipo === 'ocr') {
      const { documento_url, archivo_nombre } = validatedData

      // 1. Procesar con Gemini OCR directamente
      console.log('[ENTRIES] Procesando con Gemini OCR...')

      // Determinar URL base: priorizar variable custom, luego producción conocida, luego localhost
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL
        || (process.env.VERCEL_ENV === 'production' ? 'https://sistema-stock-lac.vercel.app' : null)
        || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null)
        || process.env.NEXTAUTH_URL
        || 'http://localhost:3000'

      console.log('[ENTRIES] Using baseUrl:', baseUrl)
      console.log('[ENTRIES] VERCEL_ENV:', process.env.VERCEL_ENV)

      const geminiResponse = await fetch(`${baseUrl}/api/gemini-ocr`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          image_url: documento_url,
          processing_id: crypto.randomUUID()
        })
      })

      const geminiResult = await geminiResponse.json()

      if (!geminiResult.success) {
        console.error('[ENTRIES] Error en Gemini OCR:', geminiResult.error)
        throw new Error(`Error OCR: ${geminiResult.error}`)
      }

      // 2. Obtener lista de proveedores existentes para matching
      const { data: proveedores } = await supabase
        .from('products')
        .select('proveedor')
        .not('proveedor', 'is', null)

      const proveedoresSet = new Set(proveedores?.map(p => p.proveedor) || [])
      const proveedoresUnicos = Array.from(proveedoresSet)

      // 3. Hacer matching del proveedor
      let proveedorFinal = geminiResult.proveedor
      if (geminiResult.proveedor && proveedoresUnicos.length > 0) {
        const match = matchProveedor(geminiResult.proveedor, proveedoresUnicos, 0.7)
        if (match) {
          console.log(`[ENTRIES] Proveedor matched: "${geminiResult.proveedor}" -> "${match.proveedor}" (${match.similitud.toFixed(2)})`)
          proveedorFinal = match.proveedor
        } else {
          // Normalizar nombre para crear nuevo proveedor
          proveedorFinal = normalizeProveedorName(geminiResult.proveedor)
          console.log(`[ENTRIES] Nuevo proveedor normalizado: "${geminiResult.proveedor}" -> "${proveedorFinal}"`)
        }
      }

      // 4. Preparar respuesta compatible con frontend existente
      const ocrResultForFrontend = {
        id: geminiResult.processing_id,
        status: 'completed' as const,
        proveedor: proveedorFinal,
        fecha: geminiResult.fecha,
        productos: geminiResult.productos || [],
        confianza: geminiResult.confianza,
        tiempo_procesamiento: geminiResult.tiempo_procesamiento,
        notas: geminiResult.notas
      }

      console.log(`[ENTRIES] OCR completado exitosamente: ${geminiResult.productos?.length || 0} productos, confianza: ${geminiResult.confianza}`)

      return NextResponse.json(ocrResultForFrontend)

    } else {
      // Entrada manual
      const { proveedor, fecha, productos, documento_url, archivo_nombre } = validatedData

      const { data: entrada, error: entradaError } = await supabase
        .from('entries')
        .insert({
          tipo: 'manual',
          estado: 'completed',
          proveedor_text: proveedor,
          fecha_factura: fecha,
          productos: productos,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (entradaError) {
        throw new Error(`Error creando entrada: ${entradaError.message}`)
      }

      // Actualizar stock y precios para cada producto
      if (productos) {
        const processedProductIds = new Set<string>()
        for (const producto of productos) {
          const productId = await updateStock(supabase, producto as ProductoEntrada, proveedor || 'Proveedor Desconocido')

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