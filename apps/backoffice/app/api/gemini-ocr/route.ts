// apps/backoffice/app/api/gemini-ocr/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { createSupabaseClient } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30 // Aumentar timeout para OCR

interface GeminiOCRRequest {
  image_url: string
  processing_id?: string
}

interface GeminiOCRResponse {
  success: boolean
  processing_id: string
  proveedor?: string
  fecha?: string
  productos?: Array<{
    nombre: string
    cantidad: number
    precio: number
    unidad: string
    caducidad?: string
  }>
  confianza: number
  notas?: string
  error?: string
  tiempo_procesamiento: number
}

// Función para generar prompt dinámico con contexto de productos/proveedores existentes
async function buildEnhancedPrompt(): Promise<string> {
  try {
    const supabase = createSupabaseClient()

    // Obtener proveedores únicos (solo los más recientes/frecuentes)
    const { data: proveedoresData } = await supabase
      .from('products')
      .select('proveedor')
      .not('proveedor', 'is', null)
      .limit(100)

    const proveedoresSet = new Set(proveedoresData?.map(p => p.proveedor) || [])
    const proveedores = Array.from(proveedoresSet).slice(0, 30) // Top 30

    // Obtener productos existentes (nombres únicos)
    const { data: productosData } = await supabase
      .from('products')
      .select('nombre, proveedor, unidad')
      .eq('is_active', true)
      .limit(200)

    const productos = productosData || []

    // Construir lista de contexto
    const proveedoresContext = proveedores.length > 0
      ? `\n\nPROVEEDORES CONOCIDOS (intenta matchear con estos nombres si es posible):\n${proveedores.map(p => `- ${p}`).join('\n')}`
      : ''

    const productosContext = productos.length > 0
      ? `\n\nPRODUCTOS EXISTENTES EN SISTEMA (si reconoces alguno, usa EXACTAMENTE este nombre):\n${productos.slice(0, 50).map(p => `- "${p.nombre}" (${p.unidad}${p.proveedor ? `, proveedor: ${p.proveedor}` : ''})`).join('\n')}`
      : ''

    return `
Analiza esta factura o albarán español y extrae la información en formato JSON exacto:

{
  "proveedor": "Nombre completo de la empresa proveedora",
  "fecha": "YYYY-MM-DD",
  "productos": [
    {
      "nombre": "Nombre del producto limpio (singular, sin códigos)",
      "cantidad": 0.00,
      "precio": 0.00,
      "unidad": "kg|ud|l|caja|bolsa|g",
      "caducidad": "YYYY-MM-DD o null",
      "producto_existente_id": "nombre_exacto_si_matchea_con_lista o null"
    }
  ],
  "confianza": 0.95,
  "notas": "Observaciones importantes"
}

REGLAS CRÍTICAS:
- Nombres de productos LIMPIOS: "Tomate Cherry" NO "TOMATES CHERRY 5KG REF:TC001"
- Precios UNITARIOS, nunca totales de línea
- Fechas SIEMPRE en formato YYYY-MM-DD
- Cantidad como número decimal (5.5, no "5,5")
- Unidades estándar: kg, g, l, ml, ud, caja, bolsa
- Confianza de 0.0 a 1.0 basada en claridad
- Si algo no está claro, ponlo en "notas"
- Solo productos alimentarios, ignorar servicios/gastos

ANÁLISIS DE COLUMNAS COMPLEJAS (RAZONA ANTES DE EXTRAER):
Las facturas pueden tener múltiples columnas. DEBES RAZONAR qué columna usar:

1. DESCUENTOS:
   - Si hay columna "Descuento" o "Dto." → NO restes del precio, usa el precio YA CON descuento aplicado
   - Si solo hay "Precio s/dto" y "Precio c/dto" → usa el precio CON descuento
   - Anota en "notas" si aplicaste descuento: "Precio incluye X% descuento"

2. PESO vs CANTIDAD:
   - Si producto es por peso (kg/g) → usa columna "Peso" o "Kg" como cantidad
   - Si producto es por unidades (ud/caja) → usa columna "Cantidad" o "Uds"
   - Si hay AMBAS columnas:
     * Identifica la unidad real del producto (¿se vende por kg o por unidad?)
     * Ejemplo: "Tomate" → usa peso en kg; "Lata de tomate" → usa unidades
   - Anota en "notas": "Usé columna Peso (3.5 kg)" o "Usé columna Cantidad (12 uds)"

3. CAJAS y UNIDADES:
   - Si hay "Cajas" y "Uds/Caja" → MULTIPLICA para obtener cantidad total
   - Ejemplo: 3 cajas × 24 uds/caja = 72 uds → cantidad: 72, unidad: "ud"
   - Si solo hay "Cajas" sin desglose → cantidad es número de cajas, unidad: "caja"
   - Anota en "notas": "Calculado: 3 cajas × 24 uds = 72 uds"

4. PRECIO UNITARIO vs TOTAL:
   - SIEMPRE usa precio UNITARIO (precio por kg/ud/litro)
   - Si solo hay precio total → DIVIDE entre cantidad para obtener unitario
   - Ejemplo: Total 45€, Cantidad 15kg → precio unitario: 3€/kg
   - Anota en "notas": "Precio unitario calculado: 45€ ÷ 15kg = 3€/kg"

5. MÚLTIPLES COLUMNAS DE PRECIO:
   - Prioridad: "P.Unit." > "Precio" > "Importe" > "Total"
   - Si hay "Precio Base" y "Precio Final" → usa Precio Final
   - Ignora columnas como "PVP Sugerido" o "Precio Catálogo"

6. CASOS AMBIGUOS:
   - Si NO estás seguro de qué columna usar → pon confianza baja (< 0.7)
   - Anota en "notas" TODAS tus dudas y decisiones
   - Ejemplo: "Columna 'Peso' vs 'Bultos' ambigua, asumí Peso como cantidad"

7. VALORES CALCULADOS:
   - Si tuviste que CALCULAR algo (multiplicar, dividir) → explícalo en "notas"
   - Reduce confianza si hiciste suposiciones: confianza 0.8 → 0.6

MATCHING INTELIGENTE:
- Si el proveedor coincide con alguno de la lista CONOCIDOS, usa ESE nombre exacto
- Si un producto parece ser el mismo que uno EXISTENTE, pon su nombre exacto en "producto_existente_id"
- Para matching de productos: ignora mayúsculas/minúsculas, acentos, y variaciones menores
- Ejemplos de match:
  * "TOMATES CHERRY 500G" → matchea con "Tomate Cherry"
  * "Aceite oliva virgen extra" → matchea con "Aceite de Oliva Virgen Extra"
  * "Queso manchego curado" → matchea con "Queso Manchego"
${proveedoresContext}${productosContext}

CONTEXTO: Sistema de gestión de stock para restaurante/tienda de alimentación.
`
  } catch (error) {
    console.warn('[OCR] Error obteniendo contexto de BD, usando prompt básico:', error)
    // Fallback a prompt sin contexto
    return `
Analiza esta factura o albarán español y extrae la información en formato JSON exacto:

{
  "proveedor": "Nombre completo de la empresa proveedora",
  "fecha": "YYYY-MM-DD",
  "productos": [
    {
      "nombre": "Nombre del producto limpio (singular, sin códigos)",
      "cantidad": 0.00,
      "precio": 0.00,
      "unidad": "kg|ud|l|caja|bolsa|g",
      "caducidad": "YYYY-MM-DD o null"
    }
  ],
  "confianza": 0.95,
  "notas": "Observaciones importantes"
}

REGLAS CRÍTICAS:
- Nombres de productos LIMPIOS: "Tomate Cherry" NO "TOMATES CHERRY 5KG REF:TC001"
- Precios UNITARIOS, nunca totales de línea
- Fechas SIEMPRE en formato YYYY-MM-DD
- Cantidad como número decimal (5.5, no "5,5")
- Unidades estándar: kg, g, l, ml, ud, caja, bolsa
- Confianza de 0.0 a 1.0 basada en claridad
- Si algo no está claro, ponlo en "notas"
- Solo productos alimentarios, ignorar servicios/gastos

ANÁLISIS DE COLUMNAS COMPLEJAS (RAZONA ANTES DE EXTRAER):
Las facturas pueden tener múltiples columnas. DEBES RAZONAR qué columna usar:

1. DESCUENTOS:
   - Si hay columna "Descuento" o "Dto." → NO restes del precio, usa el precio YA CON descuento aplicado
   - Si solo hay "Precio s/dto" y "Precio c/dto" → usa el precio CON descuento
   - Anota en "notas" si aplicaste descuento: "Precio incluye X% descuento"

2. PESO vs CANTIDAD:
   - Si producto es por peso (kg/g) → usa columna "Peso" o "Kg" como cantidad
   - Si producto es por unidades (ud/caja) → usa columna "Cantidad" o "Uds"
   - Si hay AMBAS columnas:
     * Identifica la unidad real del producto (¿se vende por kg o por unidad?)
     * Ejemplo: "Tomate" → usa peso en kg; "Lata de tomate" → usa unidades
   - Anota en "notas": "Usé columna Peso (3.5 kg)" o "Usé columna Cantidad (12 uds)"

3. CAJAS y UNIDADES:
   - Si hay "Cajas" y "Uds/Caja" → MULTIPLICA para obtener cantidad total
   - Ejemplo: 3 cajas × 24 uds/caja = 72 uds → cantidad: 72, unidad: "ud"
   - Si solo hay "Cajas" sin desglose → cantidad es número de cajas, unidad: "caja"
   - Anota en "notas": "Calculado: 3 cajas × 24 uds = 72 uds"

4. PRECIO UNITARIO vs TOTAL:
   - SIEMPRE usa precio UNITARIO (precio por kg/ud/litro)
   - Si solo hay precio total → DIVIDE entre cantidad para obtener unitario
   - Ejemplo: Total 45€, Cantidad 15kg → precio unitario: 3€/kg
   - Anota en "notas": "Precio unitario calculado: 45€ ÷ 15kg = 3€/kg"

5. MÚLTIPLES COLUMNAS DE PRECIO:
   - Prioridad: "P.Unit." > "Precio" > "Importe" > "Total"
   - Si hay "Precio Base" y "Precio Final" → usa Precio Final
   - Ignora columnas como "PVP Sugerido" o "Precio Catálogo"

6. CASOS AMBIGUOS:
   - Si NO estás seguro de qué columna usar → pon confianza baja (< 0.7)
   - Anota en "notas" TODAS tus dudas y decisiones
   - Ejemplo: "Columna 'Peso' vs 'Bultos' ambigua, asumí Peso como cantidad"

7. VALORES CALCULADOS:
   - Si tuviste que CALCULAR algo (multiplicar, dividir) → explícalo en "notas"
   - Reduce confianza si hiciste suposiciones: confianza 0.8 → 0.6

CONTEXTO: Sistema de gestión de stock para restaurante/tienda de alimentación.
`
  }
}

