// apps/backoffice/app/api/gemini-test/route.ts
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const apiKey = process.env.GEMINI_API_KEY

    if (!apiKey) {
      return NextResponse.json({
        error: 'GEMINI_API_KEY no configurada'
      }, { status: 500 })
    }

    console.log('[GEMINI-TEST] Testing API key:', apiKey.substring(0, 10) + '...')

    // Probar con REST API directamente (sin SDK)
    const apiVersions = ['v1beta', 'v1']
    const models = [
      'gemini-2.0-flash-exp',
      'gemini-2.0-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.5-flash',
      'gemini-1.5-pro-latest',
      'gemini-1.5-pro'
    ]

    const results = []

    for (const apiVersion of apiVersions) {
      for (const modelName of models) {
        try {
          console.log(`[GEMINI-TEST] Probando ${apiVersion}/${modelName}...`)

          const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${modelName}:generateContent?key=${apiKey}`

          const response = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{
                parts: [{ text: 'Di hola en español' }]
              }]
            })
          })

          const data = await response.json()

          if (response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
            const responseText = data.candidates[0].content.parts[0].text
            results.push({
              apiVersion,
              model: modelName,
              status: 'SUCCESS ✅',
              response: responseText.substring(0, 100)
            })

            console.log(`[GEMINI-TEST] ✅ FUNCIONA: ${apiVersion}/${modelName}`)

            // Encontramos uno que funciona, devolvemos éxito
            return NextResponse.json({
              success: true,
              workingModel: `${apiVersion}/${modelName}`,
              response: responseText,
              allResults: results
            })
          } else {
            results.push({
              apiVersion,
              model: modelName,
              status: 'error',
              statusCode: response.status,
              error: data.error?.message || 'No response',
              errorDetails: data
            })
          }
        } catch (err: any) {
          results.push({
            apiVersion,
            model: modelName,
            status: 'exception',
            error: err.message
          })
        }
      }
    }

    return NextResponse.json({
      success: false,
      message: 'Ningún modelo funcionó',
      apiKeyPrefix: apiKey.substring(0, 10) + '...',
      allResults: results
    })

  } catch (error: any) {
    console.error('[GEMINI-TEST] Error general:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}
