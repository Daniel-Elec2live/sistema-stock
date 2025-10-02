-- ========================================
-- EJECUTAR ESTE SQL EN SUPABASE SQL EDITOR
-- ========================================
-- Ve a: https://supabase.com/dashboard/project/[tu-proyecto]/sql/new
-- Copia y pega este código completo
-- Haz clic en "Run"
-- ========================================

-- Añadir columna payment_status a la tabla orders
DO $$
BEGIN
  -- Verificar si la columna existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'orders'
      AND column_name = 'payment_status'
  ) THEN
    -- Añadir la columna
    ALTER TABLE public.orders
    ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending';

    -- Añadir constraint
    ALTER TABLE public.orders
    ADD CONSTRAINT payment_status_check
    CHECK (payment_status IN ('pending', 'paid'));

    RAISE NOTICE '✅ Columna payment_status añadida correctamente';
  ELSE
    RAISE NOTICE '⚠️  Columna payment_status ya existe';
  END IF;

  -- Asegurar que todos los registros existentes tengan valor
  UPDATE public.orders
  SET payment_status = 'pending'
  WHERE payment_status IS NULL OR payment_status = '';

  RAISE NOTICE '✅ Migración completada - Todos los pedidos tienen payment_status';
END $$;

-- Verificar que funcionó
SELECT
  COUNT(*) as total_orders,
  COUNT(payment_status) as orders_with_payment_status,
  payment_status,
  COUNT(*) as count
FROM public.orders
GROUP BY payment_status;
