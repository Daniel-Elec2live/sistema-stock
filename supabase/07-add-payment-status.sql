-- =========================================================
-- MIGRACIÓN: Añadir estado de pago a pedidos
-- =========================================================
-- Fecha: 2025-09-30
-- Descripción: Añade campo payment_status a la tabla orders
--              para gestionar pagos pendientes/completados
-- =========================================================

-- Añadir columna payment_status a orders
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_status VARCHAR(20)
DEFAULT 'pending'
CHECK (payment_status IN ('pending', 'paid', 'partial', 'overdue'));

-- Añadir comentario explicativo
COMMENT ON COLUMN orders.payment_status IS 'Estado de pago: pending (pendiente), paid (pagado), partial (pago parcial), overdue (vencido)';

-- Índice para consultas por estado de pago
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status) WHERE payment_status != 'paid';

-- Actualizar pedidos existentes según su status
-- Los pedidos entregados se marcan como pagados por defecto
UPDATE orders
SET payment_status = 'paid'
WHERE status = 'delivered' AND payment_status = 'pending';

-- Los pedidos cancelados no requieren pago
UPDATE orders
SET payment_status = 'paid'
WHERE status = 'cancelled' AND payment_status = 'pending';

-- Añadir campos opcionales para tracking de pagos
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100),
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Comentarios
COMMENT ON COLUMN orders.payment_method IS 'Método de pago: cash, transfer, card, etc.';
COMMENT ON COLUMN orders.payment_reference IS 'Número de referencia/transacción del pago';
COMMENT ON COLUMN orders.paid_at IS 'Fecha y hora en que se marcó como pagado';

-- Trigger para actualizar paid_at automáticamente
CREATE OR REPLACE FUNCTION update_paid_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
    NEW.paid_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_paid_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_paid_at();

-- =========================================================
-- VERIFICACIÓN
-- =========================================================
-- Para verificar que la migración se aplicó correctamente:
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'orders'
-- AND column_name IN ('payment_status', 'payment_method', 'payment_reference', 'paid_at');
