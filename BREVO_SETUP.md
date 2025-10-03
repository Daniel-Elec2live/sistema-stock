# Configuración de Brevo (Sendinblue) para Emails

Sistema configurado para usar **Brevo** (antes Sendinblue) como proveedor de emails transaccionales.

## Ventajas de Brevo

✅ **300 emails/día GRATIS** (9000/mes)
✅ **NO requiere verificación de dominio** para empezar
✅ Excelente entregabilidad
✅ Dashboard con estadísticas de emails
✅ Posibilidad de añadir tu dominio después (opcional)

---

## Paso 1: Crear cuenta en Brevo

1. Ve a https://www.brevo.com/
2. Click en **"Sign up free"**
3. Completa el registro con tu email
4. Verifica tu email

---

## Paso 2: Obtener API Key

1. Inicia sesión en Brevo
2. Ve a **Settings** (arriba derecha, icono de engranaje)
3. En el menú lateral, click en **"SMTP & API"**
4. En la sección **"API Keys"**, click en **"Generate a new API key"**
5. Dale un nombre: `LaTraviata-Backoffice`
6. **Copia la API key** (solo se muestra una vez)

---

## Paso 3: Configurar variables de entorno

### Backoffice (`apps/backoffice/.env.local`)

Añade estas variables:

```bash
# Brevo (Email transaccional)
BREVO_API_KEY=xkeysib-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx-xxxxxxxxxxxxxxxx

# Email remitente (debe ser un email válido que controles)
FROM_EMAIL=daniel.vega@elec2live.com
FROM_NAME=La Traviata

# Email del almacén (donde llegan notificaciones de pedidos y alertas)
WAREHOUSE_EMAIL=danielvegahurtado77@gmail.com
```

### B2B (`apps/b2b/.env.local`)

El B2B **NO necesita** configuración de emails (los envía solo el backoffice).

---

## Paso 4: Verificar email remitente en Brevo (IMPORTANTE)

### Opción A: Verificar email individual (Recomendado para empezar)

1. En Brevo, ve a **Senders, Domains & Dedicated IPs** → **Senders**
2. Click en **"Add a sender"**
3. Introduce: `daniel.vega@elec2live.com`
4. Brevo enviará un email de verificación a esa dirección
5. Abre el email y click en el enlace de verificación

✅ **Listo!** Ya puedes enviar emails desde `daniel.vega@elec2live.com`

### Opción B: Verificar dominio completo (Opcional, más avanzado)

Si tienes acceso al panel DNS de `elec2live.com`:

1. En Brevo, ve a **Senders, Domains & Dedicated IPs** → **Domains**
2. Click en **"Add a domain"**
3. Añade `elec2live.com`
4. Brevo te dará registros DNS (TXT, DKIM, SPF)
5. Añade esos registros en tu panel DNS
6. Click en **"Verify domain"**

**Ventaja**: Podrás enviar desde cualquier email `@elec2live.com` sin verificar cada uno.

---

## Paso 5: Reiniciar servidor

```bash
cd apps/backoffice
npm run dev
```

---

## Emails que se envían automáticamente

### 1. **Nuevo Pedido** (B2B → Backoffice)
- **Al cliente**: Confirmación de pedido recibido
- **Al almacén**: Notificación de nuevo pedido

### 2. **Cambio de estado de pedido**
- **Al cliente**:
  - Pedido confirmado
  - Pedido preparado
  - Pedido entregado
  - Pedido cancelado
- **Al almacén**: Notificación de cambio de estado

### 3. **Cambio de estado de pago**
- **Al cliente**: Confirmación de pago recibido (solo cuando se marca como "pagado")

### 4. **Alertas de stock**
- **Al almacén**:
  - Stock crítico (por debajo del mínimo)
  - Stock agotado (0 unidades)

---

## Endpoints que envían emails

### Backoffice:
- `POST /api/orders` - Nuevo pedido (confirmación)
- `PATCH /api/orders/[id]/status` - Cambio de estado
- `PATCH /api/orders/[id]/payment` - Cambio de pago
- `GET /api/alerts` - Alertas de stock (automático)

---

## Testing en desarrollo

### Verificar que los emails se envían:

1. **Crear un pedido en B2B**
   - Deberías ver en consola backoffice:
     ```
     ✅ Email confirmación enviado a: cliente@email.com
     ✅ Email nuevo pedido enviado a almacén: danielvegahurtado77@gmail.com
     ```

2. **Cambiar estado de pedido en Backoffice**
   - Deberías ver:
     ```
     ✅ Email actualización enviado a: cliente@email.com
     ✅ Email actualización enviado a almacén: danielvegahurtado77@gmail.com
     ```

3. **Marcar pedido como pagado**
   - Deberías ver:
     ```
     ✅ Email confirmación pago enviado a: cliente@email.com
     ```

### Ver emails enviados en Brevo:

1. Ve a **Statistics** → **Email**
2. Verás todos los emails enviados, abiertos, clicks, etc.

---

## Límites del plan gratuito

| Característica | Plan Gratuito |
|----------------|---------------|
| Emails/día | 300 |
| Emails/mes | 9,000 |
| Contactos | Ilimitados |
| Verificación dominio | Sí (opcional) |
| Estadísticas | Sí |
| Soporte | Email |

---

## Migrar a plan de pago (futuro)

Si necesitas más de 300 emails/día:

- **Lite Plan**: 20€/mes - 20,000 emails/mes
- **Starter Plan**: 25€/mes - 40,000 emails/mes
- **Business Plan**: 65€/mes - 100,000 emails/mes

---

## Troubleshooting

### Error: "Sender not verified"
**Solución**: Verifica el email remitente en Brevo (Paso 4)

### Error: "API key invalid"
**Solución**: Revisa que `BREVO_API_KEY` esté correctamente copiada en `.env.local`

### No llegan emails
**Solución**:
1. Revisa la consola del backoffice para ver si hay errores
2. Revisa la carpeta SPAM
3. Ve a Brevo Dashboard → Statistics para ver si se enviaron

### Emails en SPAM
**Solución**:
1. Verifica el dominio completo (Opción B del Paso 4)
2. Configura SPF y DKIM en DNS
3. Añade un registro DMARC

---

## Siguiente paso: Producción en Vercel

Cuando despliegues en Vercel, añade las variables de entorno en:

**Vercel Dashboard** → Tu proyecto → **Settings** → **Environment Variables**

```
BREVO_API_KEY=xkeysib-xxx...
FROM_EMAIL=daniel.vega@elec2live.com
FROM_NAME=La Traviata
WAREHOUSE_EMAIL=danielvegahurtado77@gmail.com
```

Asegúrate de marcarlas como **Production** + **Preview** + **Development**.

---

## ✅ Checklist de configuración

- [ ] Cuenta Brevo creada
- [ ] API Key generada
- [ ] Email remitente verificado (`daniel.vega@elec2live.com`)
- [ ] Variables en `apps/backoffice/.env.local`:
  - [ ] `BREVO_API_KEY`
  - [ ] `FROM_EMAIL`
  - [ ] `FROM_NAME`
  - [ ] `WAREHOUSE_EMAIL`
- [ ] Servidor backoffice reiniciado
- [ ] Email de prueba enviado correctamente

---

¿Preguntas? Revisa la documentación oficial: https://developers.brevo.com/