async function downloadImageAsBase64(imageUrl: string): Promise<{ base64: string; mimeType: string }> {
  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Sistema-Stock-OCR/1.0'
      },
      // Timeout de 10 segundos para descarga
      signal: AbortSignal.timeout(10000)
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const contentType = response.headers.get('content-type')
    // Aceptar imágenes y PDFs
    const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf']
    if (!contentType || !validTypes.some(type => contentType.startsWith(type))) {
      throw new Error(`Tipo de archivo no soportado: ${contentType}. Formatos válidos: JPG, PNG, WEBP, PDF`)
    }

    // Verificar tamaño (máximo 10MB)
    const contentLength = response.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > 10 * 1024 * 1024) {
      throw new Error('Archivo demasiado grande (máximo 10MB)')
    }

    const buffer = await response.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')

    // Normalizar mime type
    let mimeType = contentType
    if (contentType.includes('jpeg') || contentType.includes('jpg')) {
      mimeType = 'image/jpeg'
    } else if (contentType.includes('png')) {
      mimeType = 'image/png'
    } else if (contentType.includes('pdf')) {
      mimeType = 'application/pdf'
    }

    return { base64, mimeType }
  } catch (error) {
    console.error('Error descargando archivo:', error)
    throw new Error(`Error descargando archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`)
  }
}

