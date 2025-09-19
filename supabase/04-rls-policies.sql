-- =========================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =========================================================
-- Políticas de seguridad para separar acceso B2B y Backoffice
-- =========================================================

-- =========================================================
-- HABILITAR RLS EN TODAS LAS TABLAS
-- =========================================================

ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumption_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =========================================================
-- LIMPIAR POLÍTICAS EXISTENTES (para evitar conflictos)
-- =========================================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Allow all for authenticated users" ON products;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON batches;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON entries;
DROP POLICY IF EXISTS "Allow all for authenticated users" ON stock_adjustments;
DROP POLICY IF EXISTS customers_own_data ON customers;
DROP POLICY IF EXISTS orders_own_data ON orders;
DROP POLICY IF EXISTS order_items_own_data ON order_items;
DROP POLICY IF EXISTS customer_discounts_own_data ON customer_discounts;

-- =========================================================
-- POLÍTICAS PARA BACKOFFICE (SERVICE ROLE)
-- =========================================================
-- El Backoffice usa SUPABASE_SERVICE_ROLE_KEY y tiene acceso completo

-- Suppliers - Solo Backoffice puede gestionar
CREATE POLICY "Service role full access suppliers" ON suppliers
  FOR ALL USING (auth.role() = 'service_role');

-- Products - Service role acceso completo, clientes B2B solo lectura
CREATE POLICY "Service role full access products" ON products
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "B2B customers read products" ON products
  FOR SELECT USING (
    auth.role() = 'authenticated' AND is_active = TRUE
  );

-- Batches - Solo Backoffice (información interna)
CREATE POLICY "Service role full access batches" ON batches
  FOR ALL USING (auth.role() = 'service_role');

-- Entries - Solo Backoffice
CREATE POLICY "Service role full access entries" ON entries
  FOR ALL USING (auth.role() = 'service_role');

-- Stock adjustments - Solo Backoffice
CREATE POLICY "Service role full access adjustments" ON stock_adjustments
  FOR ALL USING (auth.role() = 'service_role');

-- Alerts - Solo Backoffice
CREATE POLICY "Service role full access alerts" ON alerts
  FOR ALL USING (auth.role() = 'service_role');

-- Consumption history - Solo Backoffice (análisis interno)
CREATE POLICY "Service role full access consumption" ON consumption_history
  FOR ALL USING (auth.role() = 'service_role');

-- Audit logs - Solo Backoffice
CREATE POLICY "Service role full access audit" ON audit_logs
  FOR ALL USING (auth.role() = 'service_role');

-- =========================================================
-- POLÍTICAS PARA B2B CUSTOMERS
-- =========================================================

-- Users - Usuarios solo pueden ver/modificar su propio perfil
CREATE POLICY "Users own profile" ON users
  FOR ALL USING (
    auth.uid() = id OR auth.role() = 'service_role'
  );

-- Customers - Clientes solo pueden ver su propio perfil
CREATE POLICY "Customers own data" ON customers
  FOR ALL USING (
    auth.uid() = user_id OR auth.role() = 'service_role'
  );

-- Customer discounts - Clientes solo pueden ver sus propios descuentos
CREATE POLICY "Customer discounts read own" ON customer_discounts
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    ) OR auth.role() = 'service_role'
  );

-- Service role puede gestionar descuentos
CREATE POLICY "Service role manage discounts" ON customer_discounts
  FOR ALL USING (auth.role() = 'service_role');

-- Orders - Clientes solo pueden ver/crear sus propios pedidos
CREATE POLICY "Customers own orders" ON orders
  FOR SELECT USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    ) OR auth.role() = 'service_role'
  );

CREATE POLICY "Customers create orders" ON orders
  FOR INSERT WITH CHECK (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid() AND is_approved = TRUE
    ) OR auth.role() = 'service_role'
  );

CREATE POLICY "Customers update own orders" ON orders
  FOR UPDATE USING (
    customer_id IN (
      SELECT id FROM customers WHERE user_id = auth.uid()
    ) OR auth.role() = 'service_role'
  );

-- Service role acceso completo a pedidos
CREATE POLICY "Service role full access orders" ON orders
  FOR ALL USING (auth.role() = 'service_role');

-- Order items - Clientes solo pueden ver items de sus pedidos
CREATE POLICY "Customers own order items" ON order_items
  FOR SELECT USING (
    order_id IN (
      SELECT o.id FROM orders o
      JOIN customers c ON c.id = o.customer_id
      WHERE c.user_id = auth.uid()
    ) OR auth.role() = 'service_role'
  );

