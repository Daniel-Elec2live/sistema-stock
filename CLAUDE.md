CLAUDE.md
1) LEYES GLOBALES (INVIOLABLES)

Plan → Diff → Ejecutar → Probar. Antes de tocar nada, entrega un PLAN con archivos a modificar; luego muestra DIFF; solo entonces aplica y explica cómo PROBAR.

Alcance limitado. No añadas dependencias, tablas, rutas o librerías nuevas sin confirmación explícita.

Nada de secretos en el cliente. Variables en .env / servidor. Nunca expongas claves ni tokens en código, logs o respuestas.

Cambios pequeños y reversibles. Commits atómicos con mensaje claro (qué y por qué). No mezcles fixes con refactors.

Compatibilidad primero. No rompas lo que ya funciona; si un cambio afecta a otra parte, propone una prueba rápida para verificarlo.

No asumas lo que no está escrito. Si falta contexto, pide el archivo o confirma la decisión.

Pruebas mínimas. Al corregir un bug, añade verificación (test o pasos manuales).

Seguridad básica. Valida entradas (Zod), evita inyecciones, y respeta el principio de menor privilegio (service-role solo en server).

Terminal con consentimiento. Muestra los comandos antes; usa --dry-run cuando exista; nada destructivo sin copia/confirmación.

Idioma y tono. Español claro, directo, sin jerga innecesaria. Respuestas breves y accionables.

2) CONTEXTO DEL PROYECTO

Objetivo: Sistema de gestión de stock con Backoffice interno y Tienda B2B pública: entradas/OCR, alertas, y pedidos con stock en tiempo real y descuentos por cliente; Fase 1 sin pagos online. 

Stack y despliegue (en palabras): Monorepo con dos apps Next.js 14 (App Router) desplegables en Vercel; Supabase (Postgres, Auth, Storage) como backend de datos; microservicio OCR en Hetzner (FastAPI + PaddleOCR/docTR) consumido desde Vercel. 

Reglas de datos (verdad única):

Stock global por producto es la verdad única publicada a B2B; los lotes/caducidades se gestionan internamente para alertas y previsión. Triggers reservan stock al confirmar pedidos y lo reponen al cancelar. (Definición/SQL completo lo entrega Chat 3). 

Fase 1: sin facturas ni pagos; solo pedidos y estados: Pendiente, Preparado, Entregado, Cancelado. 

Rutas sensibles / permisos (contrato):

B2B: GET /api/stock, POST /api/orders, POST /api/orders/{id}/cancel (incluye reposición automática). Descuentos por cliente integrados en /api/stock o endpoint propio documentado. 

Backoffice: POST /api/entries, POST /api/ocr/callback, POST /api/stock/adjustment, GET /api/alerts. 

Auth: auto-registro con aprobación interna; JWT 7 días (server-only). Service Role Key solo en server (API Routes). 

Estilo de UI:

B2B: Mobile-first, directa, centrada en carrito/stock en tiempo real. Tailwind + Radix + Inter + Framer. Paleta Tomate (#a21813) / Rúcula (#2a722c) / Pan (#ffc840). 

Backoffice: estética limpia “tipo Notion”, cards y grids claras. 

Listas vivas:

TODO inmediato (prioridad):

Forzar runtime Node en API que use bcrypt/jwt: export const runtime = 'nodejs'.

Asegurar cliente Supabase server-only: SUPABASE_SERVICE_ROLE_KEY solo en API.

Corregir exports UI: components/ui/badge.tsx debe exportar { Badge } y default.

Añadir "use client" en components/ui/index.ts o dejar de hacer barrel de componentes cliente.

Redirigir app/page.tsx → /catalogo para una sola home.

Bugs abiertos (síntoma → reproducir → esperado):

ZodError .errors: usar .issues en handlers (catch). → Evita TS error y devuelve validaciones correctas.

Módulos faltantes (bcryptjs, jsonwebtoken, @/lib/supabase): instalar y crear lib/supabase.ts correcto. → API de login/registro compila y responde.

user posiblemente undefined tras verifyAuth: comprueba authResult.user antes de usarlo. → TS seguro, 401/403 coherentes.

Barrel UI cliente importado en server: poner "use client" en components/ui/index.ts o importar por archivo. → Evita error “Server Component importing a Client Component”.

Fuera de alcance (por ahora):

Pagos online (Stripe/Redsys/Bizum) y facturación/IVA (Fase 2).

Motor de forecast avanzado; mantener solo sugerencias básicas.

Cambios de esquema: los define Chat 3 (no tocar sin coordinación). 

Cómo probar (manual, simple):

npm run dev en apps/b2b.

Registro de cliente → comprobar mensaje de aprobación pendiente. (En dev puedes NEXT_PUBLIC_AUTO_APPROVE_CUSTOMERS=true). 

Login → ver catálogo con stock y precio con descuento aplicado. 

Crear pedido → comprobar reserva de stock. Cancelar pedido → verificar reposición automática. 

En Backoffice (cuando esté activo): subir albarán → recibir propuesta OCR → validar → stock aumenta. 

Costes/limitaciones:

Fase 1 sin pagos (cero costes pasarela); Supabase EU como DB/Auth/Storage; OCR en Hetzner (servicio aparte). 

Node ≥ 18, TypeScript estricto; latencia de OCR asíncrona (callback). 

3) CONVENCIONES DE CÓDIGO Y ESTRUCTURA