function validateGeminiResponse(response: any): boolean {
  // Validación básica de estructura
  if (typeof response !== 'object' || response === null) return false

  // Debe tener al menos proveedor o productos
  if (!response.proveedor && !response.productos?.length) return false

  // Validar productos si existen
  if (response.productos) {
    if (!Array.isArray(response.productos)) return false

    for (const producto of response.productos) {
      if (!producto.nombre || typeof producto.cantidad !== 'number' || typeof producto.precio !== 'number') {
        return false
      }
    }
  }

  return true
}

function sanitizeGeminiResponse(response: any): any {
  // Limpiar y normalizar la respuesta
  return {
    proveedor: response.proveedor?.trim() || null,
    fecha: response.fecha || null,
    productos: (response.productos || []).map((p: any) => ({
      nombre: p.nombre?.trim() || 'Producto sin nombre',
      cantidad: Math.max(0, parseFloat(p.cantidad) || 0),
      precio: Math.max(0, parseFloat(p.precio) || 0),
      unidad: p.unidad?.toLowerCase() || 'ud',
      caducidad: p.caducidad === 'null' || !p.caducidad ? null : p.caducidad
    })),
    confianza: Math.min(1, Math.max(0, parseFloat(response.confianza) || 0.5)),
    notas: response.notas?.trim() || null
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()
  let processing_id = 'unknown'

  try {
    const body: GeminiOCRRequest = await request.json()
    const { image_url, processing_id: reqProcessingId = crypto.randomUUID() } = body
    processing_id = reqProcessingId

    if (!image_url) {
      return NextResponse.json(
        {
          success: false,
          error: 'image_url es requerido',
          processing_id
        },
        { status: 400 }
      )
    }

    // Verificar que tenemos la API key
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      console.error('GEMINI_API_KEY no configurada')
      return NextResponse.json(
        {
          success: false,
          error: 'Servicio OCR no disponible (configuración)',
          processing_id,
          tiempo_procesamiento: (Date.now() - startTime) / 1000,
          confianza: 0
        },
        { status: 500 }
      )
    }

    console.log(`[OCR] Iniciando procesamiento - ID: ${processing_id}`)

    // 1. Construir prompt con contexto de productos/proveedores
    console.log(`[OCR] Construyendo prompt con contexto de BD...`)
    const enhancedPrompt = await buildEnhancedPrompt()
    console.log(`[OCR] Prompt generado con contexto de productos existentes`)

    // 2. Descargar archivo
    console.log(`[OCR] Descargando archivo desde: ${image_url.substring(0, 100)}...`)
    const { base64, mimeType } = await downloadImageAsBase64(image_url)
    console.log(`[OCR] Archivo descargado - Tipo: ${mimeType}`)

    // 3. Procesar con Gemini usando API REST directa
    console.log(`[OCR] Procesando con Gemini Vision (API REST)...`)

    // Intentar con diferentes versiones de API y modelos
    // Gemini 2.0 es la versión más reciente (enero 2025)
    const apiVersions = ['v1beta', 'v1']
    const models = [
      'gemini-2.0-flash-exp',
      'gemini-2.0-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash',
      'gemini-1.5-pro-latest',
      'gemini-1.5-pro'
    ]

    let responseText = ''
    let success = false

    for (const apiVersion of apiVersions) {
      if (success) break

      for (const modelName of models) {
        if (success) break

        try {
          console.log(`[OCR] Intentando ${apiVersion}/${modelName}...`)

          const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${apiKey}`

          const requestBody = {
            contents: [{
              parts: [
                { text: enhancedPrompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64
                  }
                }
              ]
            }]
          }

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
          })

          if (!response.ok) {
            const errorText = await response.text()
            console.log(`[OCR] Error con ${apiVersion}/${modelName}:`, response.status, errorText.substring(0, 200))
            continue
          }

          const data = await response.json()

          if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
            responseText = data.candidates[0].content.parts[0].text
            success = true
            console.log(`[OCR] ✅ Éxito con ${apiVersion}/${modelName}`)
            break
          }
        } catch (err: any) {
          console.log(`[OCR] Error probando ${apiVersion}/${modelName}:`, err.message)
        }
      }
    }

    if (!success || !responseText) {
      throw new Error('No se pudo procesar con ninguna versión de Gemini. Verifica que la API key sea válida y tenga acceso a Gemini.')
    }

    console.log(`[OCR] Respuesta Gemini raw:`, responseText.substring(0, 200) + '...')

    // 3. Parsear respuesta JSON
    let geminiData
    try {
      // Extraer JSON si está entre ```json y ``` (compatible ES5)
      const jsonMatch = responseText.match(/```json\s*([\s\S]*?)\s*```/)
      const jsonText = jsonMatch ? jsonMatch[1] : responseText

      geminiData = JSON.parse(jsonText)
    } catch (parseError) {
      console.error('[OCR] Error parsing JSON:', parseError)
      return NextResponse.json({
        success: false,
        error: 'Error procesando respuesta OCR: formato inválido',
        processing_id,
        tiempo_procesamiento: (Date.now() - startTime) / 1000,
        confianza: 0
      }, { status: 422 })
    }

    // 4. Validar respuesta
    if (!validateGeminiResponse(geminiData)) {
      console.error('[OCR] Respuesta inválida:', geminiData)
      return NextResponse.json({
        success: false,
        error: 'No se pudo extraer información válida del documento',
        processing_id,
        tiempo_procesamiento: (Date.now() - startTime) / 1000,
        confianza: 0
      }, { status: 422 })
    }

    // 5. Sanitizar y normalizar
    const cleanData = sanitizeGeminiResponse(geminiData)
    const processingTime = (Date.now() - startTime) / 1000

    console.log(`[OCR] Completado exitosamente - ID: ${processing_id}, Tiempo: ${processingTime}s, Confianza: ${cleanData.confianza}`)

    const response: GeminiOCRResponse = {
      success: true,
      processing_id,
      ...cleanData,
      tiempo_procesamiento: processingTime
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('[OCR] Error general:', error)

    const processingTime = (Date.now() - startTime) / 1000
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servicio OCR'

    return NextResponse.json({
      success: false,
      error: errorMessage,
      processing_id: processing_id,
      tiempo_procesamiento: processingTime,
      confianza: 0
    }, { status: 500 })
  }
}