# 🔧 Solución para Cache Persistente en Vercel

## Problema
Después de limpiar la base de datos de Supabase, Vercel sigue mostrando datos antiguos de clientes y pedidos.

## Causa
Vercel cachea múltiples capas:
1. **Edge Cache** (CDN global)
2. **Serverless Function Cache** (funciones Lambda)
3. **Data Cache** (respuestas de fetch/queries)

## 🚀 Soluciones (en orden de efectividad)

### Opción 1: Redeploy con Invalidación de Cache (RECOMENDADO)

**Desde Vercel Dashboard:**
1. Ve a tu proyecto en Vercel
2. Click en "Deployments"
3. Click en el deployment activo (el de arriba)
4. Click en los 3 puntos `⋮` → **"Redeploy"**
5. ✅ **IMPORTANTE:** Marca la opción **"Use existing Build Cache: NO"**
6. Click "Redeploy"

Esto invalida TODO el cache y reconstruye desde cero.

---

### Opción 2: Cambiar Variables de Entorno (Fuerza Redeploy)

**Desde Vercel Dashboard:**
1. Settings → Environment Variables
2. Añade una variable temporal: `CACHE_BUST=<timestamp>`
3. Guarda
4. Vercel redesplegará automáticamente

Ejemplo:
```
CACHE_BUST=1727789000
```

Después del deploy, puedes eliminar esta variable.

---

### Opción 3: Purge Cache via CLI

**Desde terminal:**
```bash
# Instalar Vercel CLI si no lo tienes
npm i -g vercel

# Login
vercel login

# Purge cache del proyecto
vercel --prod --force
```

---

### Opción 4: Header Cache-Control en next.config.js

**Ya implementado en código**, pero puedes verificar:

```js
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          { key: 'Cache-Control', value: 'no-store, must-revalidate' },
        ],
      },
    ]
  },
}
```

---

### Opción 5: Force Rebuild (Último Recurso)

**Desde terminal:**
```bash
# Trigger empty commit para forzar redeploy
git commit --allow-empty -m "chore: force rebuild to clear Vercel cache"
git push
```

Luego en Vercel Dashboard → Redeploy SIN build cache.

---

## 🧪 Cómo Verificar que Funcionó

1. **Abre DevTools (F12)** → Network tab
2. **Refresca la página** (Ctrl + Shift + R)
3. **Busca la request** `/api/customers` o `/api/orders`
4. **Verifica headers de respuesta:**
   - `Cache-Control: no-store` ✅
   - `Age: 0` ✅ (no viene del cache)
   - `X-Vercel-Cache: MISS` ✅ (cache miss, no hit)

---

## 📊 En Logs de Vercel Deberías Ver:

```
🔍 CUSTOMERS API - Supabase URL: https://rnnkgzbhgonmdxtirwhg.supabase.co
📋 No customers found in database - returning empty array
```

Si ves esto, significa que **SÍ está consultando la BD correcta pero Vercel cachea la respuesta**.

---

## ⚠️ Si Nada Funciona

**Última opción nuclear:**
1. Desconecta el proyecto de Vercel
2. Elimina el proyecto en Vercel Dashboard
3. Vuelve a conectar desde GitHub
4. Redeploy limpio

---

**Fecha:** 2025-10-01
**Proyecto:** sistema-stock
