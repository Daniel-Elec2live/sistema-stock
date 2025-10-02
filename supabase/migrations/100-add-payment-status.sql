-- Añadir columna payment_status a la tabla orders si no existe
-- Todos los pedidos tienen estado de pago (pending por defecto)

DO $$
BEGIN
  -- Añadir columna si no existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'payment_status'
  ) THEN
    ALTER TABLE orders
    ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (payment_status IN ('pending', 'paid'));

    RAISE NOTICE 'Columna payment_status añadida a tabla orders';
  ELSE
    RAISE NOTICE 'Columna payment_status ya existe';
  END IF;

  -- Asegurar que registros existentes tengan valor por defecto
  UPDATE orders
  SET payment_status = 'pending'
  WHERE payment_status IS NULL;

  RAISE NOTICE 'Migración payment_status completada';
END $$;
