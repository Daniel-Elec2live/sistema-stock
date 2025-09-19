-- =========================================================
-- MIGRACIÓN: ELIMINAR TABLA SUPPLIERS Y SIMPLIFICAR PROVEEDORES
-- =========================================================
-- Convierte el sistema de proveedores de tabla compleja a campo simple
-- Migración 06 - Fecha: 2024-09-16
-- =========================================================

-- =========================================================
-- PASO 1: MIGRAR DATOS EXISTENTES Y PREPARAR CAMPOS
-- =========================================================

-- 1.1. Asegurar que proveedor_text existe (debería existir del fix anterior)
ALTER TABLE products ADD COLUMN IF NOT EXISTS proveedor_text TEXT;

-- 1.2. Migrar datos de suppliers a proveedor_text donde esté vacío
UPDATE products SET proveedor_text = (
  SELECT s.name 
  FROM suppliers s 
  WHERE s.id = products.proveedor_principal
) WHERE proveedor_text IS NULL AND proveedor_principal IS NOT NULL;

-- 1.3. Para productos sin proveedor, asignar valor por defecto
UPDATE products SET proveedor_text = 'Proveedor General' 
WHERE proveedor_text IS NULL OR proveedor_text = '';

-- 1.4. Hacer categoría obligatoria - primero asignar valor por defecto
UPDATE products SET categoria = 'Otros' WHERE categoria IS NULL OR categoria = '';
ALTER TABLE products ALTER COLUMN categoria SET NOT NULL;

-- =========================================================
-- PASO 2: ELIMINAR FOREIGN KEYS Y REFERENCIAS UUID
-- =========================================================

-- 2.1. Eliminar índices relacionados con suppliers
DROP INDEX IF EXISTS idx_products_supplier;
DROP INDEX IF EXISTS idx_batches_supplier;

-- 2.2. Eliminar foreign key constraints
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_proveedor_principal_fkey;
ALTER TABLE batches DROP CONSTRAINT IF EXISTS batches_supplier_id_fkey;
ALTER TABLE entries DROP CONSTRAINT IF EXISTS entries_supplier_id_fkey;

-- 2.3. Eliminar columnas UUID de supplier
ALTER TABLE products DROP COLUMN IF EXISTS proveedor_principal;
ALTER TABLE batches DROP COLUMN IF EXISTS supplier_id;
ALTER TABLE entries DROP COLUMN IF EXISTS supplier_id;

-- =========================================================
-- PASO 3: RENOMBRAR Y CONFIGURAR CAMPO PROVEEDOR
-- =========================================================

-- 3.1. Renombrar proveedor_text a proveedor
ALTER TABLE products RENAME COLUMN proveedor_text TO proveedor;

-- 3.2. Hacer proveedor obligatorio
ALTER TABLE products ALTER COLUMN proveedor SET NOT NULL;

-- 3.3. Crear índice para proveedor
CREATE INDEX IF NOT EXISTS idx_products_proveedor ON products(proveedor);

-- =========================================================
-- PASO 4: ELIMINAR TRIGGERS Y POLICIES DE SUPPLIERS
-- =========================================================

-- 4.1. Eliminar trigger de suppliers
DROP TRIGGER IF EXISTS update_suppliers_updated_at ON suppliers;

-- 4.2. Eliminar policies de suppliers
DROP POLICY IF EXISTS "Service role full access suppliers" ON suppliers;

-- 4.3. Limpiar función de trigger si existe
DROP FUNCTION IF EXISTS process_entry_products();

-- =========================================================
-- PASO 5: ELIMINAR TABLA SUPPLIERS
-- =========================================================

-- 5.1. Deshabilitar RLS antes de eliminar
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;

-- 5.2. Eliminar tabla suppliers
DROP TABLE IF EXISTS suppliers CASCADE;

-- =========================================================
-- PASO 6: ACTUALIZAR ESTRUCTURA PARA REFERENCIA AUTOMÁTICA
-- =========================================================

-- 6.1. Asegurar que referencia existe y es única
ALTER TABLE products ADD COLUMN IF NOT EXISTS referencia VARCHAR(50);
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_referencia_unique ON products(referencia);

-- =========================================================
-- PASO 7: RECREAR TRIGGERS SIN SUPPLIERS
-- =========================================================

-- 7.1. Función simplificada para procesar entries (sin suppliers)
CREATE OR REPLACE FUNCTION process_entry_products()
RETURNS TRIGGER AS $$
DECLARE
  producto_item JSONB;
  product_id_found UUID;
  cantidad_producto DECIMAL(10,3);
  precio_producto DECIMAL(10,2);
