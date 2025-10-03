import nodemailer from 'nodemailer'

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

interface StockAlertData {
  productName: string
  currentStock: number
  minimumStock: number
  alertType: 'critical' | 'out_of_stock'
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
→ https://sistema-stock-lac.vercel.app/pedidos

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

/**
 * Envía email al cliente cuando cambia el estado del pedido
 */
export async function sendOrderStatusUpdateToCustomer(
  data: OrderEmailData,
  oldStatus: string,
  newStatus: string
) {
  if (!data.customerEmail) {
    return { success: true, skipped: true }
  }

  const statusInfo: Record<string, { emoji: string; title: string; message: string; nextSteps: string }> = {
    confirmed: {
      emoji: '✅',
      title: 'Pedido Confirmado',
      message: 'Hemos revisado y confirmado tu pedido. Estamos preparándolo para ti.',
      nextSteps: 'Te avisaremos cuando esté listo para entrega o recogida.'
    },
    prepared: {
      emoji: '📦',
      title: 'Pedido Preparado',
      message: '¡Tu pedido está listo! Ya puedes pasar a recogerlo o estamos listos para enviártelo.',
      nextSteps: 'Te confirmaremos cuando esté en camino o disponible para recogida.'
    },
    delivered: {
      emoji: '🎉',
      title: 'Pedido Entregado',
      message: '¡Tu pedido ha sido entregado con éxito! Esperamos que todo esté perfecto.',
      nextSteps: 'Si tienes alguna incidencia, contacta con nosotros lo antes posible.'
    },
    cancelled: {
      emoji: '❌',
      title: 'Pedido Cancelado',
      message: 'Tu pedido ha sido cancelado.',
      nextSteps: 'Si necesitas más información sobre esta cancelación, contacta con nosotros.'
    }
  }

  const info = statusInfo[newStatus] || {
    emoji: '📢',
    title: 'Actualización de Pedido',
    message: `El estado de tu pedido ha cambiado a: ${newStatus}`,
    nextSteps: 'Te mantendremos informado de cualquier novedad.'
  }

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: data.customerEmail,
      subject: `${info.emoji} ${info.title} #${data.orderNumber || data.orderId.slice(0, 8)}`,
      text: `Hola ${data.customerName},

${info.message}

═══════════════════════════════════════════════════

📋 INFORMACIÓN DEL PEDIDO

Número de pedido: #${data.orderNumber || data.orderId.slice(0, 8)}
Estado actual: ${info.title}

═══════════════════════════════════════════════════

📢 PRÓXIMOS PASOS

${info.nextSteps}

Si tienes alguna pregunta, no dudes en contactarnos.

Gracias por tu confianza,
El equipo de La Traviata`
    })

    console.log(`✅ Email actualización enviado a: ${data.customerEmail}`)
    return { success: true }
  } catch (error) {
    console.error('❌ Error enviando email actualización a cliente:', error)
    return { success: false, error }
  }
}

/**
 * Envía email al almacén cuando cambia el estado del pedido
 */
export async function sendOrderStatusUpdateToWarehouse(
  data: OrderEmailData,
  oldStatus: string,
  newStatus: string
) {
  const statusLabels: Record<string, string> = {
    pending: '⏳ Pendiente',
    confirmed: '✅ Confirmado',
    prepared: '📦 Preparado',
    delivered: '🚚 Entregado',
    cancelled: '❌ Cancelado'
  }

  const oldLabel = statusLabels[oldStatus] || oldStatus
  const newLabel = statusLabels[newStatus] || newStatus

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: WAREHOUSE_EMAIL,
      subject: `📊 Cambio de Estado: Pedido #${data.orderNumber || data.orderId.slice(0, 8)} → ${statusLabels[newStatus]}`,
      text: `═══════════════════════════════════════════════════
📊 ACTUALIZACIÓN DE ESTADO
═══════════════════════════════════════════════════

Pedido: #${data.orderNumber || data.orderId.slice(0, 8)}
Cliente: ${data.customerName}

Estado anterior: ${oldLabel}
Estado nuevo: ${newLabel}

───────────────────────────────────────────────────

✉️ El cliente ha sido notificado automáticamente del cambio.

Sistema de Gestión La Traviata`
    })

    console.log(`✅ Email actualización enviado a almacén: ${WAREHOUSE_EMAIL}`)
    return { success: true }
  } catch (error) {
    console.error('❌ Error enviando email actualización a almacén:', error)
    return { success: false, error }
  }
}

