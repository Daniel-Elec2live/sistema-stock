-- ============================================================================
-- LIMPIEZA COMPLETA DE BASE DE DATOS
-- ============================================================================
-- ⚠️ ADVERTENCIA: Este script ELIMINA TODOS LOS DATOS Y ESQUEMAS
-- Solo ejecutar cuando estés seguro de que quieres empezar desde cero
-- ============================================================================

-- 1. ELIMINAR TODOS LOS TRIGGERS PRIMERO (antes de eliminar las tablas)
-- ============================================================================
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Eliminar todos los triggers del schema public
    FOR r IN (
        SELECT trigger_name, event_object_table
        FROM information_schema.triggers
        WHERE trigger_schema = 'public'
    ) LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS %I ON %I CASCADE', r.trigger_name, r.event_object_table);
    END LOOP;
END $$;

-- 2. ELIMINAR TODAS LAS FUNCIONES
-- ============================================================================
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS generate_product_reference() CASCADE;
DROP FUNCTION IF EXISTS generate_order_number() CASCADE;
DROP FUNCTION IF EXISTS calcular_precio_final(UUID, UUID) CASCADE;
DROP FUNCTION IF EXISTS reserve_stock(UUID, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS restore_stock(UUID, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS consume_from_batches(UUID, DECIMAL) CASCADE;
DROP FUNCTION IF EXISTS check_stock_alerts() CASCADE;
DROP FUNCTION IF EXISTS handle_product_stock_changes() CASCADE;
DROP FUNCTION IF EXISTS handle_order_stock_changes() CASCADE;
DROP FUNCTION IF EXISTS handle_batch_changes() CASCADE;
DROP FUNCTION IF EXISTS handle_entry_creation() CASCADE;
DROP FUNCTION IF EXISTS handle_stock_adjustment() CASCADE;
DROP FUNCTION IF EXISTS log_order_changes() CASCADE;
DROP FUNCTION IF EXISTS audit_table_changes() CASCADE;
DROP FUNCTION IF EXISTS get_stock_movements(UUID, TIMESTAMPTZ, TIMESTAMPTZ) CASCADE;

-- 3. ELIMINAR TODAS LAS TABLAS (con CASCADE para eliminar dependencias)
-- ============================================================================
DROP TABLE IF EXISTS order_logs CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS customer_discounts CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS alerts CASCADE;
DROP TABLE IF EXISTS stock_adjustments CASCADE;
DROP TABLE IF EXISTS consumption_history CASCADE;
DROP TABLE IF EXISTS batches CASCADE;
DROP TABLE IF EXISTS entries CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE; -- Por si aún existe

-- 4. ELIMINAR TIPOS PERSONALIZADOS (si existen)
-- ============================================================================
DROP TYPE IF EXISTS order_status CASCADE;
DROP TYPE IF EXISTS alert_severity CASCADE;
DROP TYPE IF EXISTS adjustment_type CASCADE;

-- 5. VERIFICACIÓN FINAL
-- ============================================================================
-- Puedes ejecutar esto después para confirmar que todo está limpio:
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public';
-- SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public';

-- ============================================================================
-- ✅ BASE DE DATOS COMPLETAMENTE LIMPIA
-- Ahora puedes ejecutar 00-SCHEMA-DEFINITIVO.sql
-- ============================================================================