CREATE POLICY "Service role full access order items" ON order_items
  FOR ALL USING (auth.role() = 'service_role');

-- =========================================================
-- POLÍTICAS PARA TABLAS PÚBLICAS/COMPARTIDAS
-- =========================================================

-- Storage policies para documentos
-- Estas van en el Dashboard de Supabase -> Storage -> Policies

-- =========================================================
-- FUNCIONES DE UTILIDAD PARA RLS
-- =========================================================

-- Función para verificar si el usuario es un cliente aprobado
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

-- Función para obtener el customer_id del usuario autenticado
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

-- Función para verificar si el usuario es administrador
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

-- =========================================================
-- POLÍTICAS REFINADAS CON FUNCIONES DE UTILIDAD
-- =========================================================

-- Política adicional para orders con función de utilidad
CREATE POLICY "Approved customers can create orders" ON orders
  FOR INSERT WITH CHECK (
    is_approved_customer() OR auth.role() = 'service_role'
  );

-- =========================================================
-- STORAGE POLICIES (Para ejecutar en el Dashboard)
-- =========================================================
/*
-- Estas políticas deben ejecutarse en el Dashboard de Supabase -> Storage

-- Bucket de documentos para OCR
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'documentos', 
  'documentos', 
  false, 
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
);

-- Política para subir documentos (solo Backoffice vía service role)
CREATE POLICY "Service role can upload documents" ON storage.objects
FOR INSERT TO service_role
WITH CHECK (bucket_id = 'documentos');

-- Política para leer documentos (solo Backoffice vía service role)
CREATE POLICY "Service role can read documents" ON storage.objects
FOR SELECT TO service_role
USING (bucket_id = 'documentos');

-- Política para eliminar documentos (solo Backoffice vía service role)  
CREATE POLICY "Service role can delete documents" ON storage.objects
FOR DELETE TO service_role
USING (bucket_id = 'documentos');

-- Bucket de imágenes de productos (público para mostrar en B2B)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'productos', 
  'productos', 
  true, 
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);

-- Política para subir imágenes de productos (solo service role)
CREATE POLICY "Service role can upload product images" ON storage.objects
FOR INSERT TO service_role
WITH CHECK (bucket_id = 'productos');

-- Política para leer imágenes de productos (público)
CREATE POLICY "Public can view product images" ON storage.objects
FOR SELECT TO public
USING (bucket_id = 'productos');
*/

-- =========================================================
-- COMENTARIOS Y DOCUMENTACIÓN
-- =========================================================

COMMENT ON POLICY "Service role full access products" ON products IS 
  'Backoffice tiene acceso completo via service_role. B2B solo lectura de productos activos.';

COMMENT ON POLICY "Customers own orders" ON orders IS 
  'Clientes B2B solo pueden ver sus propios pedidos. Service role ve todo.';

COMMENT ON FUNCTION is_approved_customer() IS 
  'Verifica si el usuario autenticado es un cliente aprobado para realizar pedidos.';

COMMENT ON FUNCTION get_customer_id() IS 
  'Obtiene el UUID del cliente asociado al usuario autenticado.';

-- =========================================================
-- VISTAS SEGURAS PARA B2B
-- =========================================================

-- Vista de productos con información B2B (sin datos internos sensibles)
CREATE OR REPLACE VIEW v_products_b2b AS
SELECT 
  p.id,
  p.nombre,
  p.descripcion,
  p.unidad,
  p.stock_actual,
  p.categoria,
  p.brand,
  p.image_url,
  p.precio_promedio,
  CASE 
    WHEN p.stock_actual > 0 THEN TRUE
    ELSE FALSE
  END as available
FROM products p
WHERE p.is_active = TRUE;

-- Vista de pedidos para clientes B2B
CREATE OR REPLACE VIEW v_orders_b2b AS
SELECT 
  o.id,
  o.order_number,
  o.status,
  o.total_amount,
  o.total_items,
  o.has_backorder,
  o.delivery_date,
  o.notes,
  o.created_at,
  o.updated_at
FROM orders o
WHERE o.customer_id = get_customer_id();

-- RLS en vistas
ALTER VIEW v_products_b2b OWNER TO postgres;
ALTER VIEW v_orders_b2b OWNER TO postgres;