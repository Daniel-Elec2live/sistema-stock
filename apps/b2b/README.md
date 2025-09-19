# 🛍️ La Traviata B2B - Tienda Online

Sistema de comercio electrónico B2B con gestión de stock en tiempo real, descuentos personalizados y backorders inteligentes.

## 🚀 Características Principales

### ✅ Funcionalidades Implementadas (Fase 1)

- **Catálogo completo** con stock en tiempo real
- **Descuentos personalizados** automáticos por cliente
- **Sistema de carrito** persistente con validación de stock
- **Checkout sin pagos** (coordinación offline)
- **Backorders inteligentes** con confirmación doble
- **Gestión de pedidos** con estados y historial completo
- **Auto-registro de clientes** con aprobación manual
- **Responsive design** mobile-first
- **Autenticación JWT** segura

### 🔮 Preparado para Fase 2

- **Pasarelas de pago** (Stripe, Redsys, Bizum)
- **Facturación automática** con IVA
- **Descarga de facturas/albaranes**
- **Notificaciones por email**
- **Sistema de roles avanzado**

## 🛠️ Stack Técnico

- **Frontend**: Next.js 14, React Server Components, TypeScript
- **UI**: TailwindCSS, Radix UI, Framer Motion, Lucide Icons
- **Estado**: Zustand (carrito), React Hooks (datos)
- **Base de datos**: Supabase (PostgreSQL + Auth + Storage)
- **Validación**: Zod
- **Deploy**: Vercel
- **Tipografía**: Inter (estilo Notion)

## 🎨 Identidad Visual

- **Tomate** `#a21813` - Primario (CTAs, precios)
- **Rúcula** `#2a722c` - Secundario (stock, confirmaciones)
- **Pan** `#ffc840` - Acento (alertas, descuentos)
- **Negro** `#000000` - Contraste y tipografía

## 📦 Instalación y Configuración

### 1. Prerrequisitos

```bash
node >= 18.0.0
npm >= 8.0.0
```

### 2. Clonar e Instalar

```bash
# Desde la raíz del monorepo
cd apps/b2b
npm install

# Instalar UI compartido (si existe)
cd ../../packages/ui
npm install
cd ../../apps/b2b
npm install @packages/ui@*
```

### 3. Configurar Variables de Entorno

```bash
cp .env.example .env.local
```

Editar `.env.local`:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key

# JWT
JWT_SECRET=tu-jwt-secret-muy-seguro-min-32-caracteres

# URLs
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_BACKOFFICE_API_URL=http://localhost:3000/api

# Configuración Fase 1
NEXT_PUBLIC_ENABLE_PAYMENTS=false
NEXT_PUBLIC_AUTO_APPROVE_CUSTOMERS=false
```

### 4. Configurar Base de Datos

```bash
# Ejecutar schema en Supabase SQL Editor
# Copiar contenido de: lib/supabase-b2b-schema.sql
```

### 5. Ejecutar en Desarrollo

```bash
npm run dev
```

Aplicación disponible en: `http://localhost:3001`

## 🏗️ Estructura del Proyecto

