-- =========================================================
-- FUNCIONES POSTGRESQL PARA SISTEMA-STOCK
-- =========================================================
-- Funciones para gestión de stock, reservas, alertas y forecast
-- =========================================================

-- Función para actualizar timestamp automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- FUNCIONES DE GESTIÓN DE STOCK
-- =========================================================

-- Reservar stock (usado al confirmar pedidos)
CREATE OR REPLACE FUNCTION reserve_stock(product_id_param UUID, quantity_param DECIMAL)
RETURNS JSONB AS $$
DECLARE
  current_stock DECIMAL;
  product_name TEXT;
  result JSONB;
BEGIN
  -- Obtener stock actual con bloqueo exclusivo
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
      'requested', quantity_param
    );
  END IF;
  
  -- Reservar el stock
  UPDATE products 
  SET stock_actual = stock_actual - quantity_param,
      updated_at = NOW()
  WHERE id = product_id_param;
  
  RETURN jsonb_build_object(
    'success', true,
    'product_name', product_name,
    'reserved_quantity', quantity_param,
    'remaining_stock', current_stock - quantity_param
  );
END;
$$ LANGUAGE plpgsql;

-- Reponer stock (usado al cancelar pedidos)
CREATE OR REPLACE FUNCTION restore_stock(product_id_param UUID, quantity_param DECIMAL)
RETURNS JSONB AS $$
DECLARE
  product_name TEXT;
  new_stock DECIMAL;
BEGIN
  -- Reponer stock
  UPDATE products 
  SET stock_actual = stock_actual + quantity_param,
      updated_at = NOW()
  WHERE id = product_id_param
  RETURNING nombre, stock_actual INTO product_name, new_stock;
  
  IF product_name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'product_not_found');
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'product_name', product_name,
    'restored_quantity', quantity_param,
    'new_stock', new_stock
  );
END;
$$ LANGUAGE plpgsql;

-- Ajustar stock (mermas, correcciones, inventarios)
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
  current_stock DECIMAL;
  product_name TEXT;
  adjustment_id UUID;
BEGIN
  -- Obtener stock actual
  SELECT stock_actual, nombre INTO current_stock, product_name
  FROM products 
  WHERE id = product_id_param 
  FOR UPDATE;
  
  IF current_stock IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'product_not_found');
  END IF;
  
  -- Verificar que el ajuste no deje stock negativo
  IF (current_stock + quantity_change) < 0 THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error', 'negative_stock',
      'message', format('El ajuste dejaría stock negativo: %s + %s = %s', 
        current_stock, quantity_change, current_stock + quantity_change)
    );
  END IF;
  
  -- Registrar el ajuste
  INSERT INTO stock_adjustments (
    product_id, tipo, cantidad, cantidad_anterior, motivo, observaciones, usuario
  ) VALUES (
    product_id_param, adjustment_type, quantity_change, current_stock, reason, observations, user_name
  ) RETURNING id INTO adjustment_id;
  
  -- Actualizar stock
  UPDATE products 
  SET stock_actual = stock_actual + quantity_change,
      updated_at = NOW()
  WHERE id = product_id_param;
  
  -- Registrar en histórico de consumo (si es reducción)
  IF quantity_change < 0 THEN
    INSERT INTO consumption_history (
      product_id, quantity, type, adjustment_id, 
      period_year, period_month, period_week
    ) VALUES (
      product_id_param, ABS(quantity_change), 'adjustment', adjustment_id,
      EXTRACT(YEAR FROM NOW()), EXTRACT(MONTH FROM NOW()), EXTRACT(WEEK FROM NOW())
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'adjustment_id', adjustment_id,
    'product_name', product_name,
    'old_stock', current_stock,
    'change', quantity_change,
    'new_stock', current_stock + quantity_change
  );
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- FUNCIONES DE ALERTAS
-- =========================================================

-- Generar alertas de stock crítico
CREATE OR REPLACE FUNCTION generate_stock_alerts()
RETURNS INTEGER AS $$
DECLARE
  alert_count INTEGER := 0;
  product_record RECORD;
