import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'

// Validar variables de entorno requeridas
const hasRequiredEnvVars = !!(
  process.env.GMAIL_USER &&
  process.env.GMAIL_APP_PASSWORD &&
  process.env.WAREHOUSE_EMAIL
)

if (!hasRequiredEnvVars) {
  console.error('❌ [EMAIL] Variables de entorno faltantes:')
  console.error('  GMAIL_USER:', process.env.GMAIL_USER ? '✅' : '❌ MISSING')
  console.error('  GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? '✅' : '❌ MISSING')
  console.error('  WAREHOUSE_EMAIL:', process.env.WAREHOUSE_EMAIL ? '✅' : '❌ MISSING')
}

console.log('[EMAIL CONFIG] Inicializando transporter...')

// Configurar transporter de Nodemailer con Gmail
let transporter: Transporter | null = null

try {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER!,
      pass: process.env.GMAIL_APP_PASSWORD!
    },
    // Opciones adicionales para mayor confiabilidad
    pool: true, // Usar conexión pooled
    maxConnections: 3,
    maxMessages: 100,
    rateDelta: 1000, // 1 segundo entre emails
    rateLimit: 5 // máximo 5 emails por rateDelta
  })

  // Verificar configuración al inicio
  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ [EMAIL] Error verificando transporter:', error)
    } else {
      console.log('✅ [EMAIL] Transporter verificado correctamente')
    }
  })
} catch (error) {
  console.error('❌ [EMAIL] Error creando transporter:', error)
}

const WAREHOUSE_EMAIL = process.env.WAREHOUSE_EMAIL || ''
const FROM_EMAIL = process.env.GMAIL_USER || ''
const FROM_NAME = process.env.FROM_NAME || 'La Traviata'

interface OrderEmailData {
  orderId: string
  orderNumber?: string
  customerName: string
  customerEmail?: string
  status: string
  totalAmount: number
  items: Array<{
    product_name: string
    quantity: number
    unit_price: number
    total_price: number
  }>
}

/**
 * Envía email al cliente cuando se crea un nuevo pedido
 */
export async function sendOrderConfirmationToCustomer(data: OrderEmailData) {
  // Validación temprana
  if (!data.customerEmail) {
    console.log('[EMAIL] Skipping customer email: no customerEmail provided')
    return { success: true, skipped: true }
  }

  if (!transporter) {
    console.error('❌ [EMAIL] Transporter no disponible. Verifica variables de entorno.')
    return { success: false, error: 'Transporter not initialized' }
  }

  if (!hasRequiredEnvVars) {
    console.error('❌ [EMAIL] Variables de entorno faltantes. Email no enviado.')
    return { success: false, error: 'Missing environment variables' }
  }

  try {
    console.log(`[EMAIL] Enviando confirmación a cliente: ${data.customerEmail}`)

    const itemsList = data.items
      .map(
        (item) =>
          `  • ${item.product_name} - ${item.quantity} uds`
      )
      .join('\n')

    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: data.customerEmail,
      subject: `✅ Pedido Recibido #${data.orderNumber || data.orderId.slice(0, 8)}`,
      text: `Hola ${data.customerName},

¡Gracias por tu pedido! Hemos recibido correctamente tu solicitud y ya estamos trabajando en ella.

═══════════════════════════════════════════════════

📦 DETALLES DE TU PEDIDO

Número de pedido: #${data.orderNumber || data.orderId.slice(0, 8)}

Productos solicitados:

${itemsList}

═══════════════════════════════════════════════════

Si tienes alguna pregunta o necesitas hacer algún cambio, no dudes en contactarnos.

¡Gracias por confiar en nosotros!

Saludos,
El equipo de La Traviata`
    })

    console.log(`✅ [EMAIL] Confirmación enviada a: ${data.customerEmail}`)
    console.log(`[EMAIL] Message ID: ${info.messageId}`)
    console.log(`[EMAIL] Response: ${info.response}`)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('❌ [EMAIL] Error enviando email a cliente:', error)
    console.error('[EMAIL] Error details:', {
      customerEmail: data.customerEmail,
      fromEmail: FROM_EMAIL,
      hasTransporter: !!transporter,
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false, error }
  }
}

/**
 * Envía email al almacén cuando se crea un nuevo pedido
 */
export async function sendNewOrderToWarehouse(data: OrderEmailData) {
  // Validación temprana
  if (!transporter) {
    console.error('❌ [EMAIL] Transporter no disponible. Verifica variables de entorno.')
    return { success: false, error: 'Transporter not initialized' }
  }

  if (!hasRequiredEnvVars) {
    console.error('❌ [EMAIL] Variables de entorno faltantes. Email no enviado.')
    return { success: false, error: 'Missing environment variables' }
  }

  if (!WAREHOUSE_EMAIL) {
    console.error('❌ [EMAIL] WAREHOUSE_EMAIL no configurado')
    return { success: false, error: 'WAREHOUSE_EMAIL not configured' }
  }

  try {
    console.log(`[EMAIL] Enviando notificación a almacén: ${WAREHOUSE_EMAIL}`)

    const itemsList = data.items
      .map(
        (item) =>
          `  • ${item.product_name} - ${item.quantity} uds`
      )
      .join('\n')

    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: WAREHOUSE_EMAIL,
      subject: `🔔 Nuevo Pedido #${data.orderNumber || data.orderId.slice(0, 8)} - ${data.customerName}`,
      text: `═══════════════════════════════════════════════════
🆕 NUEVO PEDIDO RECIBIDO
═══════════════════════════════════════════════════

Pedido: #${data.orderNumber || data.orderId.slice(0, 8)}
Cliente: ${data.customerName}

───────────────────────────────────────────────────

📦 PRODUCTOS

${itemsList}

───────────────────────────────────────────────────

⚡ ACCIÓN REQUERIDA

Accede al backoffice para revisar y confirmar este pedido:
→ https://sistema-stock-lac.vercel.app/pedidos

Una vez confirmado, el cliente recibirá una notificación automática.

Saludos,
Sistema de Gestión La Traviata`
    })

    console.log(`✅ [EMAIL] Notificación enviada a almacén: ${WAREHOUSE_EMAIL}`)
    console.log(`[EMAIL] Message ID: ${info.messageId}`)
    console.log(`[EMAIL] Response: ${info.response}`)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('❌ [EMAIL] Error enviando email a almacén:', error)
    console.error('[EMAIL] Error details:', {
      warehouseEmail: WAREHOUSE_EMAIL,
      fromEmail: FROM_EMAIL,
      hasTransporter: !!transporter,
      error: error instanceof Error ? error.message : String(error)
    })
    return { success: false, error }
  }
}