```
apps/b2b/
├── app/                          # App Router (Next.js 14)
│   ├── (auth)/                   # Grupo de rutas de autenticación
│   │   ├── login/page.tsx        # Página de login
│   │   ├── register/page.tsx     # Página de registro
│   │   └── layout.tsx            # Layout para auth
│   ├── (tienda)/                 # Grupo de rutas principales
│   │   ├── catalogo/page.tsx     # Catálogo de productos
│   │   ├── producto/[id]/page.tsx # Detalle de producto
│   │   ├── carrito/page.tsx      # Página del carrito
│   │   ├── checkout/page.tsx     # Proceso de checkout
│   │   ├── pedidos/              # Historial de pedidos
│   │   ├── confirmacion/[id]/    # Confirmación de pedido
│   │   └── layout.tsx            # Layout principal
│   ├── api/                      # API Routes
│   │   ├── auth/                 # Endpoints de autenticación
│   │   ├── stock/route.ts        # API de productos con descuentos
│   │   ├── orders/               # API de pedidos y cancelaciones
│   │   └── customers/            # API de clientes
│   ├── globals.css               # Estilos globales + variables CSS
│   └── layout.tsx                # Root layout
├── components/                   # Componentes React
│   ├── auth/                     # Componentes de autenticación
│   ├── tienda/                   # Componentes de la tienda
│   ├── layout/                   # Headers, navegación, footer
│   └── ui/                       # Componentes base (Radix + Tailwind)
├── hooks/                        # Custom hooks
│   ├── useAuth.ts                # Gestión de autenticación
│   ├── useProducts.ts            # Carga de productos con descuentos
│   └── useOrders.ts              # Gestión de pedidos
├── lib/                          # Utilidades y configuración
│   ├── supabase.ts               # Cliente de Supabase
│   ├── auth.ts                   # Verificación JWT y helpers
│   ├── types.ts                  # Tipos TypeScript globales
│   ├── validations.ts            # Esquemas de validación Zod
│   └── utils.ts                  # Utilidades generales
├── stores/                       # Estado global
│   └── cartStore.ts              # Store del carrito (Zustand)
├── middleware.ts                 # Middleware de Next.js (rutas protegidas)
├── tailwind.config.js            # Configuración de Tailwind
├── next.config.js                # Configuración de Next.js
└── package.json                  # Dependencias y scripts
```

## 🔐 Autenticación y Autorización

### Flujo de Autenticación

1. **Registro**: Auto-registro con aprobación manual
2. **Login**: JWT con duración de 7 días
3. **Autorización**: Middleware verifica token en rutas protegidas
4. **Estado**: Hook `useAuth` mantiene estado global

### Usuarios de Prueba

```sql
-- Crear usuario de prueba en Supabase
INSERT INTO users (email, password_hash) VALUES 
('test@cliente.com', '$2b$12$hash_de_password_test');

INSERT INTO customers (user_id, email, name, company_name, is_approved) VALUES 
((SELECT id FROM users WHERE email = 'test@cliente.com'),
 'test@cliente.com', 'Cliente Prueba', 'Restaurante Test', TRUE);
```

## 💰 Sistema de Descuentos

### Tipos de Descuentos

1. **Específico**: Descuento a un producto concreto
2. **Categoría**: Descuento a todos los productos de una categoría  
3. **General**: Descuento a todo el catálogo

### Configuración de Descuentos

```sql
-- Descuento del 15% en producto específico
INSERT INTO customer_discounts (customer_id, product_id, discount_percentage) 
VALUES ('customer-uuid', 'product-uuid', 15.0);

-- Descuento del 10% en categoría "carnes"
INSERT INTO customer_discounts (customer_id, category, discount_percentage)
VALUES ('customer-uuid', 'carnes', 10.0);

-- Descuento general del 5%
INSERT INTO customer_discounts (customer_id, discount_percentage)
VALUES ('customer-uuid', 5.0);
```

### Prioridad de Aplicación

**Específico > Categoría > General** (se aplica el mayor descuento)

## 🛒 Gestión de Pedidos

### Estados de Pedido

- `pending` - Pedido confirmado, pendiente de preparación
- `prepared` - Pedido preparado, listo para entrega
- `delivered` - Pedido entregado al cliente
- `cancelled` - Pedido cancelado (stock repuesto automáticamente)

### Backorders

Cuando hay stock insuficiente:

1. **Detección automática** en checkout
2. **Dialog de confirmación** con detalles claros
3. **Pedido parcial** con seguimiento de pendientes
4. **Notificación automática** cuando llegue stock

### Cancelación de Pedidos

- Solo permitida en estado `pending`
- **Reposición automática** del stock
- Log de auditoría completo

## 📱 Responsive Design

### Breakpoints

