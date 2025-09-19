-- =========================================================
-- CORREGIR ESQUEMA PARA COMPATIBILIDAD CON CÓDIGO EXISTENTE
-- =========================================================

-- 1. AÑADIR CAMPO REFERENCIA (FALTA COMPLETAMENTE)
ALTER TABLE products ADD COLUMN IF NOT EXISTS referencia VARCHAR(50);

-- 2. AÑADIR CAMPO PROVEEDOR_TEXT PARA COMPATIBILIDAD
-- Mantener proveedor_principal como UUID para suppliers
-- Pero añadir proveedor_text para el código existente
ALTER TABLE products ADD COLUMN IF NOT EXISTS proveedor_text TEXT;

-- 3. CREAR ÍNDICES PARA LOS NUEVOS CAMPOS
CREATE INDEX IF NOT EXISTS idx_products_referencia ON products(referencia);
CREATE INDEX IF NOT EXISTS idx_products_proveedor_text ON products(proveedor_text);

-- 4. ACTUALIZAR PRODUCTOS EXISTENTES CON PROVEEDOR_TEXT
UPDATE products SET proveedor_text = 
  CASE 
    WHEN proveedor_principal = '550e8400-e29b-41d4-a716-446655440001' THEN 'Huerta del Sur'
    WHEN proveedor_principal = '550e8400-e29b-41d4-a716-446655440002' THEN 'Carnes Selectas Madrid'
    WHEN proveedor_principal = '550e8400-e29b-41d4-a716-446655440003' THEN 'Lácteos Premium'
    ELSE 'Proveedor General'
  END
WHERE proveedor_text IS NULL;

-- ✅ VERIFICAR ESTRUCTURA FINAL
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'products' 
  AND column_name IN ('referencia', 'proveedor_principal', 'proveedor_text')
ORDER BY column_name;