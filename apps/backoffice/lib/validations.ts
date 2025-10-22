// apps/backoffice/lib/validations.ts
import { z } from 'zod'

export const productSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido').max(100, 'Nombre muy largo'),
  descripcion: z.string().max(500, 'Descripción muy larga').optional(),
  unidad: z.string().min(1, 'Unidad es requerida'),
  stock_minimo: z.number().min(0, 'Stock mínimo debe ser mayor o igual a 0'),
  stock_maximo: z.number().min(0, 'Stock máximo debe ser mayor o igual a 0').optional(),
  categoria: z.string().min(1, 'Categoría es requerida').max(50, 'Categoría muy larga'),
  proveedor: z.string().min(1, 'Proveedor es requerido').max(100, 'Proveedor muy largo'),
  referencia: z.string().min(1, 'Referencia es requerida').max(20, 'Referencia muy larga'),
  image_url: z.string().url('URL de imagen inválida').or(z.literal('')).optional()
})

export const entryProductSchema = z.object({
  nombre: z.string().min(1, 'Nombre es requerido'),
  cantidad: z.number().min(0.01, 'Cantidad debe ser mayor a 0'),
  precio: z.number().min(0, 'Precio debe ser mayor o igual a 0'),
  unidad: z.string().min(1, 'Unidad es requerida'),
  caducidad: z.string().optional()
})

export const entrySchema = z.object({
  tipo: z.enum(['ocr', 'manual']),
  proveedor: z.string().min(1, 'Proveedor es requerido').optional(),
  fecha: z.string().min(1, 'Fecha es requerida').optional(),
  documento_url: z.string().url('URL inválida').optional(),
  archivo_nombre: z.string().optional(),
  productos: z.array(entryProductSchema).min(1, 'Debe haber al menos un producto').optional()
})

export const stockAdjustmentSchema = z.object({
  product_id: z.string().min(1, 'ID de producto es requerido'),
  tipo: z.enum(['merma', 'ajuste', 'devolucion']),
  cantidad: z.number().min(0.01, 'Cantidad debe ser mayor a 0'),
  motivo: z.string().min(1, 'Motivo es requerido').max(200, 'Motivo muy largo'),
  observaciones: z.string().max(500, 'Observaciones muy largas').optional()
})

export const uploadFileSchema = z.object({
  file: z.any().refine((file) => file instanceof File, 'Debe ser un archivo'),
  maxSize: z.number().default(10 * 1024 * 1024), // 10MB
  allowedTypes: z.array(z.string()).default(['image/jpeg', 'image/png', 'application/pdf'])
})

// Utilidades de validación
export function validateFile(file: File, maxSize = 10 * 1024 * 1024, allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']) {
  const errors: string[] = []
  
  if (!allowedTypes.includes(file.type)) {
    errors.push(`Tipo de archivo no soportado. Permitidos: ${allowedTypes.join(', ')}`)
  }
  
  if (file.size > maxSize) {
    errors.push(`Archivo demasiado grande. Máximo: ${(maxSize / 1024 / 1024).toFixed(1)}MB`)
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}