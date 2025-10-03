// apps/backoffice/app/api/gemini-ocr/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

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

// Prompt optimizado para facturas/albaranes españoles
const GEMINI_PROMPT = `
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

CONTEXTO: Sistema de gestión de stock para restaurante/tienda de alimentación.
`

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

    // 1. Descargar archivo
    console.log(`[OCR] Descargando archivo desde: ${image_url.substring(0, 100)}...`)
    const { base64, mimeType } = await downloadImageAsBase64(image_url)
    console.log(`[OCR] Archivo descargado - Tipo: ${mimeType}`)

    // 2. Procesar con Gemini usando API REST directa
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
                { text: GEMINI_PROMPT },
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