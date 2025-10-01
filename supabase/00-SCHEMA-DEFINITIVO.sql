-- =========================================================
-- SCHEMA DEFINITIVO Y CONSOLIDADO - SISTEMA-STOCK
-- =========================================================
-- Versión: 2.0
-- Fecha: 2025-10-01
-- Descripción: Schema completo consolidando todas las migraciones
-- =========================================================

-- =========================================================
-- PARTE 0: EXTENSIONES Y LIMPIEZA
-- =========================================================

-- Habilitar UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Habilitar búsqueda de texto completo
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Eliminar tablas existentes (ORDEN INVERSO por dependencias)
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS consumption_history CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS order_logs CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS customer_discounts CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS stock_adjustments CASCADE;
DROP TABLE IF EXISTS batches CASCADE;
DROP TABLE IF EXISTS entries CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS settings CASCADE;

-- Eliminar funciones existentes
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS reserve_stock(UUID, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS restore_stock(UUID, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS adjust_stock(UUID, DECIMAL, TEXT, TEXT, TEXT, TEXT) CASCADE;
DROP FUNCTION IF EXISTS generate_order_number() CASCADE;
DROP FUNCTION IF EXISTS calcular_precio_promedio_ponderado(UUID) CASCADE;
DROP FUNCTION IF EXISTS calcular_precio_final(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS generate_stock_alerts() CASCADE;
DROP FUNCTION IF EXISTS generate_expiry_alerts() CASCADE;
DROP FUNCTION IF EXISTS cleanup_old_alerts(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_product_consumption_stats(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_restock_suggestions(INTEGER) CASCADE;
DROP FUNCTION IF EXISTS handle_order_stock_changes() CASCADE;
DROP FUNCTION IF EXISTS check_stock_alerts() CASCADE;
DROP FUNCTION IF EXISTS audit_changes() CASCADE;
DROP FUNCTION IF EXISTS process_validated_entry() CASCADE;
DROP FUNCTION IF EXISTS actualizar_precio_promedio() CASCADE;
DROP FUNCTION IF EXISTS update_paid_at() CASCADE;
DROP FUNCTION IF EXISTS is_approved_customer() CASCADE;
DROP FUNCTION IF EXISTS get_customer_id() CASCADE;
DROP FUNCTION IF EXISTS is_admin() CASCADE;

-- =========================================================
-- PARTE 1: TABLAS CORE (Productos y Stock)
-- =========================================================

-- PRODUCTS: Verdad única del stock
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Información básica
  nombre TEXT NOT NULL,
  descripcion TEXT,
  unidad TEXT NOT NULL DEFAULT 'kg',

  -- Stock (VERDAD ÚNICA)
  stock_actual DECIMAL(10,3) NOT NULL DEFAULT 0,
  stock_minimo DECIMAL(10,3) NOT NULL DEFAULT 0,
  stock_maximo DECIMAL(10,3),

  -- Clasificación
  categoria TEXT NOT NULL DEFAULT 'Otros', -- Obligatorio con default
  proveedor TEXT NOT NULL DEFAULT 'Sin proveedor', -- Obligatorio con default (campo simplificado)
  referencia VARCHAR(50) UNIQUE NOT NULL, -- Autogenerada

  -- Precios
  precio_promedio DECIMAL(10,2), -- Calculado automáticamente (media ponderada)

  -- Adicionales
  brand VARCHAR(255),
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT positive_stock_actual CHECK (stock_actual >= 0),
  CONSTRAINT positive_stock_minimo CHECK (stock_minimo >= 0),
  CONSTRAINT positive_precio CHECK (precio_promedio IS NULL OR precio_promedio >= 0)
);

-- Índices para PRODUCTS
CREATE INDEX idx_products_stock_status ON products(stock_actual, stock_minimo) WHERE is_active = TRUE;
CREATE INDEX idx_products_category ON products(categoria) WHERE is_active = TRUE;
CREATE INDEX idx_products_proveedor ON products(proveedor); -- Nuevo índice para matching
CREATE INDEX idx_products_search ON products USING GIN (to_tsvector('spanish', nombre || ' ' || COALESCE(descripcion, '')));
CREATE INDEX idx_products_active ON products(is_active, created_at DESC);
CREATE UNIQUE INDEX idx_products_referencia_unique ON products(referencia);

COMMENT ON TABLE products IS 'Productos - Verdad única del stock del sistema';
COMMENT ON COLUMN products.stock_actual IS 'Stock global del producto (verdad única)';
COMMENT ON COLUMN products.precio_promedio IS 'Calculado automáticamente con media ponderada de lotes';
COMMENT ON COLUMN products.proveedor IS 'Campo simplificado de texto (no FK)';

-- =========================================================

-- BATCHES: Lotes de productos (control de caducidades y precios)
CREATE TABLE batches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- Cantidades
  cantidad DECIMAL(10,3) NOT NULL DEFAULT 0,
  cantidad_inicial DECIMAL(10,3) NOT NULL,

  -- Información del lote
  caducidad DATE,
  precio_compra DECIMAL(10,2) NOT NULL DEFAULT 0,
  lote_proveedor TEXT,
  entry_id UUID, -- Referencia a la entrada que lo creó (puede ser NULL)

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT positive_cantidad CHECK (cantidad >= 0),
  CONSTRAINT positive_cantidad_inicial CHECK (cantidad_inicial > 0),
  CONSTRAINT positive_precio_compra CHECK (precio_compra >= 0)
);

-- Índices para BATCHES
CREATE INDEX idx_batches_product ON batches(product_id);
CREATE INDEX idx_batches_expiry ON batches(caducidad) WHERE cantidad > 0;
CREATE INDEX idx_batches_entry ON batches(entry_id) WHERE entry_id IS NOT NULL;

COMMENT ON TABLE batches IS 'Lotes de productos para control de caducidades y cálculo de precio promedio';
COMMENT ON COLUMN batches.cantidad IS 'Cantidad actual del lote (se reduce al consumir)';
COMMENT ON COLUMN batches.precio_compra IS 'Precio unitario de compra del lote';

-- =========================================================

-- ENTRIES: Entradas de mercancía
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Tipo y estado
  tipo TEXT NOT NULL CHECK (tipo IN ('ocr', 'manual')),
  estado TEXT NOT NULL DEFAULT 'draft' CHECK (estado IN ('draft', 'processing', 'completed', 'error', 'validated')),

  -- Información de la entrada
  proveedor_text TEXT,
  fecha_factura DATE,
  numero_factura VARCHAR(100),

  -- Documentos
  documento_url TEXT,
  archivo_nombre TEXT,

  -- Productos (JSONB array)
  productos JSONB,
  -- Estructura: [{nombre, cantidad, precio, unidad, caducidad, lote, confianza}]

  -- OCR metadata
  ocr_confidence DECIMAL(3,2),

  -- Totales calculados
  total_items INTEGER DEFAULT 0,
  total_amount DECIMAL(10,2),

  -- Validación
  validated_by UUID,
  validated_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para ENTRIES
CREATE INDEX idx_entries_status ON entries(estado, created_at DESC);
CREATE INDEX idx_entries_fecha ON entries(fecha_factura);
CREATE INDEX idx_entries_tipo ON entries(tipo);
CREATE INDEX idx_entries_validated ON entries(validated_at) WHERE validated_at IS NOT NULL;

COMMENT ON TABLE entries IS 'Entradas de mercancía (OCR automático o manual)';
COMMENT ON COLUMN entries.productos IS 'Array JSON de productos: [{nombre, cantidad, precio, unidad, caducidad, lote, confianza}]';
COMMENT ON COLUMN entries.estado IS 'Flujo: draft → processing → completed/error → validated';

-- =========================================================

-- STOCK_ADJUSTMENTS: Ajustes de stock
CREATE TABLE stock_adjustments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- Tipo de ajuste
  tipo TEXT NOT NULL CHECK (tipo IN ('merma', 'correccion', 'devolucion', 'inventario')),

  -- Cantidades
  cantidad DECIMAL(10,3) NOT NULL, -- Puede ser negativa
  cantidad_anterior DECIMAL(10,3) NOT NULL,

  -- Motivo
  motivo TEXT NOT NULL,
  observaciones TEXT,

  -- Referencias opcionales
  batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
  usuario TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para STOCK_ADJUSTMENTS
CREATE INDEX idx_stock_adjustments_product ON stock_adjustments(product_id, created_at DESC);
CREATE INDEX idx_stock_adjustments_tipo ON stock_adjustments(tipo, created_at DESC);
CREATE INDEX idx_stock_adjustments_batch ON stock_adjustments(batch_id) WHERE batch_id IS NOT NULL;

COMMENT ON TABLE stock_adjustments IS 'Historial de ajustes de stock (mermas, correcciones, devoluciones)';
COMMENT ON COLUMN stock_adjustments.cantidad IS 'Cambio en el stock (positivo o negativo)';

-- =========================================================
-- PARTE 2: TABLAS B2B (Clientes y Pedidos)
-- =========================================================

-- USERS: Usuarios del sistema
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Credenciales
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, -- bcrypt con 12 rounds

  -- Rol y estado
  role TEXT NOT NULL DEFAULT 'customer' CHECK (role IN ('admin', 'customer', 'manager')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- Login tracking
  last_login TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para USERS
CREATE UNIQUE INDEX idx_users_email ON users(LOWER(email));
CREATE INDEX idx_users_role ON users(role) WHERE is_active = TRUE;

COMMENT ON TABLE users IS 'Usuarios del sistema (clientes B2B y administradores)';
COMMENT ON COLUMN users.password_hash IS 'Hash bcrypt con 12 rounds';

-- =========================================================

-- CUSTOMERS: Perfiles de clientes B2B
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Información básica
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  tax_id VARCHAR(50),

  -- Crédito y descuentos
  credit_limit DECIMAL(10,2) DEFAULT 0,
  descuento_general DECIMAL(5,2) DEFAULT 0.00 CHECK (descuento_general >= 0 AND descuento_general <= 100),

  -- Aprobación (CRÍTICO para realizar pedidos)
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ, -- Añadido para tracking de rechazos

  -- Notas internas
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para CUSTOMERS
CREATE UNIQUE INDEX idx_customers_user ON customers(user_id);
CREATE INDEX idx_customers_approved ON customers(is_approved, created_at DESC);
CREATE INDEX idx_customers_email ON customers(LOWER(email));

COMMENT ON TABLE customers IS 'Perfiles de clientes B2B';
COMMENT ON COLUMN customers.is_approved IS 'Solo clientes aprobados pueden crear pedidos (CRÍTICO)';
COMMENT ON COLUMN customers.descuento_general IS 'Descuento general del cliente (porcentaje)';

-- =========================================================

-- CUSTOMER_DISCOUNTS: Descuentos específicos por cliente
CREATE TABLE customer_discounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,

  -- Alcance del descuento (prioridad: producto > categoría > general)
  product_id UUID REFERENCES products(id) ON DELETE CASCADE, -- NULL = descuento general
  category VARCHAR(100),

  -- Descuento
  discount_percentage DECIMAL(5,2) NOT NULL CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  discount_amount DECIMAL(10,2) CHECK (discount_amount >= 0), -- Alternativa a porcentaje

  -- Validez
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ,

  -- Metadata
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para CUSTOMER_DISCOUNTS
CREATE INDEX idx_customer_discounts_customer ON customer_discounts(customer_id, is_active);
CREATE INDEX idx_customer_discounts_product ON customer_discounts(product_id, is_active) WHERE product_id IS NOT NULL;
CREATE INDEX idx_customer_discounts_category ON customer_discounts(category, is_active) WHERE category IS NOT NULL;
CREATE INDEX idx_customer_discounts_validity ON customer_discounts(valid_from, valid_until) WHERE is_active = TRUE;

COMMENT ON TABLE customer_discounts IS 'Descuentos específicos por cliente (producto > categoría > general)';
COMMENT ON COLUMN customer_discounts.product_id IS 'NULL = descuento general o por categoría';

-- =========================================================

-- ORDERS: Pedidos
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,

  -- Estado del pedido
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'prepared', 'delivered', 'cancelled')),
  order_number VARCHAR(50) UNIQUE, -- Generado automáticamente: YYYYMMDD-NNNN

  -- Totales
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  total_items INTEGER NOT NULL CHECK (total_items > 0),

  -- Backorder
  has_backorder BOOLEAN NOT NULL DEFAULT FALSE,
  backorder_items JSONB, -- [{product_id, product_name, requested_quantity, available_quantity, backorder_quantity}]

  -- Información adicional
  notes TEXT,
  delivery_date DATE,

  -- Cancelación
  cancelled_at TIMESTAMPTZ,
  cancellation_reason TEXT,

  -- Estado de pago (añadido en migración 07)
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial', 'overdue')),
  payment_method VARCHAR(50),
  payment_reference VARCHAR(100),
  paid_at TIMESTAMPTZ,

  -- Tracking de reserva de stock (para idempotencia)
  stock_reserved_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para ORDERS
CREATE INDEX idx_orders_customer ON orders(customer_id, status, created_at DESC);
CREATE INDEX idx_orders_status ON orders(status, created_at DESC);
CREATE UNIQUE INDEX idx_orders_number ON orders(order_number) WHERE order_number IS NOT NULL;
CREATE INDEX idx_orders_payment_status ON orders(payment_status, created_at DESC) WHERE payment_status != 'paid';
CREATE INDEX idx_orders_delivery_date ON orders(delivery_date) WHERE delivery_date IS NOT NULL AND status IN ('confirmed', 'prepared');

COMMENT ON TABLE orders IS 'Pedidos de clientes B2B';
COMMENT ON COLUMN orders.status IS 'Flujo: pending → confirmed → prepared → delivered';
COMMENT ON COLUMN orders.stock_reserved_at IS 'Timestamp de cuando se reservó stock (para idempotencia)';
COMMENT ON COLUMN orders.order_number IS 'Generado automáticamente al confirmar: YYYYMMDD-NNNN';

-- =========================================================

-- ORDER_ITEMS: Líneas de pedido
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,

  -- Información del producto (snapshot)
  product_name VARCHAR(255) NOT NULL,

  -- Cantidad y precios
  quantity DECIMAL(10,3) NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),

  -- Descuentos aplicados
  discount_percentage DECIMAL(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  discount_amount DECIMAL(10,2) DEFAULT 0 CHECK (discount_amount >= 0),

  -- Precio total
  total_price DECIMAL(10,2) NOT NULL CHECK (total_price >= 0),

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para ORDER_ITEMS
CREATE INDEX idx_order_items_order ON order_items(order_id);
CREATE INDEX idx_order_items_product ON order_items(product_id, created_at DESC);

COMMENT ON TABLE order_items IS 'Líneas de pedido (snapshot de producto y precios)';
COMMENT ON COLUMN order_items.product_name IS 'Snapshot del nombre (no cambia si se renombra producto)';

-- =========================================================

-- ORDER_LOGS: Logs de acciones en pedidos (tabla faltante)
CREATE TABLE order_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,

  -- Acción realizada
  action VARCHAR(50) NOT NULL,
  details JSONB,

  -- Usuario
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para ORDER_LOGS
CREATE INDEX idx_order_logs_order ON order_logs(order_id, created_at DESC);
CREATE INDEX idx_order_logs_action ON order_logs(action, created_at DESC);

COMMENT ON TABLE order_logs IS 'Registro de acciones sobre pedidos (cancelaciones, cambios de estado, etc.)';

-- =========================================================
-- PARTE 3: TABLAS DE ALERTAS Y AUDITORÍA
-- =========================================================

-- ALERTS: Sistema de alertas
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Tipo y severidad
  type VARCHAR(50) NOT NULL CHECK (type IN ('stock_critical', 'stock_out', 'expiry_warning', 'expiry_critical', 'entry_processed', 'order_backorder')),
  severity VARCHAR(20) NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),

  -- Contenido
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,

  -- Entidad relacionada (polimórfico)
  entity_type VARCHAR(50), -- 'product', 'batch', 'order', etc.
  entity_id UUID,
  metadata JSONB,

  -- Estado
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  is_resolved BOOLEAN NOT NULL DEFAULT FALSE,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,

  -- Expiración
  expires_at TIMESTAMPTZ,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para ALERTS
CREATE INDEX idx_alerts_type ON alerts(type, is_resolved, created_at DESC);
CREATE INDEX idx_alerts_entity ON alerts(entity_type, entity_id) WHERE entity_id IS NOT NULL;
CREATE INDEX idx_alerts_severity ON alerts(severity, created_at DESC);
CREATE INDEX idx_alerts_unread ON alerts(is_read, created_at DESC) WHERE is_read = FALSE;
CREATE INDEX idx_alerts_created_at ON alerts(created_at DESC) WHERE is_resolved = TRUE;

COMMENT ON TABLE alerts IS 'Sistema de alertas (stock, caducidades, backorders)';
COMMENT ON COLUMN alerts.entity_type IS 'Tipo de entidad relacionada (polimórfico)';

-- =========================================================

-- CONSUMPTION_HISTORY: Histórico de consumo
CREATE TABLE consumption_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- Cantidad consumida
  quantity DECIMAL(10,3) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('sale', 'adjustment', 'expiry', 'return')),

  -- Referencias opcionales
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  adjustment_id UUID REFERENCES stock_adjustments(id) ON DELETE SET NULL,

  -- Precio al momento del consumo
  price DECIMAL(10,2),

  -- Períodos (para análisis)
  period_year INTEGER NOT NULL,
  period_month INTEGER NOT NULL CHECK (period_month >= 1 AND period_month <= 12),
  period_week INTEGER CHECK (period_week >= 1 AND period_week <= 53),

  -- Metadata adicional
  metadata JSONB,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para CONSUMPTION_HISTORY
