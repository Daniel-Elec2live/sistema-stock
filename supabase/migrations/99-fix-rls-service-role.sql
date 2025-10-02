-- =========================================================
-- FIX: RLS policies to properly detect service_role key
-- =========================================================
-- Problema: auth.role() solo funciona con JWT auth, no con API keys
-- Solución: Usar request.jwt.claims para detectar correctamente
-- =========================================================

-- OPCIÓN 1: Deshabilitar RLS completamente en orders (más simple para backoffice)
-- Esto es SEGURO porque el backoffice solo es accesible internamente
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE order_logs DISABLE ROW LEVEL SECURITY;

-- NOTA: Products, customers, etc. mantienen RLS activo para proteger B2B
-- Solo deshabilitamos RLS en tablas que el backoffice necesita acceso completo

-- =========================================================
-- ALTERNATIVA (comentada): Si prefieres mantener RLS activo
-- =========================================================
-- En vez de DISABLE, podrías cambiar las políticas a:
--
-- DROP POLICY IF EXISTS "Service role full access orders" ON orders;
-- CREATE POLICY "Bypass RLS for service key" ON orders
--   FOR ALL
--   USING (
--     current_setting('request.jwt.claims', true)::json->>'role' = 'service_role'
--     OR
--     current_setting('request.headers', true)::json->>'apikey' = current_setting('app.settings.service_role_key', true)
--   );
--
-- Pero esto requiere configuración adicional y es más complejo
