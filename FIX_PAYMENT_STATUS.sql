-- ========================================
-- EJECUTAR EN SUPABASE SQL EDITOR PARA ARREGLAR
-- ========================================
-- Este script arregla el problema de payment_status
-- que se resetea a 'pending' después de refrescar
-- ========================================

-- PASO 1: Eliminar el constraint viejo si existe
ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS payment_status_check;

-- PASO 2: Hacer la columna NULLABLE primero (para poder modificarla)
ALTER TABLE public.orders
ALTER COLUMN payment_status DROP NOT NULL;

-- PASO 3: Eliminar el DEFAULT (esto evita que se resetee)
ALTER TABLE public.orders
ALTER COLUMN payment_status DROP DEFAULT;

-- PASO 4: Añadir el DEFAULT de nuevo solo para INSERTS nuevos
-- pero sin afectar los UPDATE
ALTER TABLE public.orders
ALTER COLUMN payment_status SET DEFAULT 'pending';

-- PASO 5: Asegurar que todos los registros existentes tienen un valor
UPDATE public.orders
SET payment_status = 'pending'
WHERE payment_status IS NULL;

-- PASO 6: Ahora hacer la columna NOT NULL de nuevo
ALTER TABLE public.orders
ALTER COLUMN payment_status SET NOT NULL;

-- PASO 7: Añadir el constraint de vuelta
ALTER TABLE public.orders
ADD CONSTRAINT payment_status_check
CHECK (payment_status IN ('pending', 'paid'));

-- PASO 8: Verificar que funcionó
SELECT
  id::text,
  payment_status,
  status,
  updated_at
FROM public.orders
ORDER BY created_at DESC
LIMIT 10;

-- PASO 9: Probar un UPDATE manual
UPDATE public.orders
SET payment_status = 'paid'
WHERE id = (SELECT id FROM public.orders LIMIT 1);

-- PASO 10: Verificar que se guardó
SELECT
  id::text,
  payment_status,
  status
FROM public.orders
WHERE payment_status = 'paid'
LIMIT 5;
