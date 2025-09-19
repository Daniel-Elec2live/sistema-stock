# 📋 EJEMPLOS END-TO-END - SISTEMA STOCK

Ejemplos completos de flujos reales con comandos copiables para probar todo el sistema.

## 🔧 CONFIGURACIÓN INICIAL

### 1. Setup de Supabase
```sql
-- En el SQL Editor de Supabase, ejecutar en orden:

-- 1. Schema base
-- Pegar contenido completo de: supabase/01-schema-complete.sql

-- 2. Funciones
-- Pegar contenido completo de: supabase/02-functions.sql

-- 3. Triggers  
-- Pegar contenido completo de: supabase/03-triggers.sql

-- 4. Políticas RLS
-- Pegar contenido completo de: supabase/04-rls-policies.sql

-- 5. Datos iniciales
-- Pegar contenido completo de: supabase/05-seed-data.sql
```

### 2. Variables de Entorno (Vercel)
```bash
# En Vercel Dashboard > Project Settings > Environment Variables:

NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
JWT_SECRET=your_super_secure_jwt_secret_32_chars
OCR_SERVICE_URL=https://your-ocr.hetzner.com
OCR_BASIC_AUTH_USER=ocr_production
OCR_BASIC_AUTH_PASSWORD=super_secure_password
OCR_CALLBACK_SECRET=callback_secret_key
```

### 3. Desplegar OCR Service en Hetzner
```bash
# En servidor Hetzner:
git clone <your-repo>
cd sistema-stock/services/ocr

# Configurar variables
cp .env.example .env
nano .env
# (Configurar credenciales de producción)

# Levantar servicio
docker-compose -f docker-compose.prod.yml up -d

# Verificar
curl -u ocr_production:super_secure_password \
  http://your-server-ip:8000/health
```

## 📊 EJEMPLO 1: FLUJO COMPLETO OCR → STOCK

### Paso 1: Subir Albarán para OCR (Backoffice)
```bash
# Simular subida de archivo desde Backoffice
curl -X POST "https://sistema-stock-backoffice.vercel.app/api/ocr/upload" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: multipart/form-data" \
  -F "file=@examples/albaran-huerta-del-sur.jpg" \
  -F "supplier_id=550e8400-e29b-41d4-a716-446655440001"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Archivo subido, OCR en proceso",
  "data": {
    "entry_id": "bb0e8400-e29b-41d4-a716-446655440003",
    "processing_id": "12345678-abcd-1234-efgh-123456789012",
    "status": "processing"
  }
}
```

### Paso 2: OCR Procesa y Envía Callback
```bash
# El servicio OCR automáticamente llama:
# POST https://sistema-stock-backoffice.vercel.app/api/ocr/callback

# Con payload tipo:
{
  "success": true,
  "processing_id": "12345678-abcd-1234-efgh-123456789012",
  "proveedor": {
    "nombre": "Huerta del Sur S.L.",
    "cif": "B-29123456",
    "confianza": 0.85
  },
  "documento": {
    "tipo": "albarán",
    "numero": "HDS-2024-0892", 
    "fecha": "2024-09-15",
    "total": 89.45
  },
  "productos": [
    {
      "nombre": "Tomate Cherry",
      "cantidad": 10.0,
      "unidad": "kg",
      "precio": 3.80,
      "confianza": 0.92
    },
    {
      "nombre": "Calabacín",
      "cantidad": 8.5,
      "unidad": "kg", 
      "precio": 2.10,
      "confianza": 0.88
    }
  ],
  "confianza_general": 0.87,
  "tiempo_procesamiento": 3.2
}
```

### Paso 3: Ver Propuesta OCR (Backoffice)
```bash
# Obtener entrada procesada
curl "https://sistema-stock-backoffice.vercel.app/api/entries/bb0e8400-e29b-41d4-a716-446655440003" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "id": "bb0e8400-e29b-41d4-a716-446655440003",
    "tipo": "ocr",
    "estado": "completed",
    "proveedor_text": "Huerta del Sur S.L.",
    "fecha_factura": "2024-09-15",
    "numero_factura": "HDS-2024-0892",
    "productos": [
      {
        "nombre": "Tomate Cherry",
        "cantidad": 10.0,
        "precio": 3.80,
        "confianza": 0.92
      },
      {
        "nombre": "Calabacín", 
        "cantidad": 8.5,
        "precio": 2.10,
        "confianza": 0.88
      }
    ],
    "total_items": 2,
    "total_amount": 55.85,
    "ocr_confidence": 0.87
  }
}
```

