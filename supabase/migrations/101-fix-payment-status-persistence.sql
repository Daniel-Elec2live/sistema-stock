-- ========================================
-- FIX: payment_status se resetea a pending después de refrescar
-- ========================================
-- Problema: El DEFAULT constraint puede estar causando que los UPDATE
-- reseteen el valor a 'pending' en lugar de mantener el valor actualizado
-- ========================================

-- PASO 1: Eliminar constraint viejo
ALTER TABLE public.orders
DROP CONSTRAINT IF EXISTS payment_status_check;

-- PASO 2: Reconstruir la columna correctamente
-- Primero hacerla nullable temporalmente
ALTER TABLE public.orders
ALTER COLUMN payment_status DROP NOT NULL;

-- PASO 3: Eliminar y recrear el DEFAULT
-- Esto asegura que solo se aplica en INSERT, no en UPDATE
ALTER TABLE public.orders
ALTER COLUMN payment_status DROP DEFAULT;

ALTER TABLE public.orders
ALTER COLUMN payment_status SET DEFAULT 'pending';

-- PASO 4: Asegurar que todos los registros tienen un valor
UPDATE public.orders
SET payment_status = 'pending'
WHERE payment_status IS NULL;

-- PASO 5: Hacer la columna NOT NULL de nuevo
ALTER TABLE public.orders
ALTER COLUMN payment_status SET NOT NULL;

-- PASO 6: Recrear el constraint
ALTER TABLE public.orders
ADD CONSTRAINT payment_status_check
CHECK (payment_status IN ('pending', 'paid'));

-- PASO 7: Verificación
SELECT
  COUNT(*) as total,
  payment_status,
  COUNT(*) as count
FROM public.orders
GROUP BY payment_status;
