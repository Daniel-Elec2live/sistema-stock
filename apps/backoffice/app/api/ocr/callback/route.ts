// apps/backoffice/app/api/ocr/callback/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { entry_id, success, data, error: ocrError } = body
    
    const supabase = createSupabaseClient()
    
    if (success && data) {
      // OCR exitoso - actualizar entrada con datos extraídos
      const { error: updateError } = await supabase
        .from('entradas')
        .update({
          estado: 'pendiente_validacion',
          proveedor: data.proveedor,
          fecha: data.fecha,
          productos: data.productos,
          confianza: data.confianza,
          ocr_completado_at: new Date().toISOString()
        })
        .eq('id', entry_id)
      
      if (updateError) {
        console.error('Error actualizando entrada:', updateError)
        return NextResponse.json({ error: 'Error actualizando entrada' }, { status: 500 })
      }
      
      return NextResponse.json({ success: true })
      
    } else {
      // OCR falló - marcar como error
      await supabase
        .from('entradas')
        .update({
          estado: 'error',
          error_message: ocrError || 'Error desconocido en OCR'
        })
        .eq('id', entry_id)
      
      return NextResponse.json({ success: false, error: ocrError })
    }
    
  } catch (error) {
    console.error('Error en callback OCR:', error)
    return NextResponse.json(
      { error: 'Error procesando callback' },
      { status: 500 }
    )
  }
}