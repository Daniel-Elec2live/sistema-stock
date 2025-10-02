-- ========================================
-- EJECUTAR EN SUPABASE SQL EDITOR PARA DEBUG
-- ========================================

-- 1. Verificar la estructura de la columna payment_status
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'orders'
  AND column_name = 'payment_status';

-- 2. Ver todos los triggers en la tabla orders
SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'orders'
  AND event_object_schema = 'public';

-- 3. Hacer un UPDATE de prueba y verificar
-- Cambiar el pedido e6ffd2ab a 'paid'
UPDATE public.orders
SET payment_status = 'paid'
WHERE id = 'e6ffd2ab-0178-4ad1-9abc-906d49e26171';

-- Verificar que se guardó
SELECT
  id,
  payment_status,
  updated_at,
  created_at
FROM public.orders
WHERE id = 'e6ffd2ab-0178-4ad1-9abc-906d49e26171';

-- 4. Ver el historial de cambios (si existe tabla de logs)
SELECT * FROM public.order_logs
WHERE order_id = 'e6ffd2ab-0178-4ad1-9abc-906d49e26171'
ORDER BY created_at DESC
LIMIT 5;
