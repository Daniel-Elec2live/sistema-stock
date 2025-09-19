'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useOrders } from '@/hooks/useOrders'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  CheckCircle, 
  Package, 
  Clock, 
  AlertTriangle, 
  ArrowRight, 
  Share2,
  Copy
} from 'lucide-react'
import { showToast } from '@/lib/toast-helpers'
import { Order } from '@/lib/types'

export default function ConfirmacionPage() {
  const params = useParams()
  const orderId = params.orderId as string
  const { getOrder } = useOrders()
  
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

  const copyOrderId = () => {
    navigator.clipboard.writeText(orderId)
    showToast.success("Copiado", "ID del pedido copiado al portapapeles")
  }

  const shareOrder = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Pedido La Traviata 1999',
        text: `Mi pedido #${orderId.slice(-8)} ha sido confirmado`,
        url: window.location.href
      })
    } else {
      copyOrderId()
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
          <Link href="/catalogo">
            <Button className="btn-primary">Volver al catálogo</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      
      {/* Header de confirmación */}
      <div className="text-center mb-12">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-12 h-12 text-green-600" />
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          ¡Pedido Confirmado!
        </h1>
        
        <p className="text-lg text-gray-600 mb-4">
          Tu pedido ha sido procesado correctamente
        </p>
        
        <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
          <span>Pedido ID:</span>
          <code className="bg-gray-100 px-2 py-1 rounded font-mono">
            #{orderId.slice(-8)}
          </code>
          <Button
            variant="ghost"
            size="sm"
            onClick={copyOrderId}
            className="p-1"
          >
            <Copy className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Detalles del pedido */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Estado y fechas */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Estado del pedido</h2>
            
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-[var(--color-pan)] rounded-full"></div>
                <span className="font-medium capitalize">{order.status}</span>
              </div>
              <span className="text-sm text-gray-500">
                {formatDate(order.created_at)}
              </span>
            </div>

            {/* Timeline del pedido */}
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm">Pedido confirmado</span>
              </div>
              <div className="flex items-center space-x-3">
                <Clock className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-500">En preparación</span>
              </div>
              <div className="flex items-center space-x-3">
                <Package className="w-5 h-5 text-gray-400" />
                <span className="text-sm text-gray-500">Listo para entrega</span>
              </div>
            </div>
          </Card>

          {/* Alerta de backorder si aplica */}
          {order.has_backorder && order.backorder_items && (
            <Card className="p-6 border-amber-200 bg-amber-50">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-6 h-6 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-amber-900 mb-2">
                    Pedido parcial - Algunos productos pendientes
                  </h3>
                  <p className="text-sm text-amber-800 mb-3">
                    Algunos productos no tenían stock suficiente. Recibirás lo disponible ahora 
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Productos ({order.total_items} {order.total_items === 1 ? 'artículo' : 'artículos'})
            </h2>
            
            <div className="space-y-4">
              {order.items.map((item) => (
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
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Notas del pedido</h2>
              <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{order.notes}</p>
            </Card>
          )}
        </div>

        {/* Resumen y acciones */}
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
                <Link href="/pedidos" className="block">
                  <Button variant="outline" className="w-full">
                    <Package className="w-4 h-4 mr-2" />
                    Ver mis pedidos
                  </Button>
                </Link>
                
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={shareOrder}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Compartir pedido
                </Button>
                
                <Link href="/catalogo" className="block">
                  <Button className="w-full btn-primary">
                    <ArrowRight className="w-4 h-4 mr-2" />
                    Seguir comprando
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Información adicional */}
            <Card className="p-6 bg-blue-50 border-blue-200">
              <h3 className="font-semibold text-blue-900 mb-2">¿Qué sigue?</h3>
              <div className="space-y-2 text-sm text-blue-800">
                <p>• Nuestro equipo preparará tu pedido</p>
                <p>• Te contactaremos para coordinar la entrega</p>
                <p>• El pago se gestionará según nuestro acuerdo comercial</p>
                {order.has_backorder && (
                  <p>• Te notificaremos cuando tengamos los productos pendientes</p>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}