- **Mobile**: < 640px (vista principal, 80% de uso esperado)
- **Tablet**: 640px - 1024px
- **Desktop**: > 1024px

### Componentes Móviles

- Carrito lateral deslizable
- Grid adaptable de productos
- Navegación collapsible
- Formularios optimizados para mobile

## 🧪 Testing

```bash
# Ejecutar tests
npm run test

# Tests en modo watch
npm run test:watch

# Tests con UI
npm run test:ui
```

### Cobertura de Tests

- **API Routes**: Validación y lógica de negocio
- **Componentes**: Renderizado y interacciones
- **Hooks**: Lógica de estado y efectos
- **Utilidades**: Funciones puras

## 🚀 Despliegue en Vercel

### 1. Configurar Variables de Entorno

En dashboard de Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=tu-url-produccion
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-key-produccion
SUPABASE_SERVICE_ROLE_KEY=tu-service-key-produccion
JWT_SECRET=tu-jwt-secret-produccion
NEXT_PUBLIC_APP_URL=https://tu-dominio.vercel.app
NEXT_PUBLIC_ENABLE_PAYMENTS=false
NEXT_PUBLIC_AUTO_APPROVE_CUSTOMERS=false
```

### 2. Configurar Build

```json
// package.json - scripts ya configurados
{
  "scripts": {
    "build": "next build",
    "start": "next start -p 3001"
  }
}
```

### 3. Deploy

```bash
# Con Vercel CLI
npm i -g vercel
vercel --prod

# O conectar repositorio en dashboard de Vercel
```

### 4. Configurar Dominio Personalizado (Opcional)

1. Ir a Settings > Domains en Vercel
2. Agregar tu dominio personalizado
3. Configurar DNS según instrucciones

## 🔧 Scripts Disponibles

```bash
npm run dev          # Desarrollo (puerto 3001)
npm run build        # Build de producción
npm run start        # Servidor de producción
npm run lint         # Linter ESLint
npm run lint:fix     # Corregir errores de lint
npm run type-check   # Verificar tipos TypeScript
npm run test         # Ejecutar tests
npm run clean        # Limpiar caché de Next.js
npm run analyze      # Analizar bundle (ANALYZE=true npm run build)
```

## 🔮 Roadmap Fase 2

### Facturación y Pagos

- [ ] Integración Stripe/Redsys/Bizum
- [ ] Generación automática de facturas
- [ ] Descarga de PDFs desde la tienda
- [ ] Gestión de IVA por productos
- [ ] Reconciliación de pagos

### Notificaciones

- [ ] Email de bienvenida (Resend)
- [ ] Confirmación de pedidos
- [ ] Avisos de stock disponible
- [ ] Recordatorios de pedidos pendientes

### Funcionalidades Avanzadas

- [ ] Productos relacionados con ML
- [ ] Recommendations basadas en historial
- [ ] Sistema de favoritos
- [ ] Comparador de productos
- [ ] Calendario de entregas

### Analytics y Reporting

- [ ] Dashboard de métricas de cliente
- [ ] Análisis de comportamiento de compra
- [ ] Reportes de productos más vendidos
- [ ] Predicción de demanda

## 🤝 Contribución

### Convenciones de Código

- **TypeScript**: Tipado estricto obligatorio
- **Components**: PascalCase, archivos TSX
- **Hooks**: camelCase con prefijo 'use'
- **Utilities**: camelCase, funciones puras
- **API Routes**: RESTful, validación Zod

### Estructura de Commits

```
feat: descripción de nueva funcionalidad
fix: corrección de bug
docs: actualización de documentación  
style: cambios de formato (no afecta lógica)
refactor: refactorización de código
test: agregar o modificar tests
chore: tareas de mantenimiento
```

## 📞 Soporte

- **Email**: desarrollo@latraviata.com
- **Issues**: GitHub Issues
- **Documentación**: Este README + comentarios en código

---

**¡Tienda B2B Lista para Producción!** 🎉

Desarrollado con ❤️ para La Traviata