BEGIN
  -- Insertar alertas para productos con stock crítico
  FOR product_record IN 
    SELECT id, nombre, stock_actual, stock_minimo
    FROM products 
    WHERE is_active = TRUE 
      AND stock_actual <= stock_minimo
      AND NOT EXISTS (
        SELECT 1 FROM alerts 
        WHERE entity_type = 'product' 
          AND entity_id = products.id
          AND type IN ('stock_critical', 'stock_out')
          AND is_resolved = FALSE
          AND created_at > NOW() - INTERVAL '1 day'
      )
  LOOP
    INSERT INTO alerts (
      type, severity, title, message, entity_type, entity_id, metadata
    ) VALUES (
      CASE 
        WHEN product_record.stock_actual = 0 THEN 'stock_out'
        ELSE 'stock_critical'
      END,
      CASE 
        WHEN product_record.stock_actual = 0 THEN 'critical'
        ELSE 'high'
      END,
      CASE 
        WHEN product_record.stock_actual = 0 THEN 'Sin stock'
        ELSE 'Stock crítico'
      END,
      format('%s - Stock: %s (Mínimo: %s)', 
        product_record.nombre, product_record.stock_actual, product_record.stock_minimo),
      'product',
      product_record.id,
      jsonb_build_object(
        'stock_actual', product_record.stock_actual,
        'stock_minimo', product_record.stock_minimo,
        'product_name', product_record.nombre
      )
    );
    
    alert_count := alert_count + 1;
  END LOOP;
  
  RETURN alert_count;
END;
$$ LANGUAGE plpgsql;

-- Generar alertas de caducidad próxima
CREATE OR REPLACE FUNCTION generate_expiry_alerts()
RETURNS INTEGER AS $$
DECLARE
  alert_count INTEGER := 0;
  batch_record RECORD;
BEGIN
  -- Alertas para lotes que caducan en los próximos 7 días
  FOR batch_record IN
    SELECT b.id, b.product_id, b.cantidad, b.caducidad, p.nombre
    FROM batches b
    JOIN products p ON p.id = b.product_id
    WHERE b.cantidad > 0
      AND b.caducidad IS NOT NULL
      AND b.caducidad <= CURRENT_DATE + INTERVAL '7 days'
      AND b.caducidad >= CURRENT_DATE
      AND NOT EXISTS (
        SELECT 1 FROM alerts
        WHERE entity_type = 'batch'
          AND entity_id = b.id
          AND type = 'expiry_warning'
          AND is_resolved = FALSE
          AND created_at > NOW() - INTERVAL '2 days'
      )
  LOOP
    INSERT INTO alerts (
      type, severity, title, message, entity_type, entity_id, metadata
    ) VALUES (
      'expiry_warning',
      CASE 
        WHEN batch_record.caducidad <= CURRENT_DATE + INTERVAL '2 days' THEN 'critical'
        WHEN batch_record.caducidad <= CURRENT_DATE + INTERVAL '4 days' THEN 'high'
        ELSE 'medium'
      END,
      'Próxima caducidad',
      format('%s - Caduca: %s (Cantidad: %s)', 
        batch_record.nombre, batch_record.caducidad, batch_record.cantidad),
      'batch',
      batch_record.id,
      jsonb_build_object(
        'product_id', batch_record.product_id,
        'product_name', batch_record.nombre,
        'cantidad', batch_record.cantidad,
        'caducidad', batch_record.caducidad,
        'days_to_expiry', batch_record.caducidad - CURRENT_DATE
      )
    );
    
    alert_count := alert_count + 1;
  END LOOP;
  
  RETURN alert_count;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- FUNCIONES DE ANÁLISIS Y FORECAST
-- =========================================================

-- Calcular consumo promedio por producto
CREATE OR REPLACE FUNCTION get_product_consumption_stats(product_id_param UUID, months_back INTEGER DEFAULT 3)
RETURNS JSONB AS $$
DECLARE
  stats JSONB;
  avg_monthly DECIMAL;
  avg_weekly DECIMAL;
  total_consumed DECIMAL;
