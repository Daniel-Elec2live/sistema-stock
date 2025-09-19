-- =========================================================
-- TRIGGERS PARA SISTEMA-STOCK
-- =========================================================
-- Triggers automáticos para reservas, alertas y auditoría
-- =========================================================

-- =========================================================
-- TRIGGERS PARA UPDATED_AT
-- =========================================================

-- Aplicar trigger updated_at a todas las tablas con timestamp
CREATE TRIGGER update_products_updated_at 
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at 
  BEFORE UPDATE ON suppliers
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

-- =========================================================
-- TRIGGERS DE GESTIÓN DE PEDIDOS Y STOCK
-- =========================================================

-- Trigger para reservar/reponer stock automáticamente en pedidos
CREATE OR REPLACE FUNCTION handle_order_stock_changes()
RETURNS TRIGGER AS $$
DECLARE
  item_record RECORD;
  reserve_result JSONB;
  restore_result JSONB;
BEGIN
  -- NUEVO PEDIDO (INSERT) - No hacer nada, se reserva en confirmación
  IF TG_OP = 'INSERT' THEN
    RETURN NEW;
  END IF;
  
  -- ACTUALIZACIÓN DE PEDIDO
  IF TG_OP = 'UPDATE' THEN
    -- Si se confirma un pedido (pending -> confirmed)
    IF OLD.status = 'pending' AND NEW.status = 'confirmed' THEN
      FOR item_record IN
        SELECT product_id, quantity
        FROM order_items
        WHERE order_id = NEW.id
      LOOP
        SELECT reserve_stock(item_record.product_id, item_record.quantity) INTO reserve_result;
        
        -- Si falla la reserva, cancelar el pedido y generar alerta
        IF NOT (reserve_result->>'success')::BOOLEAN THEN
          UPDATE orders SET 
            status = 'cancelled',
            cancellation_reason = 'Stock insuficiente: ' || (reserve_result->>'message'),
            cancelled_at = NOW()
          WHERE id = NEW.id;
          
          -- Generar alerta de backorder
          INSERT INTO alerts (type, severity, title, message, entity_type, entity_id, metadata)
          VALUES (
            'order_backorder', 'high', 'Pedido cancelado por stock',
            'Pedido ' || COALESCE(NEW.order_number, NEW.id::TEXT) || ' cancelado: ' || (reserve_result->>'message'),
            'order', NEW.id,
            jsonb_build_object('reason', 'insufficient_stock', 'details', reserve_result)
          );
          
          RETURN NEW;
        END IF;
        
        -- Registrar consumo en histórico
        INSERT INTO consumption_history (
          product_id, quantity, type, order_id,
          period_year, period_month, period_week
        ) VALUES (
          item_record.product_id, item_record.quantity, 'sale', NEW.id,
          EXTRACT(YEAR FROM NOW()), EXTRACT(MONTH FROM NOW()), EXTRACT(WEEK FROM NOW())
        );
      END LOOP;
      
      -- Asignar número de pedido si no lo tiene
      IF NEW.order_number IS NULL THEN
        UPDATE orders SET order_number = generate_order_number() WHERE id = NEW.id;
      END IF;
      
    -- Si se cancela un pedido confirmado, reponer stock
    ELSIF OLD.status IN ('confirmed', 'prepared') AND NEW.status = 'cancelled' THEN
      FOR item_record IN
        SELECT product_id, quantity
        FROM order_items
        WHERE order_id = NEW.id
      LOOP
        SELECT restore_stock(item_record.product_id, item_record.quantity) INTO restore_result;
        
        -- Eliminar del histórico de consumo
        DELETE FROM consumption_history 
        WHERE order_id = NEW.id AND product_id = item_record.product_id;
      END LOOP;
    END IF;
    
    RETURN NEW;
  END IF;
  
  -- ELIMINACIÓN DE PEDIDO (raro, pero por seguridad)
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

-- Aplicar trigger de gestión de stock en pedidos
CREATE TRIGGER handle_order_stock_trigger
  AFTER INSERT OR UPDATE OR DELETE ON orders
  FOR EACH ROW EXECUTE FUNCTION handle_order_stock_changes();

-- =========================================================
-- TRIGGERS DE ALERTAS AUTOMÁTICAS
-- =========================================================

-- Trigger para generar alertas cuando cambia el stock
CREATE OR REPLACE FUNCTION check_stock_alerts()
RETURNS TRIGGER AS $$
BEGIN
  -- Solo para actualizaciones de stock
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
      -- Solo si no existe una alerta similar reciente
      ON CONFLICT DO NOTHING;
    END IF;
    
    -- Resolver alertas si el stock vuelve a niveles normales
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