CREATE INDEX idx_consumption_product_period ON consumption_history(product_id, period_year, period_month);
CREATE INDEX idx_consumption_type ON consumption_history(type, created_at DESC);
CREATE INDEX idx_consumption_order ON consumption_history(order_id) WHERE order_id IS NOT NULL;

COMMENT ON TABLE consumption_history IS 'Historial de consumo de productos (ventas, ajustes, caducidades)';
COMMENT ON COLUMN consumption_history.type IS 'Tipo: sale (venta), adjustment (ajuste), expiry (caducidad), return (devolución)';

-- =========================================================

-- AUDIT_LOGS: Logs de auditoría
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Acción
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID,

  -- Usuario y cliente
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

  -- Valores antes/después
  old_values JSONB,
  new_values JSONB,
  details JSONB,

  -- Información de la petición
  ip_address INET,
  user_agent TEXT,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para AUDIT_LOGS
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, created_at DESC) WHERE user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_action ON audit_logs(action, created_at DESC);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);

COMMENT ON TABLE audit_logs IS 'Registro de auditoría de todas las operaciones críticas';

-- =========================================================
-- PARTE 4: TABLA DE CONFIGURACIÓN
-- =========================================================

-- SETTINGS: Configuración general del sistema
CREATE TABLE settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Clave única
  clave TEXT UNIQUE NOT NULL,

  -- Valores (uno o ambos pueden estar poblados)
  valor_numerico DECIMAL(10,4),
  valor_texto TEXT,

  -- Descripción
  descripcion TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para SETTINGS
