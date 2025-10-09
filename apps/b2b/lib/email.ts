import nodemailer from 'nodemailer'

// Validar variables de entorno requeridas
if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
  console.error('❌ [EMAIL] GMAIL_USER o GMAIL_APP_PASSWORD no están configurados')
}
if (!process.env.WAREHOUSE_EMAIL) {
  console.error('❌ [EMAIL] WAREHOUSE_EMAIL no está configurado')
}

console.log('[EMAIL CONFIG] Inicializando...')
console.log('[EMAIL CONFIG] GMAIL_USER:', process.env.GMAIL_USER ? '✅ Set' : '❌ Missing')
console.log('[EMAIL CONFIG] GMAIL_APP_PASSWORD:', process.env.GMAIL_APP_PASSWORD ? '✅ Set' : '❌ Missing')
console.log('[EMAIL CONFIG] WAREHOUSE_EMAIL:', process.env.WAREHOUSE_EMAIL || '❌ Missing')

// Configurar transporter de Nodemailer con Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER!,
    pass: process.env.GMAIL_APP_PASSWORD!
  }
})

const WAREHOUSE_EMAIL = process.env.WAREHOUSE_EMAIL!
const FROM_EMAIL = process.env.GMAIL_USER!
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
  if (!data.customerEmail) {
    return { success: true, skipped: true }
  }

  try {
    const itemsList = data.items
      .map(
        (item) =>
          `  • ${item.product_name} - ${item.quantity} uds`
      )
      .join('\n')

    await transporter.sendMail({
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

    console.log(`✅ Email confirmación enviado a: ${data.customerEmail}`)
    return { success: true }
  } catch (error) {
    console.error('❌ Error enviando email a cliente:', error)
    return { success: false, error }
  }
}

/**
 * Envía email al almacén cuando se crea un nuevo pedido
 */
export async function sendNewOrderToWarehouse(data: OrderEmailData) {
  try {
    const itemsList = data.items
      .map(
        (item) =>
          `  • ${item.product_name} - ${item.quantity} uds`
      )
      .join('\n')

    await transporter.sendMail({
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
→ https://backoffice.latraviata1999.com/pedidos

Una vez confirmado, el cliente recibirá una notificación automática.

Saludos,
Sistema de Gestión La Traviata`
    })

    console.log(`✅ Email nuevo pedido enviado a almacén: ${WAREHOUSE_EMAIL}`)
    return { success: true }
  } catch (error) {
    console.error('❌ Error enviando email a almacén:', error)
    return { success: false, error }
  }
}
