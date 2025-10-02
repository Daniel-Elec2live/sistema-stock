// apps/backoffice/app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó archivo' },
        { status: 400 }
      )
    }
    
    // Obtener tipo de subida (imagen de producto o documento)
    const uploadType = formData.get('type') as string || 'documento'

    // Validar tipo de archivo según el tipo de subida
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    const allowedDocTypes = ['application/pdf', 'image/jpeg', 'image/png']

    const allowedTypes = uploadType === 'producto' ? allowedImageTypes : allowedDocTypes

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: `Tipo de archivo no soportado para ${uploadType === 'producto' ? 'imágenes de productos' : 'documentos'}` },
        { status: 400 }
      )
    }

    // Validar tamaño (5MB para imágenes de productos, 10MB para documentos)
    const maxSize = uploadType === 'producto' ? 5 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `Archivo demasiado grande (máximo ${uploadType === 'producto' ? '5MB' : '10MB'})` },
        { status: 400 }
      )
    }

    const supabase = createSupabaseClient()

    // Generar nombre único
    const timestamp = Date.now()
    const fileName = `${timestamp}-${file.name}`
    const folder = uploadType === 'producto' ? 'productos' : 'documentos'
    const filePath = `${folder}/${fileName}`
    
    // Subir a Supabase Storage
    const { error } = await supabase.storage
      .from(process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET!)
      .upload(filePath, file)
    
    if (error) {
      throw new Error(`Error subiendo archivo: ${error.message}`)
    }
    
    // Obtener URL pública
    const { data: { publicUrl } } = supabase.storage
      .from(process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET!)
      .getPublicUrl(filePath)
    
    return NextResponse.json({
      success: true,
      fileName,
      filePath,
      fileUrl: publicUrl,
      fileSize: file.size,
      fileType: file.type
    })
    
  } catch (error) {
    console.error('Error en POST /api/upload:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// Ejemplo de uso con curl para testing:

/*
# 1. Crear entrada manual
curl -X POST http://localhost:3000/api/entries \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "manual",
    "proveedor": "Huerta del Sur",
    "fecha": "2025-08-22",
    "productos": [
      {
        "nombre": "Tomate Cherry",
        "cantidad": 5,
        "precio": 12.50,
        "unidad": "kg",
        "caducidad": "2025-08-30"
      }
    ]
  }'

# 2. Crear ajuste de stock (merma)
curl -X POST http://localhost:3000/api/stock/adjustment \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "uuid-del-producto",
    "tipo": "merma",
    "cantidad": 2,
    "motivo": "Producto en mal estado",
    "observaciones": "Tomates con hongos"
  }'

# 3. Obtener alertas
curl http://localhost:3000/api/alerts?limit=5

# 4. Obtener productos
curl http://localhost:3000/api/products?search=tomate&limit=10

# 5. Crear nuevo producto
curl -X POST http://localhost:3000/api/products \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Mozzarella di Bufala",
    "unidad": "unidades",
    "stock_minimo": 5,
    "categoria": "Lácteos",
    "proveedor_principal": "Latticini Campania"
  }'
*/