CREATE UNIQUE INDEX idx_settings_clave ON settings(clave);

COMMENT ON TABLE settings IS 'Configuración general del sistema (márgenes, límites, etc.)';

-- Insertar configuración inicial
INSERT INTO settings (clave, valor_numerico, descripcion) VALUES
  ('margen_general', 30.00, 'Margen aplicado a productos (porcentaje sobre precio de compra)'),
  ('dias_alerta_caducidad', 7, 'Días antes de caducidad para generar alerta'),
  ('auto_approve_customers', 0, 'Auto-aprobar clientes al registrarse (0=no, 1=sí)')
ON CONFLICT (clave) DO NOTHING;

-- =========================================================
-- PARTE 5: FUNCIONES SQL
-- =========================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo actualizar updated_at si NO viene explícitamente en el UPDATE
  IF NEW.updated_at IS NULL OR NEW.updated_at = OLD.updated_at THEN
    NEW.updated_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at_column() IS
  'Actualiza updated_at automáticamente solo si no viene explícitamente en el UPDATE';

-- =========================================================

-- Función para reservar stock (al confirmar pedidos)
CREATE OR REPLACE FUNCTION reserve_stock(
  product_id_param UUID,
  quantity_param DECIMAL
)
RETURNS JSONB AS $$
DECLARE
  current_stock DECIMAL;
  product_name TEXT;
  result JSONB;