### Paso 4: Validar Entrada → Actualizar Stock
```bash
# Validar entrada (actualiza stock automáticamente)
curl -X POST "https://sistema-stock-backoffice.vercel.app/api/entries/bb0e8400-e29b-41d4-a716-446655440003/validate" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
```

**Resultado:** 
- ✅ Stock de "Tomate Cherry" aumenta en 10.0 kg
- ✅ Stock de "Calabacín" aumenta en 8.5 kg  
- ✅ Se crean lotes correspondientes
- ✅ Se genera alerta: "Entrada procesada"

### Paso 5: Verificar Stock Actualizado
```sql
-- Consultar en Supabase SQL Editor:
SELECT nombre, stock_actual, updated_at 
FROM products 
WHERE nombre IN ('Tomate Cherry', 'Calabacín');
```

## 🛒 EJEMPLO 2: FLUJO COMPLETO PEDIDO B2B

### Paso 1: Login Cliente B2B
```bash
# Autenticación (implementar según tu auth system)
curl -X POST "https://sistema-stock-b2b.vercel.app/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "cliente@restaurante.com",
    "password": "cliente123"
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "880e8400-e29b-41d4-a716-446655440002",
      "email": "cliente@restaurante.com"
    },
    "customer": {
      "id": "990e8400-e29b-41d4-a716-446655440002", 
      "company_name": "Restaurante Gourmet S.L.",
      "is_approved": true
    }
  }
}
```

### Paso 2: Ver Catálogo con Descuentos
```bash
# Obtener productos con descuentos aplicados
curl "https://sistema-stock-b2b.vercel.app/api/stock?category=verduras" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": [
    {
      "id": "660e8400-e29b-41d4-a716-446655440001",
      "nombre": "Tomate Cherry",
      "stock_actual": 55.5,
      "precio_promedio": 3.80,
      "discount_percentage": 15.0,
      "final_price": 3.23,
      "categoria": "verduras",
      "unidad": "kg"
    },
    {
      "id": "660e8400-e29b-41d4-a716-446655440003", 
      "nombre": "Calabacín",
      "stock_actual": 27.25,
      "precio_promedio": 2.10,
      "discount_percentage": 5.0,
      "final_price": 2.00,
      "categoria": "verduras",
      "unidad": "kg"
    }
  ],
  "pagination": {
    "page": 1,
    "total": 2,
    "total_pages": 1
  }
}
```

### Paso 3: Crear Pedido
```bash
# Crear pedido con productos del catálogo
curl -X POST "https://sistema-stock-b2b.vercel.app/api/orders" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "product_id": "660e8400-e29b-41d4-a716-446655440001",
        "quantity": 8.5
      },
      {
        "product_id": "660e8400-e29b-41d4-a716-446655440003", 
        "quantity": 12.0
      }
    ],
    "delivery_date": "2024-09-16",
    "notes": "Pedido urgente para evento"
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Pedido creado exitosamente",
  "data": {
    "id": "aa0e8400-e29b-41d4-a716-446655440004",
    "order_number": null,
    "status": "pending", 
    "customer_id": "990e8400-e29b-41d4-a716-446655440002",
    "total_amount": 51.46,
    "total_items": 2,
    "delivery_date": "2024-09-16",
    "notes": "Pedido urgente para evento",
    "items": [
      {
        "product_name": "Tomate Cherry",
        "quantity": 8.5,
        "unit_price": 3.80,
        "discount_percentage": 15.0,
        "total_price": 27.46
      },
      {
        "product_name": "Calabacín",
        "quantity": 12.0, 
        "unit_price": 2.10,
        "discount_percentage": 5.0,
        "total_price": 23.94
      }
    ]
  }
}
```

### Paso 4: Confirmar Pedido (Trigger Automático de Reserva)
```sql
-- Simular confirmación desde Backoffice (cambio de estado):
UPDATE orders 
SET status = 'confirmed' 
WHERE id = 'aa0e8400-e29b-41d4-a716-446655440004';

-- El trigger automáticamente:
-- 1. Reserva 8.5 kg de Tomate Cherry 
-- 2. Reserva 12.0 kg de Calabacín
-- 3. Genera número de pedido
-- 4. Registra en consumption_history
```