Monorepo: apps/backoffice, apps/b2b, packages/ui (si procede). App Router en ambas. 

Alias TS: en apps/b2b/tsconfig.json usar
"baseUrl": ".", "paths": { "@/*": ["./*"] }.

Clientes y límites RSC:

Componentes Radix/shadcn son cliente: cada archivo TSX con "use client".

Si re-exportas en components/ui/index.ts, pon "use client" arriba o importa por archivo.

API Routes (server-only):

Añade export const runtime = 'nodejs' donde uses bcrypt, jsonwebtoken o librerías nativas.

Supabase (server):

import { createClient } from '@supabase/supabase-js'
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-only
  { auth: { persistSession: false } }
)


Validaciones y errores:

Zod: usa schema.parse() y en catch (e) si e instanceof ZodError responde con e.issues.

401 si no hay sesión; 403 si no hay perfil de cliente aprobado.

Estados y flujos críticos:

Pedidos: confirmar ⇒ reserva; cancelar ⇒ reposición; backorder con doble confirmación y mensajes claros. 


Auth: auto-registro con aprobación interna previa a comprar. 

4) CONTRATO DE API (RESUMEN)

B2B (no define BD; la provee Chat 3):

GET /api/stock → catálogo con precio final (aplicando descuentos por cliente).

POST /api/orders → crear/confirmar pedido (reserva stock).

POST /api/orders/{id}/cancel → cancelar pedido (repone stock).

Descuentos por cliente: cálculo en servidor (ejemplo vía customer_discounts). 

Backoffice:

POST /api/entries (OCR/manual), POST /api/ocr/callback, POST /api/stock/adjustment, GET /api/alerts. 

OCR (Hetzner): POST /extract con URL firmada de Storage; respuesta JSON estandarizada; Vercel recibe en /api/ocr/callback. 

5) FLUJOS CLAVE (UX)

Catálogo (B2B): listado con stock global, filtros básicos, precio con descuento por cliente, ficha mínima (nombre, precio, stock, añadir; más marca/foto/caducidad aproximada). 

Carrito/Pedido: confirmas ⇒ reserva inmediata; si cancelas/rechazas ⇒ reposición automática; stock insuficiente ⇒ aviso + doble confirmación para backorder parcial/total. 

Historial: pedidos por cliente con estados: Pendiente, Preparado, Entregado, Cancelado. 

Entradas (Backoffice): subir albarán/factura → OCR → propuesta → validar → sumar stock; mermas/ajustes con motivo. 

6) VARIABLES DE ENTORNO (B2B y Backoffice)

Comunes:
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY (server-only, nunca en cliente)
JWT_SECRET

Flags:
NEXT_PUBLIC_AUTO_APPROVE_CUSTOMERS=true|false (dev puede ir true). 

OCR (Backoffice):
OCR_SERVICE_URL, OCR_BASIC_AUTH o OCR_JWT_SECRET. 

7) CHECKLIST RÁPIDO ANTES DE ENVIAR CAMBIOS

 PLAN → DIFF → PROBAR incluido.

 Sin nuevas deps/tablas/rutas sin permiso.

 Secrets solo en server; runtime='nodejs' donde toque.

 Zod: uso de issues, no errors.

 UI cliente con "use client"; sin importar barrels cliente desde server.

 Prueba manual: registro→aprobación→pedido→cancelación (reposición). 

8) LISTA DE ARCHIVOS FRECUENTES A TOCAR (cuando proceda)

apps/b2b/app/api/** (Auth, Stock, Orders): handlers server con Supabase service-role.

apps/b2b/components/ui/** y components/tienda/**: UI cliente.

apps/backoffice/app/**: páginas/handlers Backoffice (cuando se active su implementación).

apps/**/lib/**: supabase.ts, auth.ts, validations.ts (Zod), types.ts.

9) COORDINACIÓN ENTRE CHATS (si se usan varios)

Chat 1 (Backoffice): NO define BD, consume contrato y esquema de Chat 3. 

Chat 2 (B2B): NO define BD; cumple contrato B2B; backorders con doble confirmación. 

Chat 3 (Datos/OCR): entrega SQL completo (tablas, RLS, triggers de reserva/reposición) y servicio OCR dockerizado con /extract y callback en Vercel. Este documento es el maestro de contexto. 

Notas finales para Claude Code: empieza siempre con PLAN, limita el alcance, respeta el contrato/API y la separación de responsabilidades. Si detectas un bug recurrente (p. ej., ZodError.errors), arréglalo con el menor cambio posible y añade pasos de prueba manuales.