# 🗃️ SUPABASE DATABASE SCHEMA

Schema completo y definitivo para el sistema de gestión de stock con Backoffice interno y Tienda B2B.

## 🏗️ ARQUITECTURA DE DATOS

### Verdad Única del Stock
- **`products.stock_actual`**: Stock global disponible para B2B (verdad única)
- **`batches`**: Lotes internos para alertas de caducidad (no afecta stock global directamente)
- **Triggers automáticos**: Reserva/reposición de stock al confirmar/cancelar pedidos

### Separación de Responsabilidades
- **Backoffice**: Gestión completa vía `service_role` (entradas, ajustes, alertas)
- **B2B**: Acceso limitado vía `authenticated` (solo lectura productos, gestión pedidos propios)

## 📋 INSTRUCCIONES DE INSTALACIÓN

### 1. Ejecutar en Supabase SQL Editor

Ejecuta los archivos **en orden** en el SQL Editor de tu proyecto Supabase:

```sql
-- 1. Schema base (tablas e índices)
-- Pegar contenido de: 01-schema-complete.sql

-- 2. Funciones de negocio
-- Pegar contenido de: 02-functions.sql

-- 3. Triggers automáticos
-- Pegar contenido de: 03-triggers.sql

-- 4. Políticas RLS
-- Pegar contenido de: 04-rls-policies.sql

-- 5. Datos iniciales
-- Pegar contenido de: 05-seed-data.sql

-- 6. Migración: Simplificar proveedores
-- Pegar contenido de: 06-remove-suppliers-migration.sql

-- 7. ⏳ PENDIENTE: Migración estado de pago
-- Pegar contenido de: 07-add-payment-status.sql
```

> ⚠️ **IMPORTANTE:** El archivo `07-add-payment-status.sql` está pendiente de aplicar.
> Añade campos para gestionar estado de pago en pedidos (pending/paid/partial/overdue).

### 2. Configurar Storage (Manual en Dashboard)

En **Storage > Buckets** crear:

```sql
-- Bucket para documentos OCR (privado)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) 
VALUES (
  'documentos', 'documentos', false, 52428800,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
);

-- Bucket para imágenes de productos (público)  
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'productos', 'productos', true, 10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
);
```

En **Storage > Policies** añadir políticas del archivo `04-rls-policies.sql` (sección comentada).

## 📊 ESTRUCTURA DE TABLAS

### Core Tables
- **`suppliers`**: Proveedores con datos de contacto
- **`products`**: Productos con stock global (verdad única) 
- **`batches`**: Lotes para control de caducidades
- **`entries`**: Entradas de mercancía (OCR + manual)
- **`stock_adjustments`**: Mermas, correcciones, inventarios

### B2B Tables  
- **`users`**: Usuarios del sistema (admin, customer, manager)
- **`customers`**: Clientes B2B con aprobación requerida
- **`customer_discounts`**: Descuentos por cliente/producto/categoría
- **`orders`**: Pedidos con estados (pending → confirmed → prepared → delivered)
- **`order_items`**: Líneas de pedido con precios y descuentos

### System Tables
- **`alerts`**: Notificaciones (stock crítico, caducidades, etc.)
- **`consumption_history`**: Histórico para análisis y forecast
- **`audit_logs`**: Logs de auditoría para trazabilidad

## 🔧 FUNCIONES CLAVE

### Gestión de Stock
- **`reserve_stock(product_id, quantity)`**: Reserva stock al confirmar pedidos
- **`restore_stock(product_id, quantity)`**: Repone stock al cancelar pedidos  
- **`adjust_stock(...)`**: Ajustes manuales con trazabilidad

### Alertas Automáticas
- **`generate_stock_alerts()`**: Detecta productos con stock crítico
- **`generate_expiry_alerts()`**: Detecta lotes próximos a caducar

### Análisis y Forecast
- **`get_product_consumption_stats(product_id)`**: Estadísticas de consumo
- **`get_restock_suggestions()`**: Sugerencias de reposición inteligentes

