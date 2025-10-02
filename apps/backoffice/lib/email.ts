import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY!)
const WAREHOUSE_EMAIL = process.env.WAREHOUSE_EMAIL!

// TEMPORAL: Usar dominio sandbox de Resend hasta verificar dominio propio
// Para producción: verificar latraviata1999.com en Resend Dashboard
const FROM_EMAIL = 'La Traviata <onboarding@resend.dev>'

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
    console.log('No customer email provided, skipping confirmation email')
    return { success: true, skipped: true }
  }

  try {
    const itemsList = data.items
      .map(
        (item) =>
          `- ${item.product_name} x${item.quantity} - ${(item.total_price / 100).toFixed(2)}€`
      )
      .join('\n')

    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject: `Pedido Confirmado #${data.orderNumber || data.orderId.slice(0, 8)}`,
      text: `Hola ${data.customerName},

Tu pedido ha sido recibido correctamente.

Detalles del pedido:
${itemsList}

Total: ${(data.totalAmount / 100).toFixed(2)}€

Te notificaremos cuando esté preparado para entrega.

Gracias por tu confianza,
La Traviata`
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
          `- ${item.product_name} x${item.quantity} - ${(item.unit_price / 100).toFixed(2)}€/ud`
      )
      .join('\n')

    await resend.emails.send({
      from: FROM_EMAIL,
      to: WAREHOUSE_EMAIL,
      subject: `🔔 Nuevo Pedido #${data.orderNumber || data.orderId.slice(0, 8)}`,
      text: `Nuevo pedido recibido de ${data.customerName}

Productos:
${itemsList}

Total: ${(data.totalAmount / 100).toFixed(2)}€

Accede al backoffice para confirmar y preparar el pedido.`
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
    console.log('No customer email provided, skipping status update email')
    return { success: true, skipped: true }
  }

  const statusMessages: Record<string, string> = {
    confirmed: 'Tu pedido ha sido confirmado y está siendo preparado.',
    prepared: 'Tu pedido está listo para entrega.',
    delivered: 'Tu pedido ha sido entregado. ¡Gracias por tu compra!',
    cancelled: 'Tu pedido ha sido cancelado.'
  }

  const message = statusMessages[newStatus] || `Estado actualizado a: ${newStatus}`

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.customerEmail,
      subject: `Actualización de Pedido #${data.orderNumber || data.orderId.slice(0, 8)}`,
      text: `Hola ${data.customerName},

${message}

Número de pedido: #${data.orderNumber || data.orderId.slice(0, 8)}
Total: ${(data.totalAmount / 100).toFixed(2)}€

Gracias,
La Traviata`
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
    pending: 'Pendiente',
    confirmed: 'Confirmado',
    prepared: 'Preparado',
    delivered: 'Entregado',
    cancelled: 'Cancelado'
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: WAREHOUSE_EMAIL,
      subject: `📦 Pedido #${data.orderNumber || data.orderId.slice(0, 8)} - ${statusLabels[newStatus] || newStatus}`,
      text: `El pedido de ${data.customerName} ha cambiado de estado:

${statusLabels[oldStatus] || oldStatus} → ${statusLabels[newStatus] || newStatus}

Pedido: #${data.orderNumber || data.orderId.slice(0, 8)}
Total: ${(data.totalAmount / 100).toFixed(2)}€`
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
  const alertLabel = data.alertType === 'out_of_stock' ? 'SIN STOCK' : 'Stock Crítico'

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: WAREHOUSE_EMAIL,
      subject: `${alertEmoji} ${alertLabel}: ${data.productName}`,
      text: `Alerta de stock ${data.alertType === 'out_of_stock' ? 'AGOTADO' : 'CRÍTICO'}

Producto: ${data.productName}
Stock actual: ${data.currentStock}
Stock mínimo: ${data.minimumStock}

${data.alertType === 'out_of_stock' ? '⚠️ PRODUCTO AGOTADO - Reponer con urgencia' : '⚠️ Por debajo del stock mínimo - Considerar reposición'}

Accede al backoffice para gestionar la reposición.`
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
    console.log('No customer email provided, skipping payment update email')
    return { success: true, skipped: true }
  }

  const statusMessages: Record<string, string> = {
    paid: 'Hemos confirmado el pago de tu pedido. ¡Gracias!',
    partial: 'Hemos recibido un pago parcial de tu pedido.',
    overdue: 'Tu pedido tiene un pago pendiente. Por favor, contacta con nosotros.'
  }

  const message = statusMessages[paymentStatus] || `Estado de pago actualizado a: ${paymentStatus}`

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: customerEmail,
      subject: `Confirmación de Pago #${orderNumber || orderId.slice(0, 8)}`,
      text: `Hola ${customerName},

${message}

Número de pedido: #${orderNumber || orderId.slice(0, 8)}

Gracias por tu confianza,
La Traviata`
    })

    console.log(`✅ Email confirmación pago enviado a: ${customerEmail}`)
    return { success: true }
  } catch (error) {
    console.error('❌ Error enviando email confirmación pago:', error)
    return { success: false, error }
  }
}