BEGIN
  -- Solo procesar si el estado cambia a 'validated'
  IF NEW.estado = 'validated' AND OLD.estado != 'validated' THEN
    
    -- Procesar cada producto en el array
    FOR producto_item IN SELECT * FROM jsonb_array_elements(NEW.productos) LOOP
      cantidad_producto := (producto_item->>'cantidad')::DECIMAL(10,3);
      precio_producto := COALESCE((producto_item->>'precio')::DECIMAL(10,2), 0);
      
      -- Buscar producto existente
      SELECT id INTO product_id_found
      FROM products
      WHERE LOWER(nombre) = LOWER(producto_item->>'nombre')
      LIMIT 1;
      
      -- Si no existe el producto, crearlo (sin supplier_id)
      IF product_id_found IS NULL THEN
        INSERT INTO products (nombre, unidad, categoria, proveedor, is_active, stock_actual)
        VALUES (
          producto_item->>'nombre',
          COALESCE(producto_item->>'unidad', 'kg'),
          COALESCE(producto_item->>'categoria', 'Otros'),
          COALESCE(NEW.proveedor_text, 'Proveedor Desconocido'),
          TRUE,
          0
        ) RETURNING id INTO product_id_found;
      END IF;
      
      -- Aumentar stock del producto
      UPDATE products 
      SET stock_actual = stock_actual + cantidad_producto,
          precio_promedio = CASE 
            WHEN precio_producto > 0 THEN 
              COALESCE(
                (precio_promedio * stock_actual + precio_producto * cantidad_producto) / (stock_actual + cantidad_producto),
                precio_producto
              )
            ELSE precio_promedio
          END,
          updated_at = NOW()
      WHERE id = product_id_found;
      
      -- Crear lote (sin supplier_id)
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
        cantidad_producto,
        cantidad_producto,
        CASE WHEN producto_item->>'caducidad' != '' 
             THEN (producto_item->>'caducidad')::DATE 
             ELSE NULL END,
        precio_producto,
        producto_item->>'lote',
        NEW.id
      );
    END LOOP;
    
    -- Actualizar contador de items procesados
    NEW.total_items := jsonb_array_length(NEW.productos);
    
    -- Generar alerta de entrada procesada
    INSERT INTO alerts (type, severity, title, message, entity_type, entity_id, metadata)
    VALUES (
      'entry_processed',
      'medium',
      'Entrada procesada',
      'Entrada de ' || COALESCE(NEW.proveedor_text, 'proveedor desconocido') || ' procesada correctamente',
      'entry',
      NEW.id,
      jsonb_build_object(
        'total_items', NEW.total_items,
        'proveedor', NEW.proveedor_text
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7.2. Recrear trigger para entries
DROP TRIGGER IF EXISTS process_entry_validation ON entries;
CREATE TRIGGER process_entry_validation
  BEFORE UPDATE ON entries
  FOR EACH ROW
  EXECUTE FUNCTION process_entry_products();

-- =========================================================
-- PASO 8: VERIFICACIÓN Y LIMPIEZA FINAL
-- =========================================================

-- 8.1. Verificar estructura final de products
DO $$ 
BEGIN
  RAISE NOTICE '=== VERIFICACIÓN POST-MIGRACIÓN ===';
  RAISE NOTICE 'Productos totales: %', (SELECT COUNT(*) FROM products);
  RAISE NOTICE 'Productos con proveedor: %', (SELECT COUNT(*) FROM products WHERE proveedor IS NOT NULL);
  RAISE NOTICE 'Productos con categoría: %', (SELECT COUNT(*) FROM products WHERE categoria IS NOT NULL);
  RAISE NOTICE 'Referencias únicas: %', (SELECT COUNT(DISTINCT referencia) FROM products WHERE referencia IS NOT NULL);
END $$;

-- 8.2. Mostrar muestra de datos migrados
SELECT 
  nombre, 
  proveedor, 
  categoria, 
  referencia,
  stock_actual,
  stock_minimo
FROM products 
ORDER BY nombre 
LIMIT 5;

-- =========================================================
-- COMENTARIOS FINALES
-- =========================================================

COMMENT ON TABLE products IS 'Productos simplificados - proveedor como campo TEXT directo';
COMMENT ON COLUMN products.proveedor IS 'Nombre del proveedor (campo simple, no referencia)';
COMMENT ON COLUMN products.categoria IS 'Categoría obligatoria del producto';
COMMENT ON COLUMN products.referencia IS 'Referencia única autogenerada: 3 letras proveedor + 25 + número';

-- =========================================================
-- SCRIPT DE REVERSIÓN (SOLO COMO REFERENCIA - NO EJECUTAR)
-- =========================================================
/*
-- Para revertir esta migración (CUIDADO - perdida de datos):
-- 1. Recrear tabla suppliers con datos básicos
-- 2. Añadir proveedor_principal UUID a products  
-- 3. Crear mapeo de texto a UUID
-- 4. Restaurar foreign keys
-- NOTA: Esta reversión no es 100% perfecta debido a pérdida de datos de suppliers
*/