## 🛡️ SEGURIDAD (RLS)

### Backoffice (Service Role)
✅ **Acceso completo** a todas las tablas para gestión interna

### B2B (Authenticated Users)  
✅ **Lectura**: Productos activos, sus propios pedidos, descuentos asignados  
✅ **Escritura**: Crear/modificar solo sus propios pedidos  
❌ **Prohibido**: Datos internos (lotes, entradas, alertas, ajustes)

### Funciones de Utilidad RLS
- **`is_approved_customer()`**: Verifica si puede hacer pedidos
- **`get_customer_id()`**: Obtiene ID de cliente del usuario autenticado

## 📝 DATOS DE PRUEBA

El schema incluye datos realistas para desarrollo:

### Proveedores
- **Huerta del Sur** (verduras): `pedidos@huertadelsur.com`
- **Carnes Selectas Madrid**: `info@carnesselectas.com`  
- **Lácteos Premium**: `ventas@lacteospremium.es`

### Productos
- **10 productos** en 3 categorías (verduras, carnes, lácteos)
- **Stock variado**: algunos críticos, uno agotado
- **Precios promedio** y marcas asignadas

### Usuarios B2B
- **Admin**: `admin@latraviata.com` / `admin123`
- **Cliente**: `cliente@restaurante.com` / `cliente123` 
- **Manager**: `manager@latraviata.com` / `manager123`

### Clientes con Descuentos
- **La Traviata**: 12% carnes, 8% lácteos, 5% verduras
- **Restaurante Gourmet**: 15% en tomate cherry, 5% general

### Pedidos de Ejemplo
- **3 pedidos** en diferentes estados con líneas realistas
- **Histórico de consumo** para análisis de tendencias
- **4 alertas activas** (stock crítico, caducidades)

## 🔍 CONSULTAS ÚTILES

### Dashboard de Stock
```sql
-- Vista resumen para dashboard
SELECT * FROM dashboard_stats;

-- Productos con stock crítico
SELECT * FROM get_critical_stock_products();

-- Sugerencias de reposición  
SELECT * FROM get_restock_suggestions(10);
```

### Alertas Pendientes
```sql
-- Alertas no leídas por severidad
SELECT severity, COUNT(*) 
FROM alerts 
WHERE is_read = FALSE 
GROUP BY severity;

-- Generar alertas automáticas
SELECT generate_stock_alerts();
SELECT generate_expiry_alerts();
```

### Análisis B2B
```sql
-- Pedidos por cliente último mes
SELECT c.company_name, COUNT(*) as pedidos, SUM(o.total_amount) as facturación
FROM orders o
JOIN customers c ON c.id = o.customer_id  
WHERE o.created_at >= NOW() - INTERVAL '30 days'
GROUP BY c.id, c.company_name;

-- Productos más vendidos
SELECT p.nombre, SUM(ch.quantity) as total_vendido
FROM consumption_history ch
JOIN products p ON p.id = ch.product_id
WHERE ch.type = 'sale' AND ch.created_at >= NOW() - INTERVAL '90 days'
GROUP BY p.id, p.nombre
ORDER BY total_vendido DESC;
```

## ⚠️ NOTAS IMPORTANTES

1. **Service Role Key**: Solo usar en API Routes del servidor, nunca en cliente
2. **Triggers automáticos**: Reserva/reposición de stock al cambiar estado de pedidos
3. **Validación entradas**: Los productos se crean automáticamente si no existen
4. **Limpieza**: Las alertas resueltas se limpian automáticamente tras 30 días
5. **Auditoría**: Todos los cambios importantes se registran en `audit_logs`

## 🚀 PRÓXIMOS PASOS

1. **Probar** las consultas básicas con datos de ejemplo
2. **Configurar** las variables de entorno en Vercel
3. **Implementar** las API Routes que consuman estas funciones
4. **Conectar** con el servicio OCR para procesar entradas
5. **Personalizar** alertas y umbrales según necesidades específicas