BEGIN
  SELECT 
    COALESCE(AVG(monthly_total), 0),
    COALESCE(AVG(weekly_total), 0),
    COALESCE(SUM(monthly_total), 0)
  INTO avg_monthly, avg_weekly, total_consumed
  FROM (
    -- Consumo mensual
    SELECT 
      period_year, period_month,
      SUM(quantity) as monthly_total,
      AVG(SUM(quantity)) OVER (PARTITION BY period_year, period_month) as weekly_total
    FROM consumption_history
    WHERE product_id = product_id_param
      AND created_at >= NOW() - (months_back || ' months')::INTERVAL
      AND type IN ('sale', 'adjustment')
    GROUP BY period_year, period_month
  ) monthly_stats;
  
  RETURN jsonb_build_object(
    'avg_monthly_consumption', COALESCE(avg_monthly, 0),
    'avg_weekly_consumption', COALESCE(avg_weekly, 0),
    'total_consumed', COALESCE(total_consumed, 0),
    'analysis_period_months', months_back
  );
END;
$$ LANGUAGE plpgsql;

-- Sugerencias de restock basadas en consumo
CREATE OR REPLACE FUNCTION get_restock_suggestions(limit_results INTEGER DEFAULT 10)
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
  WITH consumption_data AS (
    SELECT 
      p.id,
      p.nombre,
      p.stock_actual,
      p.stock_minimo,
      p.stock_maximo,
      COALESCE(
        (SELECT AVG(monthly_consumption)
         FROM (
           SELECT SUM(ch.quantity) as monthly_consumption
           FROM consumption_history ch
           WHERE ch.product_id = p.id 
             AND ch.created_at >= NOW() - INTERVAL '3 months'
             AND ch.type IN ('sale', 'adjustment')
           GROUP BY date_trunc('month', ch.created_at)
         ) monthly_avg), 0
      ) as avg_consumption_monthly
    FROM products p
    WHERE p.is_active = TRUE
      AND p.stock_actual <= p.stock_minimo * 1.5  -- Productos con stock bajo/crítico
  )
  SELECT 
    cd.id,
    cd.nombre,
    cd.stock_actual,
    cd.stock_minimo,
    cd.avg_consumption_monthly,
    CASE 
      WHEN cd.avg_consumption_monthly > 0 
      THEN (cd.stock_actual / (cd.avg_consumption_monthly / 30))::INTEGER
      ELSE 999
    END as days_until_stockout,
    CASE 
      WHEN cd.stock_maximo IS NOT NULL 
      THEN GREATEST(cd.stock_maximo - cd.stock_actual, cd.stock_minimo * 2)
      ELSE cd.stock_minimo * 3
    END as suggested_quantity,
    CASE 
      WHEN cd.stock_actual = 0 THEN 100
      WHEN cd.stock_actual <= cd.stock_minimo * 0.5 THEN 90
      WHEN cd.stock_actual <= cd.stock_minimo THEN 70
      ELSE 50
    END as priority
  FROM consumption_data cd
  ORDER BY priority DESC, cd.stock_actual ASC
  LIMIT limit_results;
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- FUNCIONES DE UTILIDAD
-- =========================================================

-- Calcular valor total del inventario
CREATE OR REPLACE FUNCTION calculate_inventory_value()
RETURNS DECIMAL AS $$
DECLARE
  total_value DECIMAL := 0;
BEGIN
  SELECT COALESCE(SUM(b.cantidad * b.precio_compra), 0)
  INTO total_value
  FROM batches b
  WHERE b.cantidad > 0 AND b.precio_compra > 0;
  
  RETURN total_value;
END;
$$ LANGUAGE plpgsql;

-- Generar número de pedido único
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TEXT AS $$
DECLARE
  order_num TEXT;
  date_prefix TEXT;
  sequence_num INTEGER;
BEGIN
  date_prefix := to_char(NOW(), 'YYYYMMDD');
  
  SELECT COALESCE(MAX(
    CASE 
      WHEN order_number ~ ('^' || date_prefix || '-\d+$')
      THEN substring(order_number from '[0-9]+$')::INTEGER
      ELSE 0
    END
  ), 0) + 1
  INTO sequence_num
  FROM orders
  WHERE created_at >= CURRENT_DATE;
  
  order_num := date_prefix || '-' || LPAD(sequence_num::TEXT, 4, '0');
  
  RETURN order_num;
END;
$$ LANGUAGE plpgsql;

-- Limpiar alertas resueltas antiguas
CREATE OR REPLACE FUNCTION cleanup_old_alerts(days_old INTEGER DEFAULT 30)
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