'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useOrders } from '@/hooks/useOrders'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { showToast } from '@/lib/toast-helpers'
import {
  CheckCircle,
  Package,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Share2,
  Copy,
  XCircle,
  Truck,
  Calendar,
  User,
  Phone,
  MapPin,
  Building,
  FileText,
  MoreVertical
} from 'lucide-react'
import { Order } from '@/lib/types'

export default function PedidoDetallePage() {
  const params = useParams()
  const orderId = params.id as string
  const { getOrder, cancelOrder } = useOrders()

  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  useEffect(() => {
    const fetchOrder = async () => {
      if (!orderId) return

      try {
        setLoading(true)
        const orderData = await getOrder(orderId)
        setOrder(orderData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar el pedido')
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId, getOrder])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'pending':
        return {
          label: 'Pendiente',
          color: 'bg-yellow-100 text-yellow-800',
          icon: Clock
        }
      case 'prepared':
        return {
          label: 'Preparado',
          color: 'bg-blue-100 text-blue-800',
          icon: Package
        }
      case 'delivered':
        return {
          label: 'Entregado',
          color: 'bg-green-100 text-green-800',
          icon: CheckCircle
        }
      case 'cancelled':
        return {
          label: 'Cancelado',
          color: 'bg-red-100 text-red-800',
          icon: XCircle
        }
      default:
        return {
          label: status,
          color: 'bg-gray-100 text-gray-800',
          icon: Package
        }
    }
  }

  const copyOrderId = () => {
    navigator.clipboard.writeText(orderId)
    showToast.success("Copiado", "ID del pedido copiado al portapapeles")
  }

  const shareOrder = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Pedido La Traviata 1999',
        text: `Detalles del pedido #${orderId.slice(-8)}`,
        url: window.location.href
      })
    } else {
      copyOrderId()
    }
  }

  const handleCancelOrder = async () => {
    if (!order) return

    setCancelling(true)
    try {
      await cancelOrder(orderId, 'Cancelado por el cliente')
      showToast.order.cancelled(orderId)
      setOrder(prev => prev ? { ...prev, status: 'cancelled' } : null)
      setShowCancelDialog(false)
    } catch (error) {
      showToast.order.cancelError('No se pudo cancelar el pedido')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[var(--color-tomate)] mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando detalles del pedido...</p>
        </div>
      </div>
    )
  }

  if (error || !order) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Pedido no encontrado</h1>
          <p className="text-gray-600 mb-6">{error || 'No se pudo cargar la información del pedido'}</p>
          <Link href="/pedidos">
            <Button className="btn-primary">Volver a mis pedidos</Button>
          </Link>
        </div>
      </div>
    )
  }

  const statusInfo = getStatusInfo(order.status)
  const StatusIcon = statusInfo.icon

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link href="/pedidos">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>

          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Pedido #{orderId.slice(-8)}
            </h1>
            <p className="text-gray-600">
              Creado el {formatDate(order.created_at)}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Badge className={statusInfo.color}>
            <StatusIcon className="w-4 h-4 mr-1" />
            {statusInfo.label}
          </Badge>

          <Button variant="outline" size="sm" onClick={shareOrder}>
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* Contenido principal */}
        <div className="lg:col-span-2 space-y-6">

          {/* Información del cliente */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-[var(--color-tomate)]" />
              Información del cliente
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <Building className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{order.customer_name}</p>
                  {order.customer_company && (
                    <p className="text-sm text-gray-600">{order.customer_company}</p>
                  )}
                </div>
              </div>

              {order.customer_phone && (
                <div className="flex items-center space-x-3">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-gray-900">{order.customer_phone}</p>
                    <p className="text-sm text-gray-600">Teléfono</p>
                  </div>
                </div>
              )}

              {order.customer_address && (
                <div className="md:col-span-2 flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-900">{order.customer_address}</p>
                    <p className="text-sm text-gray-600">Dirección de entrega</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Timeline del pedido */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-[var(--color-tomate)]" />
              Estado del pedido
            </h2>

            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <div>
                  <span className="font-medium">Pedido confirmado</span>
                  <p className="text-sm text-gray-500">{formatDate(order.created_at)}</p>
                </div>
              </div>

              {order.status !== 'cancelled' && (
                <>
                  <div className={`flex items-center space-x-3 ${
                    ['prepared', 'delivered'].includes(order.status) ? '' : 'opacity-50'
                  }`}>
                    <Package className={`w-5 h-5 ${
                      ['prepared', 'delivered'].includes(order.status) ? 'text-blue-500' : 'text-gray-400'
                    }`} />
                    <div>
                      <span className="font-medium">En preparación</span>
                      {order.prepared_at && (
                        <p className="text-sm text-gray-500">{formatDate(order.prepared_at)}</p>
                      )}
                    </div>
                  </div>

                  <div className={`flex items-center space-x-3 ${
                    order.status === 'delivered' ? '' : 'opacity-50'
                  }`}>
                    <Truck className={`w-5 h-5 ${
                      order.status === 'delivered' ? 'text-green-500' : 'text-gray-400'
                    }`} />
                    <div>
                      <span className="font-medium">Entregado</span>
                      {order.delivered_at && (
                        <p className="text-sm text-gray-500">{formatDate(order.delivered_at)}</p>
                      )}
                    </div>
                  </div>
                </>
              )}

              {order.status === 'cancelled' && (
                <div className="flex items-center space-x-3">
                  <XCircle className="w-5 h-5 text-red-500" />
                  <div>
                    <span className="font-medium">Pedido cancelado</span>
                    {order.cancelled_at && (
                      <p className="text-sm text-gray-500">{formatDate(order.cancelled_at)}</p>
                    )}
                    {order.cancellation_reason && (
                      <p className="text-sm text-gray-600">Motivo: {order.cancellation_reason}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Alerta de backorder */}
          {order.has_backorder && order.backorder_items && (
            <Card className="p-6 border-amber-200 bg-amber-50">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-6 h-6 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-amber-900 mb-2">
                    Productos pendientes
                  </h3>
                  <p className="text-sm text-amber-800 mb-3">
                    Algunos productos no tenían stock suficiente. Recibirás lo disponible
                    y te notificaremos cuando tengamos el resto.
                  </p>

                  <div className="space-y-2">
                    {order.backorder_items.map((item) => (
                      <div key={item.product_id} className="flex justify-between text-sm">
                        <span className="text-amber-800">{item.product_name}</span>
                        <span className="text-amber-700 font-medium">
                          {item.backorder_quantity} pendientes
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Productos del pedido */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Package className="w-5 h-5 mr-2 text-[var(--color-tomate)]" />
              Productos ({order.total_items} {order.total_items === 1 ? 'artículo' : 'artículos'})
            </h2>

            <div className="space-y-4">
              {order.items?.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900">{item.product_name}</h3>
                    <p className="text-sm text-gray-600">
                      Cantidad: {item.quantity}
                    </p>
                    {item.discount_percentage > 0 && (
                      <p className="text-xs text-green-600">
                        Descuento aplicado: {item.discount_percentage}%
                      </p>
                    )}
                  </div>

                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {formatPrice(item.total_price)}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatPrice(item.unit_price)} c/u
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Notas del pedido */}
          {order.notes && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2 text-[var(--color-tomate)]" />
                Notas del pedido
              </h2>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{order.notes}</p>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6">

            {/* Resumen del pedido */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumen</h2>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatPrice(order.total_amount)}</span>
                </div>

                <div className="flex justify-between">
                  <span className="text-gray-600">Envío</span>
                  <span className="font-medium text-[var(--color-rucula)]">Gratuito</span>
                </div>

                <Separator />

                <div className="flex justify-between text-lg">
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-[var(--color-tomate)]">
                    {formatPrice(order.total_amount)}
                  </span>
                </div>
              </div>
            </Card>

            {/* Acciones */}
            <Card className="p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Acciones</h2>

              <div className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={copyOrderId}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar ID del pedido
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={shareOrder}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Compartir pedido
                </Button>

                {order.status === 'pending' && (
                  <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
                    <DialogTrigger asChild>
                      <Button variant="outline" className="w-full text-red-600 hover:text-red-700">
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancelar pedido
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>¿Cancelar pedido?</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-gray-600">
                          ¿Estás seguro de que quieres cancelar este pedido?
                          El stock se repondrá automáticamente.
                        </p>
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            onClick={() => setShowCancelDialog(false)}
                          >
                            No, mantener
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={handleCancelOrder}
                            disabled={cancelling}
                          >
                            {cancelling ? 'Cancelando...' : 'Sí, cancelar'}
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}

                <Link href="/catalogo" className="block">
                  <Button className="w-full btn-primary">
                    <Package className="w-4 h-4 mr-2" />
                    Seguir comprando
                  </Button>
                </Link>
              </div>
            </Card>

            {/* ID del pedido */}
            <Card className="p-4 bg-gray-50">
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">ID del pedido</p>
                <code className="bg-white px-3 py-2 rounded font-mono text-sm border">
                  {orderId}
                </code>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}