-- Aplicar trigger de alertas de stock
CREATE TRIGGER check_stock_alerts_trigger
  AFTER UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION check_stock_alerts();

-- =========================================================
-- TRIGGERS DE AUDITORÍA
-- =========================================================

-- Trigger genérico de auditoría para cambios importantes
CREATE OR REPLACE FUNCTION audit_changes()
RETURNS TRIGGER AS $$
DECLARE
  user_id_val UUID;
  old_values JSONB;
  new_values JSONB;
BEGIN
  -- Intentar obtener user_id del contexto (si está disponible)
  user_id_val := COALESCE(
    current_setting('request.jwt.claims', true)::json->>'sub'
  )::UUID;
  
  -- Preparar valores para auditoría
  IF TG_OP = 'DELETE' THEN
    old_values := to_jsonb(OLD);
    new_values := NULL;
  ELSE
    old_values := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END;
    new_values := to_jsonb(NEW);
  END IF;
  
  -- Insertar log de auditoría
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

-- Aplicar auditoría a tablas importantes
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

-- =========================================================
-- TRIGGERS PARA ENTRADAS Y LOTES
-- =========================================================

-- Trigger para procesar entrada validada (incrementar stock y crear lotes)
CREATE OR REPLACE FUNCTION process_validated_entry()
RETURNS TRIGGER AS $$
DECLARE
  producto_item JSONB;
  product_id_found UUID;
  batch_id_created UUID;
BEGIN
  -- Solo procesar cuando se valida una entrada (draft/processing -> validated)
  IF TG_OP = 'UPDATE' AND OLD.estado != 'validated' AND NEW.estado = 'validated' THEN
    -- Procesar cada producto en el array productos
    FOR producto_item IN SELECT * FROM jsonb_array_elements(NEW.productos)
    LOOP
      -- Buscar el producto por nombre (o crear si no existe)
      SELECT id INTO product_id_found
      FROM products
      WHERE LOWER(nombre) = LOWER(producto_item->>'nombre')
      LIMIT 1;
      
      -- Si no existe el producto, crearlo
      IF product_id_found IS NULL THEN
        INSERT INTO products (nombre, unidad, categoria, proveedor_principal, is_active)
        VALUES (
          producto_item->>'nombre',
          COALESCE(producto_item->>'unidad', 'kg'),
          COALESCE(producto_item->>'categoria', 'general'),
          NEW.supplier_id,
          TRUE
        ) RETURNING id INTO product_id_found;
      END IF;
      
      -- Crear lote
      INSERT INTO batches (
        product_id, supplier_id, cantidad, cantidad_inicial,
        caducidad, precio_compra, lote_proveedor, entry_id
      ) VALUES (
        product_id_found,
        NEW.supplier_id,
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
      
      -- Incrementar stock global del producto
      UPDATE products
      SET stock_actual = stock_actual + (producto_item->>'cantidad')::DECIMAL,
          precio_promedio = CASE 
            WHEN precio_promedio IS NULL OR precio_promedio = 0 
            THEN COALESCE((producto_item->>'precio')::DECIMAL, 0)
            ELSE (precio_promedio + COALESCE((producto_item->>'precio')::DECIMAL, 0)) / 2
          END,
          updated_at = NOW()
      WHERE id = product_id_found;
    END LOOP;
    
    -- Actualizar totales de la entrada
    UPDATE entries
    SET total_items = jsonb_array_length(NEW.productos),
        total_amount = (
          SELECT SUM((item->>'cantidad')::DECIMAL * COALESCE((item->>'precio')::DECIMAL, 0))
          FROM jsonb_array_elements(NEW.productos) item
        )
    WHERE id = NEW.id;
    
    -- Generar alerta de entrada procesada
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

-- Aplicar trigger para procesar entradas
CREATE TRIGGER process_validated_entry_trigger
  AFTER UPDATE ON entries
  FOR EACH ROW EXECUTE FUNCTION process_validated_entry();

-- =========================================================
-- TRIGGERS PARA LIMPIEZA Y MANTENIMIENTO
-- =========================================================

-- Trigger para limpiar alertas antiguas (ejecutar con cron job)
CREATE OR REPLACE FUNCTION schedule_alert_cleanup()
RETURNS TRIGGER AS $$
BEGIN
  -- Cada 100 alertas nuevas, limpiar las antiguas
  IF (NEW.id::TEXT ~ '00$') THEN
    PERFORM cleanup_old_alerts(30);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger de limpieza (opcional)
-- CREATE TRIGGER schedule_alert_cleanup_trigger
--   AFTER INSERT ON alerts
--   FOR EACH ROW EXECUTE FUNCTION schedule_alert_cleanup();