### Paso 5: Verificar Stock Reservado
```sql
-- Stock actualizado tras confirmación:
SELECT nombre, stock_actual 
FROM products 
WHERE id IN (
  '660e8400-e29b-41d4-a716-446655440001',  -- Tomate Cherry
  '660e8400-e29b-41d4-a716-446655440003'   -- Calabacín
);

-- Resultado esperado:
-- Tomate Cherry: 47.0 kg (era 55.5, reservó 8.5)
-- Calabacín: 15.25 kg (era 27.25, reservó 12.0)
```

### Paso 6: Cliente Consulta Estado del Pedido
```bash
curl "https://sistema-stock-b2b.vercel.app/api/orders/aa0e8400-e29b-41d4-a716-446655440004" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "id": "aa0e8400-e29b-41d4-a716-446655440004",
    "order_number": "20240915-0001",
    "status": "confirmed",
    "total_amount": 51.46,
    "delivery_date": "2024-09-16",
    "created_at": "2024-09-15T14:30:00Z",
    "items": [
      {
        "product_name": "Tomate Cherry",
        "quantity": 8.5,
        "total_price": 27.46
      },
      {
        "product_name": "Calabacín", 
        "quantity": 12.0,
        "total_price": 23.94
      }
    ]
  }
}
```

## ⚠️ EJEMPLO 3: MANEJO DE ALERTAS

### Paso 1: Generar Alertas Automáticas
```bash
# Forzar generación de alertas
curl -X POST "https://sistema-stock-backoffice.vercel.app/api/alerts/generate" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": {
    "stock_alerts_generated": 2,
    "expiry_alerts_generated": 1
  }
}
```

### Paso 2: Consultar Alertas Pendientes  
```bash
# Ver alertas no leídas de alta prioridad
curl "https://sistema-stock-backoffice.vercel.app/api/alerts?is_read=false&severity=high" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
```

**Respuesta esperada:**
```json
{
  "success": true,
  "data": [
    {
      "id": "alert-uuid-001",
      "type": "stock_critical",
      "severity": "high", 
      "title": "Stock crítico",
      "message": "Pimiento Rojo - Stock: 4.25 (Mínimo: 12)",
      "entity_type": "product",
      "entity_id": "660e8400-e29b-41d4-a716-446655440004",
      "is_read": false,
      "created_at": "2024-09-15T15:00:00Z",
      "metadata": {
        "stock_actual": 4.25,
        "stock_minimo": 12.0,
        "product_name": "Pimiento Rojo"
      }
    }
  ]
}
```

### Paso 3: Marcar Alerta como Leída y Resolverla
```bash
# Marcar como leída
curl -X PATCH "https://sistema-stock-backoffice.vercel.app/api/alerts/alert-uuid-001/mark-read" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"

# Resolver alerta después de tomar acción
curl -X PATCH "https://sistema-stock-backoffice.vercel.app/api/alerts/alert-uuid-001/resolve" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}"
```

## 🔧 EJEMPLO 4: AJUSTE MANUAL DE STOCK

### Caso: Merma por Producto Deteriorado
```bash
# Registrar merma de 3 kg de rúcula
curl -X POST "https://sistema-stock-backoffice.vercel.app/api/stock/adjustment" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "product_id": "660e8400-e29b-41d4-a716-446655440002",
    "tipo": "merma", 
    "cantidad": -3.0,
    "motivo": "Producto deteriorado en cámara",
    "observaciones": "Lote RU-2024-092, hojas amarillentas detectadas durante revisión"
  }'
```

**Respuesta esperada:**
```json
{
  "success": true,
  "message": "Ajuste realizado exitosamente",
  "data": {
    "adjustment_id": "adj-uuid-001",
    "product_name": "Rúcula",
    "old_stock": 25.0,
    "change": -3.0,
    "new_stock": 22.0
  }
}
```

## 📊 EJEMPLO 5: ANÁLISIS Y FORECAST