BEGIN
  -- Obtener stock actual con bloqueo exclusivo (FOR UPDATE)
  SELECT stock_actual, nombre INTO current_stock, product_name
  FROM products
  WHERE id = product_id_param
  FOR UPDATE;

  -- Verificar si existe el producto
  IF current_stock IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'product_not_found',
      'message', 'Producto no encontrado'
    );
  END IF;

  -- Verificar stock suficiente
  IF current_stock < quantity_param THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'insufficient_stock',
      'message', format('Stock insuficiente. Disponible: %s, Solicitado: %s', current_stock, quantity_param),
      'available_stock', current_stock,
      'requested', quantity_param,
      'product_name', product_name
    );
  END IF;

  -- Reservar stock (decrementar)
  UPDATE products
  SET stock_actual = stock_actual - quantity_param
  WHERE id = product_id_param;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Stock reservado exitosamente',
    'reserved_quantity', quantity_param,
    'new_stock', current_stock - quantity_param,
    'product_name', product_name
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reserve_stock(UUID, DECIMAL) IS
  'Reserva stock al confirmar pedido (con bloqueo FOR UPDATE)';

-- =========================================================

-- Función para reponer stock (al cancelar pedidos)
CREATE OR REPLACE FUNCTION restore_stock(
  product_id_param UUID,
  quantity_param DECIMAL
)
RETURNS JSONB AS $$
DECLARE
  new_stock DECIMAL;
  product_name TEXT;
BEGIN
  -- Actualizar stock con bloqueo
  UPDATE products
  SET stock_actual = stock_actual + quantity_param
  WHERE id = product_id_param
  RETURNING stock_actual, nombre INTO new_stock, product_name;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'product_not_found',
      'message', 'Producto no encontrado'
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Stock repuesto exitosamente',
    'restored_quantity', quantity_param,
    'new_stock', new_stock,
    'product_name', product_name
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION restore_stock(UUID, DECIMAL) IS
  'Repone stock al cancelar pedido';

-- =========================================================

