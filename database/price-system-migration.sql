-- ============================================
-- SISTEMA DE PRECIOS CON MEDIA PONDERADA
-- Ejecutado en: $(date)
-- ============================================

-- 1. AÑADIR CAMPOS NECESARIOS
-- --------------------------------------------

-- Agregar descuento general por cliente
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS descuento_general DECIMAL(5,2) DEFAULT 0.00
CHECK (descuento_general >= 0 AND descuento_general <= 100);

-- Crear tabla de configuración general
CREATE TABLE IF NOT EXISTS settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave TEXT NOT NULL UNIQUE,
  valor_numerico DECIMAL(10,4),
  valor_texto TEXT,
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insertar margen general por defecto (30%)
INSERT INTO settings (clave, valor_numerico, descripcion)
VALUES ('margen_general', 30.00, 'Margen general aplicado a productos (porcentaje)')
ON CONFLICT (clave) DO NOTHING;

-- 2. FUNCIÓN PARA CALCULAR PRECIO PROMEDIO PONDERADO
-- --------------------------------------------

CREATE OR REPLACE FUNCTION calcular_precio_promedio_ponderado(producto_id UUID)
RETURNS DECIMAL(10,4) AS $$
DECLARE
  precio_promedio DECIMAL(10,4);
BEGIN
  -- Calcular media ponderada: Σ(precio_compra * cantidad) / Σ(cantidad)
  SELECT
    COALESCE(
      SUM(precio_compra * cantidad) / NULLIF(SUM(cantidad), 0),
      0
    )
  INTO precio_promedio
  FROM batches
  WHERE product_id = producto_id AND cantidad > 0;

  RETURN COALESCE(precio_promedio, 0);
END;
$$ LANGUAGE plpgsql;

-- 3. TRIGGERS PARA ACTUALIZAR PRECIO AUTOMÁTICAMENTE
-- --------------------------------------------

-- Función trigger
CREATE OR REPLACE FUNCTION actualizar_precio_promedio()
RETURNS TRIGGER AS $$
DECLARE
  nuevo_precio DECIMAL(10,4);
BEGIN
  -- Obtener el product_id según el tipo de operación
  IF TG_OP = 'DELETE' THEN
    nuevo_precio := calcular_precio_promedio_ponderado(OLD.product_id);
    UPDATE products
    SET precio_promedio = nuevo_precio,
        updated_at = now()
    WHERE id = OLD.product_id;
    RETURN OLD;
  ELSE
    nuevo_precio := calcular_precio_promedio_ponderado(NEW.product_id);
    UPDATE products
    SET precio_promedio = nuevo_precio,
        updated_at = now()
    WHERE id = NEW.product_id;
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Crear triggers en la tabla batches
DROP TRIGGER IF EXISTS trigger_actualizar_precio_insert ON batches;
DROP TRIGGER IF EXISTS trigger_actualizar_precio_update ON batches;
DROP TRIGGER IF EXISTS trigger_actualizar_precio_delete ON batches;

CREATE TRIGGER trigger_actualizar_precio_insert
  AFTER INSERT ON batches
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_precio_promedio();

CREATE TRIGGER trigger_actualizar_precio_update
  AFTER UPDATE ON batches
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_precio_promedio();

CREATE TRIGGER trigger_actualizar_precio_delete
  AFTER DELETE ON batches
  FOR EACH ROW
  EXECUTE FUNCTION actualizar_precio_promedio();

-- 4. FUNCIÓN PARA CALCULAR PRECIO FINAL CON MARGEN Y DESCUENTO
-- --------------------------------------------

CREATE OR REPLACE FUNCTION calcular_precio_final(
  producto_id UUID,
  cliente_id UUID DEFAULT NULL
)
RETURNS TABLE (
  precio_compra_promedio DECIMAL(10,4),
  precio_con_margen DECIMAL(10,4),
  precio_final DECIMAL(10,4),
  margen_aplicado DECIMAL(5,2),
  descuento_aplicado DECIMAL(5,2)
) AS $$
DECLARE
  precio_base DECIMAL(10,4);
  margen DECIMAL(5,2);
  descuento DECIMAL(5,2) := 0;
  precio_con_margen_calc DECIMAL(10,4);
  precio_final_calc DECIMAL(10,4);
BEGIN
  -- 1. Obtener precio promedio del producto
  SELECT p.precio_promedio INTO precio_base
  FROM products p WHERE p.id = producto_id;

  precio_base := COALESCE(precio_base, 0);

  -- 2. Obtener margen general
  SELECT s.valor_numerico INTO margen
  FROM settings s WHERE s.clave = 'margen_general';

  margen := COALESCE(margen, 30.00);

  -- 3. Obtener descuento del cliente (si se proporciona)
  IF cliente_id IS NOT NULL THEN
    SELECT c.descuento_general INTO descuento
    FROM customers c WHERE c.id = cliente_id;
  END IF;

  descuento := COALESCE(descuento, 0);

  -- 4. Calcular precios
  precio_con_margen_calc := precio_base * (1 + margen / 100);
  precio_final_calc := precio_con_margen_calc * (1 - descuento / 100);

  -- 5. Retornar resultados
  RETURN QUERY SELECT
    precio_base,
    precio_con_margen_calc,
    precio_final_calc,
    margen,
    descuento;
END;
$$ LANGUAGE plpgsql;

-- 5. RECALCULAR PRECIOS EXISTENTES
-- --------------------------------------------

-- Actualizar todos los precios promedio existentes
DO $$
DECLARE
  producto RECORD;
BEGIN
  FOR producto IN SELECT id FROM products WHERE is_active = true
  LOOP
    UPDATE products
    SET precio_promedio = calcular_precio_promedio_ponderado(producto.id),
        updated_at = now()
    WHERE id = producto.id;
  END LOOP;
END $$;

-- 6. DATOS DE EJEMPLO (OPCIONAL - Para testing)
-- --------------------------------------------

-- Ejemplo: Asignar descuentos a clientes existentes
-- UPDATE customers SET descuento_general = 10.00 WHERE name ILIKE '%restaurante%';
-- UPDATE customers SET descuento_general = 5.00 WHERE company_name IS NOT NULL;

COMMENT ON TABLE settings IS 'Configuración general del sistema';
COMMENT ON COLUMN customers.descuento_general IS 'Descuento general del cliente (porcentaje)';
COMMENT ON FUNCTION calcular_precio_promedio_ponderado IS 'Calcula precio promedio ponderado basado en batches';
COMMENT ON FUNCTION calcular_precio_final IS 'Calcula precio final: promedio + margen - descuento cliente';

-- ============================================
-- RESULTADO:
-- - Campo descuento_general añadido a customers
-- - Tabla settings creada con margen_general = 30%
-- - Triggers automáticos para actualizar precio_promedio
-- - Función calcular_precio_final() lista para usar en APIs
-- - Todos los precios existentes recalculados
-- ============================================