### Consultar Estadísticas de Consumo
```sql
-- En Supabase SQL Editor:

-- Productos más vendidos último trimestre
SELECT 
  p.nombre,
  SUM(ch.quantity) as total_vendido,
  ROUND(AVG(ch.quantity), 2) as promedio_por_venta
FROM consumption_history ch
JOIN products p ON p.id = ch.product_id  
WHERE ch.created_at >= NOW() - INTERVAL '3 months'
  AND ch.type = 'sale'
GROUP BY p.id, p.nombre
ORDER BY total_vendido DESC
LIMIT 10;
```

### Obtener Sugerencias de Reposición
```sql
-- Productos que necesitan reposición
SELECT * FROM get_restock_suggestions(5);
```

**Resultado esperado:**
```
product_name          | current_stock | avg_monthly_consumption | days_until_stockout | suggested_order_quantity
Pimiento Rojo        | 4.25          | 15.5                    | 8                   | 36.0
Mozzarella Burrata   | 0.0           | 8.2                     | 0                   | 18.0  
Calabacín            | 15.25         | 22.0                    | 21                  | 30.0
```

## 🔍 VERIFICACIÓN DE SISTEMA COMPLETO

### Health Check de Todos los Servicios
```bash
# 1. Verificar B2B App
curl "https://sistema-stock-b2b.vercel.app/api/health"

# 2. Verificar Backoffice App  
curl "https://sistema-stock-backoffice.vercel.app/api/health"

# 3. Verificar OCR Service
curl -u ocr_production:super_secure_password \
  "https://your-ocr.hetzner.com/health"

# 4. Verificar Supabase
curl "https://your-project.supabase.co/rest/v1/products?select=count" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}"
```

### Test de Integración Completa
```bash
#!/bin/bash
# Script de test end-to-end completo

echo "🚀 Iniciando test de integración completa..."

# 1. Test OCR
echo "📄 Testing OCR service..."
OCR_RESULT=$(curl -s -u ocr_prod:pass \
  -X POST "https://ocr.hetzner.com/extract" \
  -H "Content-Type: application/json" \
  -d '{"image_url": "https://example.com/test-invoice.jpg"}')

if [[ $? -eq 0 ]]; then
  echo "✅ OCR service OK"
else 
  echo "❌ OCR service FAILED"
fi

# 2. Test B2B Stock API
echo "🛒 Testing B2B stock API..."
STOCK_RESULT=$(curl -s "https://b2b.vercel.app/api/stock" \
  -H "Authorization: Bearer $B2B_TOKEN")

if [[ $? -eq 0 ]]; then
  echo "✅ B2B API OK"
else
  echo "❌ B2B API FAILED"  
fi

# 3. Test Backoffice Alerts
echo "⚠️ Testing alert system..."
ALERT_RESULT=$(curl -s "https://backoffice.vercel.app/api/alerts" \
  -H "Authorization: Bearer $SERVICE_ROLE_KEY")

if [[ $? -eq 0 ]]; then
  echo "✅ Alert system OK"
else
  echo "❌ Alert system FAILED"
fi

echo "🎉 Test de integración completo!"
```

## 📝 NOTAS IMPORTANTES

### Datos de Prueba Incluidos
- **3 proveedores** configurados con datos reales
- **10 productos** con stock variado (algunos críticos)
- **2 usuarios B2B** con diferentes descuentos
- **3 pedidos** en diferentes estados
- **4 alertas** activas para probar notificaciones

### Credenciales de Desarrollo
```bash
# Usuario B2B 1 (Cliente principal)
email: admin@latraviata.com
password: admin123

# Usuario B2B 2 (Cliente de prueba)  
email: cliente@restaurante.com
password: cliente123

# Manager Backoffice
email: manager@latraviata.com
password: manager123
```

### URLs de Prueba
- **B2B**: `https://sistema-stock-b2b.vercel.app`  
- **Backoffice**: `https://sistema-stock-backoffice.vercel.app`
- **OCR**: `https://your-ocr-domain.com`

### Próximos Pasos
1. **Configurar** Supabase con los SQLs proporcionados
2. **Desplegar** apps en Vercel con variables de entorno
3. **Instalar** servicio OCR en Hetzner  
4. **Ejecutar** ejemplos para verificar funcionamiento
5. **Personalizar** datos según necesidades específicas

¡Todo listo para producción! 🚀