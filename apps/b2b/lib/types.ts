// Tipos para productos (estructura de DB en español)
export interface Product {
  id: string
  nombre: string
  descripcion?: string
  unidad: string
  stock_actual: number
  stock_minimo: number
  stock_maximo?: number
  categoria: string // Campo obligatorio
  proveedor: string // Campo obligatorio simplificado
  referencia: string
  precio_promedio?: number // Calculado con media ponderada + margen
  brand?: string
  image_url?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Producto con precio aplicando descuento del cliente
export interface ProductWithDiscount extends Product {
  discounted_price: number
  discount_percentage: number
  final_price: number
  // Campos adicionales del nuevo sistema de precios (opcional)
  precio_compra_promedio?: number
  precio_con_margen?: number
  margen_aplicado?: number
}

// Tipos para clientes
export interface Customer {
  id: string
  email: string
  name: string
  company_name?: string
  phone?: string
  address?: string
  is_approved: boolean
  created_at: string
  updated_at: string
}

// Tipos para descuentos
export interface CustomerDiscount {
  id: string
  customer_id: string
  product_id?: string // null = descuento general
  category?: string // descuento por categoría
  discount_percentage: number
  is_active: boolean
  valid_from?: string
  valid_until?: string
  created_at: string
}

// Tipos para carrito
export interface CartItem {
  product_id: string
  product: ProductWithDiscount
  quantity: number
}

export interface Cart {
  items: CartItem[]
  total_items: number
  total_amount: number
}

// Estados de pedido
export type OrderStatus = 'pending' | 'prepared' | 'delivered' | 'cancelled'

// Tipos para pedidos
export interface OrderItem {
  id: string
  order_id: string
  product_id: string
  product_name: string
  quantity: number // DECIMAL en DB, compatible con number en TS
  unit_price: number
  discount_percentage: number
  total_price: number
}

export interface Order {
  id: string
  customer_id: string
  customer?: Customer // Opcional para compatibilidad
  customer_name?: string // Información directa del cliente
  customer_company?: string
  customer_phone?: string
  customer_address?: string
  status: OrderStatus
  total_amount: number
  total_items: number
  items: OrderItem[]
  notes?: string
  has_backorder: boolean
  backorder_items?: BackorderItem[]
  // Timestamps adicionales para tracking
  created_at: string
  updated_at: string
  prepared_at?: string
  delivered_at?: string
  cancelled_at?: string
  cancellation_reason?: string
}

// Tipos para backorders
export interface BackorderItem {
  product_id: string
  product_name: string
  requested_quantity: number
  available_quantity: number
  backorder_quantity: number
}

// Tipos para autenticación
export interface AuthUser {
  id: string
  email: string
  customer?: Customer
}

// Tipos para stock y alertas
export interface StockAlert {
  product_id: string
  product_name: string
  current_stock: number
  min_stock: number
  alert_type: 'low_stock' | 'out_of_stock'
}

// Tipos para API responses
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

// Tipos para filtros
export interface ProductFilters {
  search?: string
  categoria?: string // 'category' en español
  min_precio?: number // 'min_price' en español
  max_precio?: number // 'max_price' en español
  solo_con_stock?: boolean // 'in_stock_only' en español
  ordenar_por?: 'nombre' | 'precio_promedio' | 'stock_actual' // campos en español
  orden?: 'asc' | 'desc'
}