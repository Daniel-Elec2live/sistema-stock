-- =========================================================
-- DATOS INICIALES (SEED DATA)
-- =========================================================
-- Datos de ejemplo para desarrollo y pruebas
-- =========================================================

-- =========================================================
-- PROVEEDORES
-- =========================================================

INSERT INTO suppliers (id, name, contact_email, contact_phone, address, tax_id, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Huerta del Sur', 'pedidos@huertadelsur.com', '+34 952 123 456', 'Polígono Industrial Las Vegas, Málaga', 'B-29123456', TRUE),
('550e8400-e29b-41d4-a716-446655440002', 'Carnes Selectas Madrid', 'info@carnesselectas.com', '+34 91 456 789', 'Mercamadrid, Nave 142, Madrid', 'B-28456789', TRUE),
('550e8400-e29b-41d4-a716-446655440003', 'Lácteos Premium', 'ventas@lacteospremium.es', '+34 985 789 123', 'Polígono El Olloniego, Asturias', 'B-33789123', TRUE)
ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- PRODUCTOS BASE
-- =========================================================

INSERT INTO products (id, nombre, descripcion, unidad, stock_actual, stock_minimo, stock_maximo, categoria, proveedor_principal, precio_promedio, brand, is_active) VALUES
-- Verduras y hortalizas
('660e8400-e29b-41d4-a716-446655440001', 'Tomate Cherry', 'Tomate cherry extra, calibre 20-25mm', 'kg', 45.500, 10.000, 100.000, 'verduras', '550e8400-e29b-41d4-a716-446655440001', 3.80, 'Huerta del Sur', TRUE),
('660e8400-e29b-41d4-a716-446655440002', 'Rúcula', 'Rúcula fresca en bolsa 150g', 'bolsa', 25.000, 5.000, 50.000, 'verduras', '550e8400-e29b-41d4-a716-446655440001', 2.20, 'Huerta del Sur', TRUE),
('660e8400-e29b-41d4-a716-446655440003', 'Calabacín', 'Calabacín verde extra', 'kg', 18.750, 15.000, 80.000, 'verduras', '550e8400-e29b-41d4-a716-446655440001', 2.10, 'Huerta del Sur', TRUE),
('660e8400-e29b-41d4-a716-446655440004', 'Pimiento Rojo', 'Pimiento rojo de invernadero', 'kg', 8.250, 12.000, 60.000, 'verduras', '550e8400-e29b-41d4-a716-446655440001', 4.50, 'Huerta del Sur', TRUE),

-- Carnes
('660e8400-e29b-41d4-a716-446655440005', 'Solomillo de Ternera', 'Solomillo de ternera extra, pieza entera', 'kg', 12.500, 5.000, 25.000, 'carnes', '550e8400-e29b-41d4-a716-446655440002', 28.50, 'Carnes Selectas', TRUE),
('660e8400-e29b-41d4-a716-446655440006', 'Entrecot de Buey', 'Entrecot de buey madurado 21 días', 'kg', 8.750, 8.000, 40.000, 'carnes', '550e8400-e29b-41d4-a716-446655440002', 35.20, 'Carnes Selectas', TRUE),
('660e8400-e29b-41d4-a716-446655440007', 'Pechuga de Pollo', 'Pechuga de pollo campero', 'kg', 22.000, 15.000, 60.000, 'carnes', '550e8400-e29b-41d4-a716-446655440002', 8.90, 'Carnes Selectas', TRUE),

-- Lácteos
('660e8400-e29b-41d4-a716-446655440008', 'Mozzarella Burrata', 'Mozzarella burrata italiana 250g', 'pieza', 0.000, 6.000, 30.000, 'lacteos', '550e8400-e29b-41d4-a716-446655440003', 4.80, 'Lácteos Premium', TRUE),
('660e8400-e29b-41d4-a716-446655440009', 'Queso Manchego Curado', 'Queso manchego curado DOP, cuña 200g', 'pieza', 15.000, 8.000, 40.000, 'lacteos', '550e8400-e29b-41d4-a716-446655440003', 7.20, 'Lácteos Premium', TRUE),
('660e8400-e29b-41d4-a716-446655440010', 'Nata para Cocinar', 'Nata para cocinar 35% MG', 'litro', 12.500, 10.000, 50.000, 'lacteos', '550e8400-e29b-41d4-a716-446655440003', 1.85, 'Lácteos Premium', TRUE)

ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- LOTES CON CADUCIDADES
-- =========================================================

INSERT INTO batches (id, product_id, supplier_id, cantidad, cantidad_inicial, caducidad, precio_compra, lote_proveedor) VALUES
-- Lotes para Tomate Cherry
('770e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 25.500, 30.000, '2025-09-20', 3.20, 'TC-2024-091'),
('770e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440001', 20.000, 25.000, '2025-09-22', 3.40, 'TC-2024-092'),

-- Lotes para Rúcula
('770e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 15.000, 20.000, '2025-09-18', 1.90, 'RU-2024-091'),
('770e8400-e29b-41d4-a716-446655440004', '660e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440001', 10.000, 15.000, '2025-09-25', 2.10, 'RU-2024-092'),

-- Lotes para Solomillo (sin caducidad próxima)
('770e8400-e29b-41d4-a716-446655440005', '660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', 8.500, 10.000, '2025-09-30', 25.80, 'SOL-2024-091'),
('770e8400-e29b-41d4-a716-446655440006', '660e8400-e29b-41d4-a716-446655440005', '550e8400-e29b-41d4-a716-446655440002', 4.000, 5.000, '2025-10-05', 26.20, 'SOL-2024-092'),

-- Lote para Mozzarella (stock 0 - producto agotado)
('770e8400-e29b-41d4-a716-446655440007', '660e8400-e29b-41d4-a716-446655440008', '550e8400-e29b-41d4-a716-446655440003', 0.000, 12.000, '2025-09-19', 4.20, 'MOZ-2024-091')

ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- USUARIOS Y CLIENTES B2B
-- =========================================================

INSERT INTO users (id, email, password_hash, role, is_active) VALUES
-- Usuario administrador (password: admin123)
('880e8400-e29b-41d4-a716-446655440001', 'admin@latraviata.com', '$2b$12$LQV3c6yTbN1TQgRUdq4RKOGohSeUduxWCYaHV.Gv6zAFh8kdIGGHO', 'admin', TRUE),
-- Cliente B2B de prueba (password: cliente123)
('880e8400-e29b-41d4-a716-446655440002', 'cliente@restaurante.com', '$2b$12$8K9Xq2VyN5Pd8mW3Rf7gZOEtPnL4KgMjIhCaQsWxEfRtYuIoPaSlm', 'customer', TRUE),
-- Manager del backoffice (password: manager123)
('880e8400-e29b-41d4-a716-446655440003', 'manager@latraviata.com', '$2b$12$9L0Yr3WzO6Qe9nX4Sg8hAPFuQoM5LhNkJiDbRtYxFgSuZvJqQbTnn', 'manager', TRUE)

ON CONFLICT (id) DO NOTHING;

INSERT INTO customers (id, user_id, email, name, company_name, phone, address, tax_id, is_approved, approved_by, approved_at) VALUES
-- Cliente principal aprobado
('990e8400-e29b-41d4-a716-446655440001', '880e8400-e29b-41d4-a716-446655440001', 'admin@latraviata.com', 'Administrador La Traviata', 'La Traviata S.L.', '+34 91 123 4567', 'Calle Gran Vía 28, Madrid', 'B-28123456', TRUE, '880e8400-e29b-41d4-a716-446655440003', NOW() - INTERVAL '10 days'),
-- Cliente de prueba aprobado
('990e8400-e29b-41d4-a716-446655440002', '880e8400-e29b-41d4-a716-446655440002', 'cliente@restaurante.com', 'Chef Restaurante', 'Restaurante Gourmet S.L.', '+34 93 987 6543', 'Passeig de Gràcia 125, Barcelona', 'B-08987654', TRUE, '880e8400-e29b-41d4-a716-446655440003', NOW() - INTERVAL '5 days')

ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- DESCUENTOS POR CLIENTE
-- =========================================================

INSERT INTO customer_discounts (customer_id, product_id, category, discount_percentage, is_active, valid_from, created_by) VALUES
-- Descuentos para La Traviata (cliente principal)
('990e8400-e29b-41d4-a716-446655440001', NULL, 'carnes', 12.0, TRUE, NOW() - INTERVAL '5 days', '880e8400-e29b-41d4-a716-446655440003'),
('990e8400-e29b-41d4-a716-446655440001', NULL, 'lacteos', 8.0, TRUE, NOW() - INTERVAL '5 days', '880e8400-e29b-41d4-a716-446655440003'),
('990e8400-e29b-41d4-a716-446655440001', NULL, 'verduras', 5.0, TRUE, NOW() - INTERVAL '5 days', '880e8400-e29b-41d4-a716-446655440003'),

-- Descuento específico en Tomate Cherry para cliente de prueba
('990e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', NULL, 15.0, TRUE, NOW() - INTERVAL '2 days', '880e8400-e29b-41d4-a716-446655440003'),
-- Descuento general para cliente de prueba
('990e8400-e29b-41d4-a716-446655440002', NULL, NULL, 5.0, TRUE, NOW() - INTERVAL '2 days', '880e8400-e29b-41d4-a716-446655440003')

ON CONFLICT DO NOTHING;

-- =========================================================
-- PEDIDOS DE EJEMPLO
-- =========================================================

INSERT INTO orders (id, customer_id, status, order_number, total_amount, total_items, delivery_date, notes) VALUES
-- Pedido entregado
('aa0e8400-e29b-41d4-a716-446655440001', '990e8400-e29b-41d4-a716-446655440001', 'delivered', '20250910-0001', 89.45, 3, '2025-09-11', 'Pedido urgente para evento'),
-- Pedido en preparación
('aa0e8400-e29b-41d4-a716-446655440002', '990e8400-e29b-41d4-a716-446655440002', 'prepared', '20250912-0001', 156.80, 4, '2025-09-13', 'Entregar antes de las 10:00'),
-- Pedido pendiente
('aa0e8400-e29b-41d4-a716-446655440003', '990e8400-e29b-41d4-a716-446655440001', 'pending', NULL, 42.30, 2, '2025-09-14', NULL)

ON CONFLICT (id) DO NOTHING;

-- Líneas del pedido entregado
INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, discount_percentage, total_price) VALUES
('aa0e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440001', 'Tomate Cherry', 5.000, 3.80, 5.0, 18.05),
('aa0e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440005', 'Solomillo de Ternera', 2.000, 28.50, 12.0, 50.16),
('aa0e8400-e29b-41d4-a716-446655440001', '660e8400-e29b-41d4-a716-446655440009', 'Queso Manchego Curado', 3.000, 7.20, 8.0, 19.87),

-- Líneas del pedido en preparación  
('aa0e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440001', 'Tomate Cherry', 8.000, 3.80, 15.0, 25.84),
('aa0e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440006', 'Entrecot de Buey', 3.000, 35.20, 5.0, 100.32),
('aa0e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440007', 'Pechuga de Pollo', 2.500, 8.90, 5.0, 21.14),
('aa0e8400-e29b-41d4-a716-446655440002', '660e8400-e29b-41d4-a716-446655440010', 'Nata para Cocinar', 5.000, 1.85, 5.0, 8.79),

-- Líneas del pedido pendiente
('aa0e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440002', 'Rúcula', 10.000, 2.20, 5.0, 20.90),
('aa0e8400-e29b-41d4-a716-446655440003', '660e8400-e29b-41d4-a716-446655440003', 'Calabacín', 12.000, 2.10, 5.0, 23.94)

ON CONFLICT DO NOTHING;

-- =========================================================
-- HISTÓRICO DE CONSUMO
-- =========================================================

INSERT INTO consumption_history (product_id, quantity, type, order_id, period_year, period_month, period_week) VALUES
-- Consumo del pedido entregado
('660e8400-e29b-41d4-a716-446655440001', 5.000, 'sale', 'aa0e8400-e29b-41d4-a716-446655440001', 2025, 9, 37),
('660e8400-e29b-41d4-a716-446655440005', 2.000, 'sale', 'aa0e8400-e29b-41d4-a716-446655440001', 2025, 9, 37),
('660e8400-e29b-41d4-a716-446655440009', 3.000, 'sale', 'aa0e8400-e29b-41d4-a716-446655440001', 2025, 9, 37),

-- Consumo histórico adicional (últimos meses)
('660e8400-e29b-41d4-a716-446655440001', 25.000, 'sale', NULL, 2025, 8, 35),
('660e8400-e29b-41d4-a716-446655440001', 18.500, 'sale', NULL, 2025, 8, 33),
('660e8400-e29b-41d4-a716-446655440005', 8.000, 'sale', NULL, 2025, 8, 35),
('660e8400-e29b-41d4-a716-446655440007', 12.000, 'sale', NULL, 2025, 8, 34)

ON CONFLICT DO NOTHING;

-- =========================================================
-- ALERTAS INICIALES
-- =========================================================

INSERT INTO alerts (type, severity, title, message, entity_type, entity_id, is_read, metadata) VALUES
-- Alerta de stock crítico para Pimiento Rojo
('stock_critical', 'high', 'Stock crítico', 'Pimiento Rojo - Stock: 8.25 (Mínimo: 12)', 'product', '660e8400-e29b-41d4-a716-446655440004', FALSE, 
 '{"stock_actual": 8.25, "stock_minimo": 12.0, "product_name": "Pimiento Rojo"}'::jsonb),

-- Alerta de producto agotado para Mozzarella
('stock_out', 'critical', 'Sin stock', 'Mozzarella Burrata - Stock: 0 (Mínimo: 6)', 'product', '660e8400-e29b-41d4-a716-446655440008', FALSE,
 '{"stock_actual": 0, "stock_minimo": 6.0, "product_name": "Mozzarella Burrata"}'::jsonb),

-- Alerta de caducidad próxima para Rúcula
('expiry_warning', 'medium', 'Próxima caducidad', 'Rúcula - Caduca: 2025-09-18 (Cantidad: 15)', 'batch', '770e8400-e29b-41d4-a716-446655440003', FALSE,
 '{"product_name": "Rúcula", "cantidad": 15.0, "caducidad": "2025-09-18", "days_to_expiry": 6}'::jsonb),

-- Alerta de caducidad crítica para Mozzarella
('expiry_warning', 'critical', 'Próxima caducidad', 'Mozzarella Burrata - Caduca: 2025-09-19 (Cantidad: 0)', 'batch', '770e8400-e29b-41d4-a716-446655440007', FALSE,
 '{"product_name": "Mozzarella Burrata", "cantidad": 0, "caducidad": "2025-09-19", "days_to_expiry": 7}'::jsonb)

ON CONFLICT DO NOTHING;

-- =========================================================
-- ENTRADAS DE EJEMPLO
-- =========================================================

INSERT INTO entries (id, tipo, estado, supplier_id, proveedor_text, fecha_factura, numero_factura, total_items, total_amount, validated_by, validated_at, productos) VALUES
-- Entrada validada reciente
('bb0e8400-e29b-41d4-a716-446655440001', 'ocr', 'validated', '550e8400-e29b-41d4-a716-446655440001', 'Huerta del Sur', '2025-09-10', 'HDS-2025-0891', 2, 165.00, '880e8400-e29b-41d4-a716-446655440003', NOW() - INTERVAL '2 days',
 '[
   {"nombre": "Tomate Cherry", "cantidad": 30.0, "precio": 3.2, "unidad": "kg", "caducidad": "2025-09-20", "lote": "TC-2024-091", "confianza": 0.95},
   {"nombre": "Calabacín", "cantidad": 25.0, "precio": 2.0, "unidad": "kg", "caducidad": "2025-09-28", "lote": "CAL-2024-091", "confianza": 0.88}
 ]'::jsonb),

-- Entrada pendiente de validar
('bb0e8400-e29b-41d4-a716-446655440002', 'ocr', 'processing', '550e8400-e29b-41d4-a716-446655440002', 'Carnes Selectas Madrid', '2025-09-12', 'CS-2025-1205', 1, 285.00, NULL, NULL,
 '[
   {"nombre": "Solomillo de Ternera", "cantidad": 10.0, "precio": 28.5, "unidad": "kg", "caducidad": "2025-10-05", "lote": "SOL-2024-092", "confianza": 0.92}
 ]'::jsonb)

ON CONFLICT (id) DO NOTHING;

-- =========================================================
-- AJUSTES DE STOCK DE EJEMPLO
-- =========================================================

INSERT INTO stock_adjustments (product_id, tipo, cantidad, cantidad_anterior, motivo, observaciones, usuario) VALUES
-- Merma en Rúcula
('660e8400-e29b-41d4-a716-446655440002', 'merma', -5.000, 30.000, 'Producto deteriorado', 'Lote RU-2024-091 con hojas amarillentas', 'manager'),
-- Corrección de inventario en Pechuga de Pollo
('660e8400-e29b-41d4-a716-446655440007', 'correccion', 2.000, 20.000, 'Error en conteo anterior', 'Reconteo físico realizado', 'manager')

ON CONFLICT DO NOTHING;

-- =========================================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- =========================================================

COMMENT ON TABLE suppliers IS 'Proveedores con datos de contacto y facturación';
COMMENT ON TABLE products IS 'Productos con stock actual (verdad única para B2B)';  
COMMENT ON TABLE customers IS 'Clientes B2B aprobados para realizar pedidos';
COMMENT ON TABLE orders IS 'Pedidos B2B en diferentes estados del flujo';

-- =========================================================
-- VERIFICACIÓN FINAL
-- =========================================================

-- Mostrar estadísticas de los datos insertados
DO $$
BEGIN
  RAISE NOTICE 'DATOS INICIALES INSERTADOS:';
  RAISE NOTICE '- Proveedores: %', (SELECT COUNT(*) FROM suppliers);
  RAISE NOTICE '- Productos: %', (SELECT COUNT(*) FROM products);
  RAISE NOTICE '- Lotes: %', (SELECT COUNT(*) FROM batches);  
  RAISE NOTICE '- Usuarios: %', (SELECT COUNT(*) FROM users);
  RAISE NOTICE '- Clientes: %', (SELECT COUNT(*) FROM customers);
  RAISE NOTICE '- Descuentos: %', (SELECT COUNT(*) FROM customer_discounts);
  RAISE NOTICE '- Pedidos: %', (SELECT COUNT(*) FROM orders);
  RAISE NOTICE '- Líneas pedido: %', (SELECT COUNT(*) FROM order_items);
  RAISE NOTICE '- Alertas: %', (SELECT COUNT(*) FROM alerts);
  RAISE NOTICE '- Entradas: %', (SELECT COUNT(*) FROM entries);
  RAISE NOTICE '- Ajustes: %', (SELECT COUNT(*) FROM stock_adjustments);
  RAISE NOTICE 'Base de datos inicializada correctamente.';
END $$;