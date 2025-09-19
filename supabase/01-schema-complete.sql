-- =========================================================
-- SISTEMA-STOCK: SCHEMA COMPLETO UNIFICADO SUPABASE
-- =========================================================
-- Este es el schema DEFINITIVO que consolida todos los SQLs dispersos
-- y añade las tablas faltantes para un sistema completo de stock
-- Versión: v1.0 - Chat 3 (Datos/OCR)
-- =========================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- =========================================================
-- CORE TABLES: Productos, Proveedores, Lotes
-- =========================================================

-- SUPPLIERS: Proveedores
CREATE TABLE IF NOT EXISTS suppliers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  address TEXT,
  tax_id VARCHAR(50),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PRODUCTS: Productos (tabla central - verdad única del stock)
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  unidad TEXT NOT NULL DEFAULT 'kg',
  stock_actual DECIMAL(10,3) DEFAULT 0 NOT NULL,
  stock_minimo DECIMAL(10,3) DEFAULT 0 NOT NULL,
  stock_maximo DECIMAL(10,3),
  categoria TEXT,
  proveedor_principal UUID REFERENCES suppliers(id),
  precio_promedio DECIMAL(10,2),
  brand VARCHAR(255),
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT positive_stock_actual CHECK (stock_actual >= 0),
  CONSTRAINT positive_stock_minimo CHECK (stock_minimo >= 0),
  CONSTRAINT positive_precio CHECK (precio_promedio IS NULL OR precio_promedio >= 0)
);

-- BATCHES: Lotes/caducidades (para alertas internas, no afecta stock global)
CREATE TABLE IF NOT EXISTS batches (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  supplier_id UUID REFERENCES suppliers(id),
  cantidad DECIMAL(10,3) NOT NULL CHECK (cantidad >= 0),
  cantidad_inicial DECIMAL(10,3) NOT NULL CHECK (cantidad_inicial > 0),
  caducidad DATE,
  precio_compra DECIMAL(10,2) CHECK (precio_compra >= 0),
  lote_proveedor TEXT,
  entry_id UUID, -- Referencia a la entrada que lo creó
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- GESTIÓN DE ENTRADAS Y AJUSTES
-- =========================================================

-- ENTRIES: Entradas de mercancía (OCR + Manual)
CREATE TABLE IF NOT EXISTS entries (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  tipo TEXT NOT NULL CHECK (tipo IN ('ocr', 'manual')),
  estado TEXT NOT NULL DEFAULT 'draft' CHECK (estado IN ('draft', 'processing', 'completed', 'error', 'validated')),
  supplier_id UUID REFERENCES suppliers(id),
  proveedor_text TEXT, -- Nombre de proveedor detectado por OCR
  fecha_factura DATE,
  numero_factura VARCHAR(100),
  documento_url TEXT, -- URL en Storage de Supabase
  archivo_nombre TEXT,
  productos JSONB, -- Array de productos detectados/insertados
  ocr_confidence DECIMAL(3,2), -- Confianza del OCR (0-1)
  total_items INTEGER DEFAULT 0,
  total_amount DECIMAL(10,2),
  validated_by UUID, -- Usuario que validó
  validated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STOCK_ADJUSTMENTS: Ajustes de stock (mermas, correcciones, devoluciones)
CREATE TABLE IF NOT EXISTS stock_adjustments (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('merma', 'correccion', 'devolucion', 'inventario')),
  cantidad DECIMAL(10,3) NOT NULL, -- Puede ser negativa
  cantidad_anterior DECIMAL(10,3) NOT NULL,
  motivo TEXT NOT NULL,
  observaciones TEXT,
  batch_id UUID REFERENCES batches(id), -- Si aplica a un lote específico
  usuario TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- SISTEMA B2B: Usuarios, Clientes, Pedidos
-- =========================================================

-- USERS: Usuarios del sistema
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT DEFAULT 'customer' CHECK (role IN ('admin', 'customer', 'manager')),
  last_login TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CUSTOMERS: Clientes B2B
CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  tax_id VARCHAR(50),
  credit_limit DECIMAL(10,2) DEFAULT 0,
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CUSTOMER_DISCOUNTS: Descuentos por cliente
CREATE TABLE IF NOT EXISTS customer_discounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE CASCADE,
  category VARCHAR(100),
  discount_percentage DECIMAL(5,2) NOT NULL CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  discount_amount DECIMAL(10,2), -- Descuento fijo alternativo
  is_active BOOLEAN DEFAULT TRUE,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,
  created_by UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ORDERS: Pedidos
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'prepared', 'delivered', 'cancelled')),
  order_number VARCHAR(50), -- Número de pedido legible
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  total_items INTEGER NOT NULL CHECK (total_items > 0),
  notes TEXT,
  has_backorder BOOLEAN DEFAULT FALSE,
  backorder_items JSONB,
  delivery_date DATE,
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ORDER_ITEMS: Líneas de pedido
CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  product_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
  discount_percentage DECIMAL(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  discount_amount DECIMAL(10,2) DEFAULT 0 CHECK (discount_amount >= 0),
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- SISTEMA DE ALERTAS Y NOTIFICACIONES
-- =========================================================

-- ALERTS: Alertas del sistema
CREATE TABLE IF NOT EXISTS alerts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  type VARCHAR(50) NOT NULL CHECK (type IN ('stock_critical', 'stock_out', 'expiry_warning', 'expiry_critical', 'entry_processed', 'order_backorder')),
  severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  entity_type VARCHAR(50), -- 'product', 'batch', 'order', etc.
  entity_id UUID,
  metadata JSONB, -- Info adicional específica del tipo de alerta
  is_read BOOLEAN DEFAULT FALSE,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- HISTÓRICO Y AUDITORÍA
-- =========================================================

-- CONSUMPTION_HISTORY: Histórico de consumo para forecast
CREATE TABLE IF NOT EXISTS consumption_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity DECIMAL(10,3) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('sale', 'adjustment', 'expiry', 'return')),
  order_id UUID REFERENCES orders(id),
  adjustment_id UUID REFERENCES stock_adjustments(id),
  price DECIMAL(10,2),
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
  period_week INTEGER CHECK (period_week >= 1 AND period_week <= 53),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AUDIT_LOGS: Logs de auditoría
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,
  user_id UUID REFERENCES users(id),
  customer_id UUID REFERENCES customers(id),
  old_values JSONB,
  new_values JSONB,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================
