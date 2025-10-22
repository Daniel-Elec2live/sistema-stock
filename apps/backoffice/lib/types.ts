// apps/backoffice/lib/types.ts
export interface Product {
  id: string
  nombre: string
  descripcion?: string
  unidad: string
  stock_actual: number
  stock_minimo: number
  stock_maximo?: number
  categoria: string // Ahora obligatorio
  proveedor: string // Campo simplificado obligatorio
  referencia: string
  precio_promedio?: number
  image_url?: string
  created_at: string
  updated_at: string
}

export interface Batch {
  id: string
  product_id: string
  cantidad: number
  caducidad: string
  precio_compra: number
  created_at: string
}

export interface Entry {
  id: string
  tipo: 'ocr' | 'manual'
  estado: 'procesando' | 'pendiente_validacion' | 'validada' | 'completada' | 'error'
  proveedor?: string
  fecha?: string
  documento_url?: string
  archivo_nombre?: string
  productos?: EntryProduct[]
  confianza?: number
  error_message?: string
  created_at: string
  ocr_completado_at?: string
  validada_at?: string
}

export interface EntryProduct {
  nombre: string
  cantidad: number
  precio: number
  unidad: string
  caducidad?: string
}

export interface StockAdjustment {
  id: string
  product_id: string
  tipo: 'merma' | 'correccion' | 'devolucion' | 'inventario'
  cantidad: number
  motivo: string
  observaciones?: string
  created_at: string
  // Datos del JOIN con products (nombre de la tabla)
  products?: {
    nombre: string
    unidad: string
  }
}

export interface Alert {
  id: string
  tipo: 'stock_bajo' | 'caducidad' | 'precio'
  prioridad: 'alta' | 'media' | 'baja'
  titulo: string
  descripcion: string
  fecha: string
  product_id?: string
  batch_id?: string
  leida?: boolean
}

export interface KPI {
  productos_activos: number
  stock_bajo: number
  caducidades_proximas: number
  valor_stock: number
  entradas_mes: number
  salidas_mes: number
}

// Tipos para componentes UI
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  has_more: boolean
  offset: number
  limit: number
}