-- Función para ajustar stock (mermas, correcciones, etc.)
CREATE OR REPLACE FUNCTION adjust_stock(
  product_id_param UUID,
  quantity_change DECIMAL,
  adjustment_type TEXT,
  reason TEXT,
  observations TEXT DEFAULT NULL,
  user_name TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  old_stock DECIMAL;
  new_stock DECIMAL;
  product_name TEXT;
BEGIN
  -- Obtener stock actual con bloqueo
  SELECT stock_actual, nombre INTO old_stock, product_name
  FROM products
  WHERE id = product_id_param
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'product_not_found',
      'message', 'Producto no encontrado'
    );
  END IF;

  -- Validar que el ajuste no deje stock negativo
  IF (old_stock + quantity_change) < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'negative_stock',
      'message', format('El ajuste dejaría stock negativo: %s + %s = %s',
                       old_stock, quantity_change, old_stock + quantity_change)
    );
  END IF;

  -- Registrar ajuste en stock_adjustments
  INSERT INTO stock_adjustments (
    product_id, tipo, cantidad, cantidad_anterior, motivo, observaciones, usuario
  ) VALUES (
    product_id_param, adjustment_type, quantity_change, old_stock, reason, observations, user_name
  );

  -- Actualizar stock
  UPDATE products
  SET stock_actual = stock_actual + quantity_change
  WHERE id = product_id_param
  RETURNING stock_actual INTO new_stock;

  -- Si es reducción de stock, registrar en consumption_history
  IF quantity_change < 0 THEN
    INSERT INTO consumption_history (
      product_id, quantity, type, period_year, period_month, period_week
    ) VALUES (
      product_id_param,
      ABS(quantity_change),
      'adjustment',
      EXTRACT(YEAR FROM NOW()),
      EXTRACT(MONTH FROM NOW()),
      EXTRACT(WEEK FROM NOW())
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Stock ajustado exitosamente',
    'old_stock', old_stock,
    'quantity_change', quantity_change,
    'new_stock', new_stock,
    'product_name', product_name
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION adjust_stock IS
  'Ajusta stock por mermas, correcciones, devoluciones o inventario';

-- =========================================================

-- Función para generar número de pedido único
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  date_prefix TEXT;
  sequence_num INTEGER;
  new_order_number TEXT;
BEGIN
  -- Formato: YYYYMMDD-NNNN
  date_prefix := TO_CHAR(NOW(), 'YYYYMMDD');

  -- Obtener el siguiente número de secuencia para hoy
  SELECT COALESCE(MAX(
    CASE
      WHEN order_number ~ ('^' || date_prefix || '-[0-9]{4}$')
      THEN CAST(SUBSTRING(order_number FROM '\d{4}$') AS INTEGER)
      ELSE 0
    END
  ), 0) + 1
  INTO sequence_num
  FROM orders
  WHERE order_number LIKE date_prefix || '-%';

  -- Formatear número con padding de ceros
  new_order_number := date_prefix || '-' || LPAD(sequence_num::TEXT, 4, '0');

  RETURN new_order_number;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_order_number() IS
  'Genera número de pedido único: YYYYMMDD-NNNN';

-- =========================================================

-- Función para calcular precio promedio ponderado de lotes
CREATE OR REPLACE FUNCTION calcular_precio_promedio_ponderado(
  producto_id UUID
)
RETURNS DECIMAL(10,4) AS $$
DECLARE
  precio_ponderado DECIMAL(10,4);
BEGIN
  -- Media ponderada: Σ(precio_compra * cantidad) / Σ(cantidad)
  SELECT
    COALESCE(
      SUM(precio_compra * cantidad) / NULLIF(SUM(cantidad), 0),
      0
    )
  INTO precio_ponderado
  FROM batches
  WHERE product_id = producto_id
    AND cantidad > 0;

  RETURN COALESCE(precio_ponderado, 0);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calcular_precio_promedio_ponderado(UUID) IS
  'Calcula precio promedio ponderado: Σ(precio_compra * cantidad) / Σ(cantidad)';

-- =========================================================

-- Función para calcular precio final con margen y descuento
CREATE OR REPLACE FUNCTION calcular_precio_final(
  producto_id UUID,
  cliente_id UUID DEFAULT NULL
)
RETURNS TABLE (
  precio_compra_promedio DECIMAL(10,2),
  precio_con_margen DECIMAL(10,2),
  precio_final DECIMAL(10,2),
  margen_aplicado DECIMAL(5,2),
  descuento_aplicado DECIMAL(5,2)
) AS $$
DECLARE
  precio_base DECIMAL(10,2);
  margen DECIMAL(5,2);
  descuento DECIMAL(5,2) := 0;
  categoria_producto TEXT;
BEGIN
  -- Obtener precio promedio y categoría del producto
  SELECT p.precio_promedio, p.categoria
  INTO precio_base, categoria_producto
  FROM products p
  WHERE p.id = producto_id;

  IF precio_base IS NULL THEN
    precio_base := 0;
  END IF;

  -- Obtener margen general de settings
  SELECT valor_numerico INTO margen
  FROM settings WHERE clave = 'margen_general';

  IF margen IS NULL THEN
    margen := 30.00; -- Default 30%
  END IF;

  -- Obtener descuento del cliente con PRIORIDAD
  -- 1. Descuento específico de producto
  -- 2. Descuento por categoría
  -- 3. Descuento general
  IF cliente_id IS NOT NULL THEN
    SELECT discount_percentage INTO descuento
    FROM customer_discounts
    WHERE customer_id = cliente_id
      AND is_active = TRUE
      AND (valid_until IS NULL OR valid_until >= NOW())
      AND (
        -- Prioridad 1: Descuento específico de producto
        (product_id = producto_id) OR
        -- Prioridad 2: Descuento por categoría
        (category = categoria_producto AND product_id IS NULL) OR
        -- Prioridad 3: Descuento general
        (product_id IS NULL AND category IS NULL)
      )
    ORDER BY
      CASE
        WHEN product_id = producto_id THEN 1
        WHEN category = categoria_producto AND product_id IS NULL THEN 2
        WHEN product_id IS NULL AND category IS NULL THEN 3
        ELSE 4
      END
    LIMIT 1;
  END IF;

  IF descuento IS NULL THEN
    descuento := 0;
  END IF;

  -- Calcular precios
  RETURN QUERY SELECT
    precio_base AS precio_compra_promedio,
    ROUND(precio_base * (1 + margen / 100), 2) AS precio_con_margen,
    ROUND(precio_base * (1 + margen / 100) * (1 - descuento / 100), 2) AS precio_final,
    margen AS margen_aplicado,
    descuento AS descuento_aplicado;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calcular_precio_final(UUID, UUID) IS
  'Calcula precio final: (precio_compra * (1 + margen)) * (1 - descuento). Respeta prioridad de descuentos: producto > categoría > general';

-- =========================================================

-- Función para generar alertas de stock crítico
CREATE OR REPLACE FUNCTION generate_stock_alerts()
RETURNS INTEGER AS $$
DECLARE
  alert_count INTEGER := 0;
  product_record RECORD;
BEGIN
  FOR product_record IN
    SELECT id, nombre, stock_actual, stock_minimo
    FROM products
    WHERE is_active = TRUE
      AND stock_actual <= stock_minimo
  LOOP
    INSERT INTO alerts (
      type, severity, title, message, entity_type, entity_id, metadata
    )
    VALUES (
      CASE WHEN product_record.stock_actual = 0 THEN 'stock_out' ELSE 'stock_critical' END,
      CASE WHEN product_record.stock_actual = 0 THEN 'critical' ELSE 'high' END,
      CASE WHEN product_record.stock_actual = 0 THEN 'Sin stock' ELSE 'Stock crítico' END,
      product_record.nombre || ' - Stock: ' || product_record.stock_actual || ' (Mínimo: ' || product_record.stock_minimo || ')',
      'product',
      product_record.id,
      jsonb_build_object(
        'stock_actual', product_record.stock_actual,
        'stock_minimo', product_record.stock_minimo
      )
    )
    ON CONFLICT DO NOTHING;

    alert_count := alert_count + 1;
  END LOOP;

  RETURN alert_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_stock_alerts() IS
  'Genera alertas para productos con stock crítico o agotado';

-- =========================================================

-- Función para generar alertas de caducidad
CREATE OR REPLACE FUNCTION generate_expiry_alerts()
RETURNS INTEGER AS $$
DECLARE
  alert_count INTEGER := 0;
  batch_record RECORD;
  dias_alerta INTEGER;
  severity_level TEXT;
BEGIN
  -- Obtener días de alerta de configuración
  SELECT valor_numerico INTO dias_alerta
  FROM settings WHERE clave = 'dias_alerta_caducidad';

  IF dias_alerta IS NULL THEN
    dias_alerta := 7; -- Default 7 días
  END IF;

  FOR batch_record IN
    SELECT b.id, b.product_id, b.cantidad, b.caducidad, p.nombre
    FROM batches b
    JOIN products p ON p.id = b.product_id
    WHERE b.cantidad > 0
      AND b.caducidad IS NOT NULL
      AND b.caducidad <= CURRENT_DATE + (dias_alerta || ' days')::INTERVAL
      AND b.caducidad >= CURRENT_DATE
  LOOP
    -- Determinar severidad según días restantes
    severity_level := CASE
      WHEN batch_record.caducidad <= CURRENT_DATE + INTERVAL '2 days' THEN 'critical'
      WHEN batch_record.caducidad <= CURRENT_DATE + INTERVAL '4 days' THEN 'high'
      ELSE 'medium'
    END;

    INSERT INTO alerts (
      type, severity, title, message, entity_type, entity_id, metadata
    )
    VALUES (
      CASE WHEN severity_level = 'critical' THEN 'expiry_critical' ELSE 'expiry_warning' END,
      severity_level,
      'Producto próximo a caducar',
      batch_record.nombre || ' - Caduca: ' || TO_CHAR(batch_record.caducidad, 'DD/MM/YYYY') || ' (Cantidad: ' || batch_record.cantidad || ')',
      'batch',
      batch_record.id,
      jsonb_build_object(
        'product_id', batch_record.product_id,
        'caducidad', batch_record.caducidad,
        'cantidad', batch_record.cantidad,
        'dias_restantes', batch_record.caducidad - CURRENT_DATE
      )
    )
    ON CONFLICT DO NOTHING;

    alert_count := alert_count + 1;
  END LOOP;

  RETURN alert_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_expiry_alerts() IS
  'Genera alertas para lotes que caducan pronto';

-- =========================================================

-- Función para limpiar alertas antiguas
CREATE OR REPLACE FUNCTION cleanup_old_alerts(
  days_old INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM alerts
  WHERE is_resolved = TRUE
    AND resolved_at < NOW() - (days_old || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_alerts(INTEGER) IS
  'Elimina alertas resueltas con más de N días de antigüedad';

-- =========================================================

-- Función para obtener estadísticas de consumo
CREATE OR REPLACE FUNCTION get_product_consumption_stats(
  product_id_param UUID,
  months_back INTEGER DEFAULT 3
)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
  total_consumed DECIMAL;
  avg_monthly DECIMAL;
  avg_weekly DECIMAL;
BEGIN
  SELECT
    SUM(quantity),
    AVG(monthly_consumption),
    AVG(weekly_consumption)
  INTO total_consumed, avg_monthly, avg_weekly
  FROM (
    SELECT
      SUM(quantity) FILTER (WHERE period_year = EXTRACT(YEAR FROM NOW()) AND period_month = EXTRACT(MONTH FROM NOW())) AS monthly_consumption,
      SUM(quantity) FILTER (WHERE period_year = EXTRACT(YEAR FROM NOW()) AND period_week = EXTRACT(WEEK FROM NOW())) AS weekly_consumption,
      quantity
    FROM consumption_history
    WHERE product_id = product_id_param
      AND created_at >= NOW() - (months_back || ' months')::INTERVAL
      AND type = 'sale'
    GROUP BY quantity
  ) subquery;

  stats := jsonb_build_object(
    'total_consumed', COALESCE(total_consumed, 0),
    'avg_monthly_consumption', COALESCE(avg_monthly, 0),
    'avg_weekly_consumption', COALESCE(avg_weekly, 0),
    'analysis_period_months', months_back
  );

  RETURN stats;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_product_consumption_stats(UUID, INTEGER) IS
  'Obtiene estadísticas de consumo de un producto';

-- =========================================================

-- Función para obtener sugerencias de reposición
CREATE OR REPLACE FUNCTION get_restock_suggestions(
  limit_results INTEGER DEFAULT 10
)
RETURNS TABLE (
  product_id UUID,
  product_name TEXT,
  current_stock DECIMAL,
  minimum_stock DECIMAL,
  avg_monthly_consumption DECIMAL,
  days_until_stockout INTEGER,
  suggested_order_quantity DECIMAL,
  priority_score INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.nombre,
    p.stock_actual,
    p.stock_minimo,
    COALESCE((
      SELECT AVG(monthly_sum)
      FROM (
        SELECT SUM(ch.quantity) AS monthly_sum
        FROM consumption_history ch
        WHERE ch.product_id = p.id
          AND ch.type = 'sale'
          AND ch.created_at >= NOW() - INTERVAL '3 months'
        GROUP BY ch.period_year, ch.period_month
      ) monthly_totals
    ), 0) AS avg_monthly,
    CASE
      WHEN COALESCE((
        SELECT AVG(monthly_sum)
        FROM (
          SELECT SUM(ch.quantity) AS monthly_sum
          FROM consumption_history ch
          WHERE ch.product_id = p.id
            AND ch.type = 'sale'
            AND ch.created_at >= NOW() - INTERVAL '3 months'
          GROUP BY ch.period_year, ch.period_month
        ) monthly_totals
      ), 0) > 0
      THEN CAST((p.stock_actual / (COALESCE((
        SELECT AVG(monthly_sum)
        FROM (
          SELECT SUM(ch.quantity) AS monthly_sum
          FROM consumption_history ch
          WHERE ch.product_id = p.id
            AND ch.type = 'sale'
            AND ch.created_at >= NOW() - INTERVAL '3 months'
          GROUP BY ch.period_year, ch.period_month
        ) monthly_totals
      ), 0) / 30)) AS INTEGER)
      ELSE 999
    END AS days_stockout,
    GREATEST(
      p.stock_minimo - p.stock_actual,
      COALESCE((
        SELECT AVG(monthly_sum)
        FROM (
          SELECT SUM(ch.quantity) AS monthly_sum
          FROM consumption_history ch
          WHERE ch.product_id = p.id
            AND ch.type = 'sale'
            AND ch.created_at >= NOW() - INTERVAL '3 months'
          GROUP BY ch.period_year, ch.period_month
        ) monthly_totals
      ), 0)
    ) AS suggested_qty,
    CASE
      WHEN p.stock_actual = 0 THEN 100
      WHEN p.stock_actual <= (p.stock_minimo * 0.5) THEN 90
      WHEN p.stock_actual <= p.stock_minimo THEN 70
      ELSE 50
    END AS priority
  FROM products p
  WHERE p.is_active = TRUE
    AND p.stock_actual <= p.stock_minimo
  ORDER BY priority DESC, days_stockout ASC
  LIMIT limit_results;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_restock_suggestions(INTEGER) IS
  'Obtiene sugerencias de reposición basadas en consumo histórico';

-- =========================================================

-- Función para RLS: verificar si es cliente aprobado
CREATE OR REPLACE FUNCTION is_approved_customer()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM customers
    WHERE user_id = auth.uid()
      AND is_approved = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_approved_customer() IS
  'Verifica si el usuario autenticado es un cliente aprobado';

-- =========================================================

-- Función para RLS: obtener customer_id del usuario autenticado
CREATE OR REPLACE FUNCTION get_customer_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT id FROM customers
    WHERE user_id = auth.uid()
    LIMIT 1
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_customer_id() IS
  'Obtiene el UUID del cliente asociado al usuario autenticado';

-- =========================================================

-- Función para RLS: verificar si es administrador
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()
      AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_admin() IS
  'Verifica si el usuario autenticado es administrador';

-- =========================================================
-- PARTE 6: TRIGGERS
-- =========================================================

-- Triggers para updated_at automático
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_entries_updated_at
  BEFORE UPDATE ON entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_discounts_updated_at
  BEFORE UPDATE ON customer_discounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
  BEFORE UPDATE ON settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================

-- Trigger para gestión de stock en pedidos
CREATE OR REPLACE FUNCTION handle_order_stock_changes()
RETURNS TRIGGER AS $$
DECLARE
  item_record RECORD;
  reserve_result JSONB;
  restore_result JSONB;
BEGIN
  -- INSERT: No hacer nada (stock se reserva al confirmar)
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- UPDATE
  IF TG_OP = 'UPDATE' THEN
    -- Confirmar pedido: pending → confirmed (con idempotencia)
    IF OLD.status = 'pending' AND NEW.status = 'confirmed' AND NEW.stock_reserved_at IS NULL THEN
      FOR item_record IN
        SELECT product_id, quantity
        FROM order_items
        WHERE order_id = NEW.id
      LOOP
        -- Reservar stock
        SELECT reserve_stock(item_record.product_id, item_record.quantity) INTO reserve_result;

        -- Si falla, cancelar pedido y generar alerta
        IF NOT (reserve_result->>'success')::BOOLEAN THEN
          NEW.status := 'cancelled';
          NEW.cancellation_reason := 'Stock insuficiente: ' || (reserve_result->>'message');
          NEW.cancelled_at := NOW();

          INSERT INTO alerts (type, severity, title, message, entity_type, entity_id, metadata)
          VALUES (
            'order_backorder', 'high', 'Pedido cancelado por stock',
            'Pedido ' || COALESCE(NEW.order_number, NEW.id::TEXT) || ' cancelado: ' || (reserve_result->>'message'),
            'order', NEW.id,
            jsonb_build_object('reason', 'insufficient_stock', 'details', reserve_result)
          );

          RETURN NEW;
        END IF;

        -- Registrar consumo
        INSERT INTO consumption_history (
          product_id, quantity, type, order_id,
          period_year, period_month, period_week
        ) VALUES (
          item_record.product_id, item_record.quantity, 'sale', NEW.id,
          EXTRACT(YEAR FROM NOW()), EXTRACT(MONTH FROM NOW()), EXTRACT(WEEK FROM NOW())
        );
      END LOOP;

      -- Marcar como reservado (idempotencia)
      NEW.stock_reserved_at := NOW();

      -- Asignar order_number si no lo tiene
      IF NEW.order_number IS NULL THEN
        NEW.order_number := generate_order_number();
      END IF;

    -- Cancelar pedido confirmado: reponer stock
    ELSIF OLD.status IN ('confirmed', 'prepared') AND NEW.status = 'cancelled' THEN
      FOR item_record IN
        SELECT product_id, quantity
        FROM order_items
        WHERE order_id = NEW.id
      LOOP
        PERFORM restore_stock(item_record.product_id, item_record.quantity);

        DELETE FROM consumption_history
        WHERE order_id = NEW.id AND product_id = item_record.product_id;
      END LOOP;
    END IF;

    RETURN NEW;
  END IF;

  -- DELETE (raro): reponer stock si estaba confirmado
  IF TG_OP = 'DELETE' THEN
    IF OLD.status IN ('confirmed', 'prepared') THEN
      FOR item_record IN
        SELECT product_id, quantity
        FROM order_items
        WHERE order_id = OLD.id
      LOOP
        PERFORM restore_stock(item_record.product_id, item_record.quantity);
        DELETE FROM consumption_history WHERE order_id = OLD.id;
      END LOOP;
    END IF;

    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_order_stock_trigger
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION handle_order_stock_changes();

COMMENT ON FUNCTION handle_order_stock_changes() IS
  'Gestiona reserva/reposición de stock automáticamente al cambiar estado de pedidos (con idempotencia)';

-- =========================================================

-- Trigger para alertas de stock
CREATE OR REPLACE FUNCTION check_stock_alerts()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.stock_actual != NEW.stock_actual THEN
    -- Stock crítico o agotado
    IF NEW.stock_actual <= NEW.stock_minimo AND NEW.is_active = TRUE THEN
      INSERT INTO alerts (type, severity, title, message, entity_type, entity_id, metadata)
      VALUES (
        CASE WHEN NEW.stock_actual = 0 THEN 'stock_out' ELSE 'stock_critical' END,
        CASE WHEN NEW.stock_actual = 0 THEN 'critical' ELSE 'high' END,
        CASE WHEN NEW.stock_actual = 0 THEN 'Sin stock' ELSE 'Stock crítico' END,
        NEW.nombre || ' - Stock: ' || NEW.stock_actual || ' (Mínimo: ' || NEW.stock_minimo || ')',
        'product',
        NEW.id,
        jsonb_build_object(
          'stock_actual', NEW.stock_actual,
          'stock_anterior', OLD.stock_actual,
          'stock_minimo', NEW.stock_minimo,
          'cambio', NEW.stock_actual - OLD.stock_actual
        )
      )
      ON CONFLICT DO NOTHING;
    END IF;

    -- Resolver alertas si stock vuelve a niveles normales
    IF NEW.stock_actual > NEW.stock_minimo AND OLD.stock_actual <= OLD.stock_minimo THEN
      UPDATE alerts SET
        is_resolved = TRUE,
        resolved_at = NOW()
      WHERE entity_type = 'product'
        AND entity_id = NEW.id
        AND type IN ('stock_critical', 'stock_out')
        AND is_resolved = FALSE;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_stock_alerts_trigger
  AFTER UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION check_stock_alerts();

COMMENT ON FUNCTION check_stock_alerts() IS
  'Genera y resuelve alertas automáticamente al cambiar stock_actual';

-- =========================================================

-- Trigger para auditoría
CREATE OR REPLACE FUNCTION audit_changes()
RETURNS TRIGGER AS $$
DECLARE
  user_id_val UUID;
  old_values JSONB;
  new_values JSONB;
BEGIN
  -- Intentar obtener user_id del contexto JWT
  BEGIN
    user_id_val := COALESCE(
      current_setting('request.jwt.claims', true)::json->>'sub'
    )::UUID;
  EXCEPTION WHEN OTHERS THEN
    user_id_val := NULL;
  END;

  -- Preparar valores
  IF TG_OP = 'DELETE' THEN
    old_values := to_jsonb(OLD);
    new_values := NULL;
  ELSE
    old_values := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END;
    new_values := to_jsonb(NEW);
  END IF;

  -- Insertar log
  INSERT INTO audit_logs (
    action, entity_type, entity_id, user_id, old_values, new_values
  ) VALUES (
    TG_OP,
    TG_TABLE_NAME,
    COALESCE((new_values->>'id')::UUID, (old_values->>'id')::UUID),
    user_id_val,
    old_values,
    new_values
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Aplicar auditoría a tablas críticas
CREATE TRIGGER audit_products_changes
  AFTER INSERT OR UPDATE OR DELETE ON products
  FOR EACH ROW EXECUTE FUNCTION audit_changes();

CREATE TRIGGER audit_orders_changes
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION audit_changes();

CREATE TRIGGER audit_stock_adjustments_changes
  AFTER INSERT OR UPDATE OR DELETE ON stock_adjustments
  FOR EACH ROW EXECUTE FUNCTION audit_changes();

CREATE TRIGGER audit_customers_changes
  AFTER INSERT OR UPDATE OR DELETE ON customers
  FOR EACH ROW EXECUTE FUNCTION audit_changes();

COMMENT ON FUNCTION audit_changes() IS
  'Registra automáticamente cambios en tablas críticas en audit_logs';

-- =========================================================

-- Trigger para procesar entradas validadas
CREATE OR REPLACE FUNCTION process_validated_entry()
RETURNS TRIGGER AS $$
DECLARE
  producto_item JSONB;
  product_id_found UUID;
  batch_id_created UUID;
BEGIN
  -- Solo procesar al validar: draft/processing → validated
  IF TG_OP = 'UPDATE' AND OLD.estado != 'validated' AND NEW.estado = 'validated' THEN
    -- Procesar cada producto del array
    FOR producto_item IN SELECT * FROM jsonb_array_elements(NEW.productos)
    LOOP
      -- Buscar producto por nombre (case insensitive)
      SELECT id INTO product_id_found
      FROM products
      WHERE LOWER(nombre) = LOWER(producto_item->>'nombre')
      LIMIT 1;

      -- Crear producto si no existe
      IF product_id_found IS NULL THEN
        INSERT INTO products (
          nombre,
          unidad,
          categoria,
          proveedor,
          is_active,
          referencia
        ) VALUES (
          producto_item->>'nombre',
          COALESCE(producto_item->>'unidad', 'kg'),
          COALESCE(producto_item->>'categoria', 'Otros'),
          COALESCE(NEW.proveedor_text, 'Sin proveedor'),
          TRUE,
          -- Generar referencia automática
          CONCAT(
            UPPER(SUBSTRING(COALESCE(NEW.proveedor_text, 'XXX') FROM 1 FOR 3)),
            '25',
            LPAD((EXTRACT(EPOCH FROM NOW())::BIGINT % 1000)::TEXT, 3, '0')
          )
        ) RETURNING id INTO product_id_found;
      END IF;

      -- Crear lote
      INSERT INTO batches (
        product_id,
        cantidad,
        cantidad_inicial,
        caducidad,
        precio_compra,
        lote_proveedor,
        entry_id
      ) VALUES (
        product_id_found,
        (producto_item->>'cantidad')::DECIMAL,
        (producto_item->>'cantidad')::DECIMAL,
        CASE
          WHEN producto_item->>'caducidad' IS NOT NULL
          THEN (producto_item->>'caducidad')::DATE
          ELSE NULL
        END,
        COALESCE((producto_item->>'precio')::DECIMAL, 0),
        producto_item->>'lote',
        NEW.id
      ) RETURNING id INTO batch_id_created;

      -- Incrementar stock global
      UPDATE products
      SET stock_actual = stock_actual + (producto_item->>'cantidad')::DECIMAL
      WHERE id = product_id_found;

      -- El precio_promedio se actualizará automáticamente por trigger de batches
    END LOOP;

    -- Actualizar totales de la entrada
    NEW.total_items := jsonb_array_length(NEW.productos);
    NEW.total_amount := (
      SELECT SUM((item->>'cantidad')::DECIMAL * COALESCE((item->>'precio')::DECIMAL, 0))
      FROM jsonb_array_elements(NEW.productos) item
    );

    -- Generar alerta
    INSERT INTO alerts (type, severity, title, message, entity_type, entity_id, metadata)
    VALUES (
      'entry_processed', 'low', 'Entrada procesada',
      'Entrada ' || COALESCE(NEW.numero_factura, NEW.id::TEXT) || ' de ' ||
      COALESCE(NEW.proveedor_text, 'proveedor desconocido') || ' procesada correctamente',
      'entry', NEW.id,
      jsonb_build_object('total_items', jsonb_array_length(NEW.productos))
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER process_validated_entry_trigger
  AFTER UPDATE ON entries
  FOR EACH ROW EXECUTE FUNCTION process_validated_entry();

COMMENT ON FUNCTION process_validated_entry() IS
  'Procesa entrada validada: crea productos/lotes, incrementa stock, actualiza precio promedio';

-- =========================================================

-- Trigger para actualizar precio promedio al cambiar batches
CREATE OR REPLACE FUNCTION actualizar_precio_promedio()
RETURNS TRIGGER AS $$
DECLARE
  nuevo_precio DECIMAL(10,4);
BEGIN
  -- Calcular nuevo precio promedio ponderado
  nuevo_precio := calcular_precio_promedio_ponderado(
    COALESCE(NEW.product_id, OLD.product_id)
  );

  -- Actualizar producto
  UPDATE products
  SET precio_promedio = ROUND(nuevo_precio, 2)
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_precio_insert
  AFTER INSERT ON batches
  FOR EACH ROW EXECUTE FUNCTION actualizar_precio_promedio();

CREATE TRIGGER trigger_actualizar_precio_update
  AFTER UPDATE OF cantidad, precio_compra ON batches
  FOR EACH ROW EXECUTE FUNCTION actualizar_precio_promedio();

CREATE TRIGGER trigger_actualizar_precio_delete
  AFTER DELETE ON batches
  FOR EACH ROW EXECUTE FUNCTION actualizar_precio_promedio();

COMMENT ON FUNCTION actualizar_precio_promedio() IS
  'Recalcula precio_promedio automáticamente al cambiar batches';

-- =========================================================

-- Trigger para actualizar paid_at al cambiar payment_status
CREATE OR REPLACE FUNCTION update_paid_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
    NEW.paid_at := NOW();
  ELSIF NEW.payment_status != 'paid' AND OLD.payment_status = 'paid' THEN
    NEW.paid_at := NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_paid_at
  BEFORE UPDATE OF payment_status ON orders
  FOR EACH ROW EXECUTE FUNCTION update_paid_at();

COMMENT ON FUNCTION update_paid_at() IS
  'Actualiza paid_at automáticamente al cambiar payment_status a/desde paid';

-- =========================================================
-- PARTE 7: ROW LEVEL SECURITY (RLS)
-- =========================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumption_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- POLÍTICAS PARA SERVICE ROLE (Backoffice)
-- =========================================================

-- Service role tiene acceso completo a TODO
CREATE POLICY "Service role full access products" ON products
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access batches" ON batches
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access entries" ON entries
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access adjustments" ON stock_adjustments
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access users" ON users
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access customers" ON customers
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access discounts" ON customer_discounts
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access orders" ON orders
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access order_items" ON order_items
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access order_logs" ON order_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access alerts" ON alerts
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access consumption" ON consumption_history
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access audit" ON audit_logs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access settings" ON settings
  FOR ALL USING (auth.role() = 'service_role');

-- =========================================================
-- POLÍTICAS PARA CLIENTES B2B (Authenticated)
-- =========================================================

-- Products: Solo lectura de productos activos
CREATE POLICY "B2B customers read products" ON products
  FOR SELECT USING (
    auth.role() = 'authenticated' AND is_active = TRUE
  );

-- Users: Solo su propio perfil
CREATE POLICY "Users own profile" ON users
  FOR ALL USING (
    auth.uid() = id OR auth.role() = 'service_role'
  );

-- Customers: Solo su propio perfil
CREATE POLICY "Customers own data" ON customers
  FOR ALL USING (
    auth.uid() = user_id OR auth.role() = 'service_role'
  );

-- Customer Discounts: Solo sus propios descuentos (lectura)
CREATE POLICY "Customer discounts read own" ON customer_discounts
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    ) OR auth.role() = 'service_role'
  );

-- Orders: Solo sus propios pedidos
CREATE POLICY "Customers own orders" ON orders
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    ) OR auth.role() = 'service_role'
  );

-- Orders: Crear pedidos (solo clientes aprobados)
CREATE POLICY "Customers create orders" ON orders
  FOR INSERT WITH CHECK (
    customer_id IN (
      SELECT id FROM customers
      WHERE user_id = auth.uid() AND is_approved = TRUE
    ) OR auth.role() = 'service_role'
  );

-- Orders: Actualizar sus propios pedidos (cancelar)
CREATE POLICY "Customers update own orders" ON orders
  FOR UPDATE USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    ) OR auth.role() = 'service_role'
  );

-- Order Items: Solo items de sus pedidos
CREATE POLICY "Customers own order items" ON order_items
  FOR SELECT USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN customers c ON c.id = o.customer_id
      WHERE c.user_id = auth.uid()
    ) OR auth.role() = 'service_role'
  );

-- Settings: Solo lectura para todos
CREATE POLICY "Public read settings" ON settings
  FOR SELECT USING (TRUE);

-- =========================================================
-- FIN DEL SCHEMA
-- =========================================================

-- Mensaje de confirmación
DO $$
BEGIN
  RAISE NOTICE '✅ Schema DEFINITIVO creado exitosamente';
  RAISE NOTICE '📊 Tablas: 14 (products, batches, entries, stock_adjustments, users, customers, customer_discounts, orders, order_items, order_logs, alerts, consumption_history, audit_logs, settings)';
  RAISE NOTICE '⚙️ Funciones: 16';
  RAISE NOTICE '🔧 Triggers: 24';
  RAISE NOTICE '🔒 Políticas RLS: 22';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ IMPORTANTE: Este script ELIMINA todas las tablas existentes';
  RAISE NOTICE '⚠️ Solo ejecutar en base de datos NUEVA o para reset completo';
END $$;