-- ÍNDICES PARA RENDIMIENTO
-- =========================================================

-- Productos
CREATE INDEX IF NOT EXISTS idx_products_stock_status ON products(stock_actual, stock_minimo) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_category ON products(categoria) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(proveedor_principal);
CREATE INDEX IF NOT EXISTS idx_products_search ON products USING gin(to_tsvector('spanish', nombre || ' ' || COALESCE(descripcion, '')));
CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active, created_at);

-- Lotes
CREATE INDEX IF NOT EXISTS idx_batches_product ON batches(product_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry ON batches(caducidad) WHERE cantidad > 0;
CREATE INDEX IF NOT EXISTS idx_batches_supplier ON batches(supplier_id);

-- Entradas
CREATE INDEX IF NOT EXISTS idx_entries_supplier ON entries(supplier_id);
CREATE INDEX IF NOT EXISTS idx_entries_status ON entries(estado, created_at);
CREATE INDEX IF NOT EXISTS idx_entries_fecha ON entries(fecha_factura);
CREATE INDEX IF NOT EXISTS idx_entries_tipo ON entries(tipo);

-- Clientes y descuentos  
CREATE UNIQUE INDEX IF NOT EXISTS idx_customers_user ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customers_approved ON customers(is_approved, created_at);
CREATE INDEX IF NOT EXISTS idx_customer_discounts_customer ON customer_discounts(customer_id, is_active);
CREATE INDEX IF NOT EXISTS idx_customer_discounts_product ON customer_discounts(product_id, is_active);
CREATE INDEX IF NOT EXISTS idx_customer_discounts_category ON customer_discounts(category, is_active);

-- Pedidos
CREATE INDEX IF NOT EXISTS idx_orders_customer ON orders(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_number ON orders(order_number) WHERE order_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_id);

-- Alertas
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type, is_resolved);
CREATE INDEX IF NOT EXISTS idx_alerts_entity ON alerts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_unread ON alerts(is_read, created_at DESC) WHERE is_read = FALSE;

-- Consumo e histórico
CREATE INDEX IF NOT EXISTS idx_consumption_product_period ON consumption_history(product_id, period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_consumption_type ON consumption_history(type, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at DESC);

-- =========================================================
-- COMENTARIOS PARA DOCUMENTACIÓN
-- =========================================================

COMMENT ON TABLE products IS 'Tabla central de productos. stock_actual es la verdad única para B2B';
COMMENT ON TABLE batches IS 'Lotes para control interno de caducidades. NO afecta stock_actual directamente';
COMMENT ON TABLE entries IS 'Entradas de mercancía procesadas por OCR o manual';
COMMENT ON TABLE orders IS 'Pedidos B2B. El trigger de confirmación reserva stock automáticamente';
COMMENT ON TABLE alerts IS 'Sistema de notificaciones para stock crítico, caducidades, etc.';
COMMENT ON TABLE consumption_history IS 'Histórico de movimientos para análisis y forecast';

COMMENT ON COLUMN products.stock_actual IS 'Stock disponible real para venta B2B (verdad única)';
COMMENT ON COLUMN batches.cantidad IS 'Cantidad actual del lote (se reduce con consumo)';
COMMENT ON COLUMN batches.cantidad_inicial IS 'Cantidad original del lote (no cambia)';
COMMENT ON COLUMN entries.productos IS 'Array JSON con productos detectados: [{nombre, cantidad, precio, confianza}]';
COMMENT ON COLUMN orders.has_backorder IS 'TRUE si el pedido tiene productos en espera por falta de stock';