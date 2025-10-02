# Migraciones SQL de Supabase

Este directorio contiene todas las migraciones SQL que deben ejecutarse en Supabase.

## ⚠️ IMPORTANTE: Cómo ejecutar migraciones

Las migraciones en esta carpeta **NO se ejecutan automáticamente**. Debes ejecutarlas manualmente:

1. Ve a tu proyecto en Supabase: https://supabase.com/dashboard
2. Haz clic en **SQL Editor** en el menú lateral
3. Abre el archivo de migración que necesites ejecutar
4. Copia todo su contenido
5. Pégalo en el SQL Editor
6. Haz clic en **"Run"** (botón verde)

## 📋 Migraciones disponibles

### 99-fix-rls-service-role.sql
**Estado:** ✅ Ejecutada
**Descripción:** Desactiva RLS en tablas orders, order_items, order_logs para permitir acceso desde backoffice con service_role key.

### 100-add-payment-status.sql
**Estado:** ✅ Ejecutada
**Descripción:** Añade la columna `payment_status` a la tabla `orders` con valores 'pending' o 'paid'.

### 101-fix-payment-status-persistence.sql
**Estado:** ⏳ PENDIENTE - **EJECUTAR AHORA**
**Descripción:** Arregla el problema de que `payment_status` se resetea a 'pending' después de refrescar la página.

**¿Por qué?** El DEFAULT constraint estaba sobrescribiendo los UPDATE. Esta migración reconstruye la columna correctamente para que:
- Los **INSERT** (pedidos nuevos) tengan 'pending' por defecto
- Los **UPDATE** (cambios de pago) mantengan el valor actualizado

## 🔄 Orden de ejecución

Ejecuta las migraciones en orden numérico:
1. ✅ 99-fix-rls-service-role.sql (ya ejecutada)
2. ✅ 100-add-payment-status.sql (ya ejecutada)
3. ⏳ **101-fix-payment-status-persistence.sql** (EJECUTAR AHORA)

## 🧪 Verificar después de ejecutar

Después de ejecutar la migración 101, verifica que funciona:

```sql
-- 1. Cambiar un pedido a 'paid'
UPDATE public.orders
SET payment_status = 'paid'
WHERE id = (SELECT id FROM public.orders LIMIT 1);

-- 2. Verificar que se guardó
SELECT id, payment_status, status
FROM public.orders
LIMIT 5;
```

Si ves que el pedido tiene `payment_status = 'paid'`, la migración funcionó correctamente.