/**
 * Envía email al almacén cuando hay alerta de stock crítico
 */
export async function sendStockAlert(data: StockAlertData) {
  const alertEmoji = data.alertType === 'out_of_stock' ? '🚨' : '⚠️'
  const alertLabel = data.alertType === 'out_of_stock' ? 'AGOTADO' : 'CRÍTICO'
  const urgency = data.alertType === 'out_of_stock' ? 'URGENTE' : 'IMPORTANTE'

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: WAREHOUSE_EMAIL,
      subject: `${alertEmoji} [${urgency}] Stock ${alertLabel}: ${data.productName}`,
      text: `═══════════════════════════════════════════════════
${alertEmoji} ALERTA DE STOCK ${alertLabel}
═══════════════════════════════════════════════════

Producto: ${data.productName}

Stock actual: ${data.currentStock} uds
Stock mínimo: ${data.minimumStock} uds
Diferencia: ${data.currentStock - data.minimumStock} uds

───────────────────────────────────────────────────

${data.alertType === 'out_of_stock'
  ? `⚠️ PRODUCTO AGOTADO

Este producto está completamente sin stock. Los clientes no podrán
realizar pedidos hasta que se reponga.

ACCIÓN REQUERIDA: Gestionar reposición con urgencia.`
  : `⚠️ STOCK POR DEBAJO DEL MÍNIMO

Este producto está cerca de agotarse. Considera planificar una
reposición pronto para evitar quedarte sin stock.

ACCIÓN SUGERIDA: Revisar niveles y planificar pedido al proveedor.`
}

───────────────────────────────────────────────────

📊 Accede al backoffice para gestionar la reposición:
→ https://sistema-stock-lac.vercel.app/stock

Sistema de Gestión La Traviata`
    })

    console.log(`✅ Email alerta stock enviado a almacén: ${WAREHOUSE_EMAIL}`)
    return { success: true }
  } catch (error) {
    console.error('❌ Error enviando alerta de stock:', error)
    return { success: false, error }
  }
}

/**
 * Envía email al cliente cuando cambia el estado de pago
 */
export async function sendPaymentStatusUpdateToCustomer(
  customerEmail: string,
  customerName: string,
  orderId: string,
  orderNumber: string | undefined,
  paymentStatus: string
) {
  if (!customerEmail) {
    return { success: true, skipped: true }
  }

  const statusInfo: Record<string, { emoji: string; title: string; message: string }> = {
    paid: {
      emoji: '✅',
      title: 'Pago Confirmado',
      message: '¡Perfecto! Hemos confirmado la recepción de tu pago. Tu pedido está procesándose normalmente.'
    },
    partial: {
      emoji: '⚠️',
      title: 'Pago Parcial Recibido',
      message: 'Hemos recibido un pago parcial de tu pedido. Nos pondremos en contacto contigo para gestionar el importe pendiente.'
    },
    overdue: {
      emoji: '⏰',
      title: 'Pago Pendiente',
      message: 'Tu pedido tiene un pago pendiente. Por favor, contacta con nosotros para regularizar la situación.'
    }
  }

  const info = statusInfo[paymentStatus] || {
    emoji: '💳',
    title: 'Actualización de Pago',
    message: `El estado de pago de tu pedido ha cambiado: ${paymentStatus}`
  }

  try {
    await transporter.sendMail({
      from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
      to: customerEmail,
      subject: `${info.emoji} ${info.title} - Pedido #${orderNumber || orderId.slice(0, 8)}`,
      text: `Hola ${customerName},

${info.message}

═══════════════════════════════════════════════════

📋 INFORMACIÓN DEL PEDIDO

Número de pedido: #${orderNumber || orderId.slice(0, 8)}
Estado de pago: ${info.title}

═══════════════════════════════════════════════════

Si tienes alguna duda sobre este pago, no dudes en contactarnos.

Gracias por tu confianza,
El equipo de La Traviata`
    })

    console.log(`✅ Email confirmación pago enviado a: ${customerEmail}`)
    return { success: true }
  } catch (error) {
    console.error('❌ Error enviando email confirmación pago:', error)
    return { success: false, error }
  }
}
