'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Order, OrderStatus } from '@/lib/types'
import { useOrders } from '@/hooks/useOrders'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { toast } from '@/components/ui/toast'
import { 
  Package, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Eye,
  MoreVertical,
  Calendar,
  ShoppingBag
} from 'lucide-react'

interface OrderHistoryProps {
  orders: Order[]
  loading: boolean
  error: string | null
}

export function OrderHistory({ orders, loading, error }: OrderHistoryProps) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [cancelingOrder, setCancelingOrder] = useState<string | null>(null)
  const { cancelOrder } = useOrders()

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusIcon = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-amber-500" />
      case 'prepared':
        return <Package className="w-4 h-4 text-blue-500" />
      case 'delivered':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />
      default:
        return <Package className="w-4 h-4 text-gray-500" />
    }
  }

  const getStatusLabel = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'Pendiente'
      case 'prepared':
        return 'Preparado'
      case 'delivered':
        return 'Entregado'
      case 'cancelled':
        return 'Cancelado'
      default:
        return status
    }
  }

  const getStatusColor = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return 'bg-amber-100 text-amber-800 border-amber-200'
      case 'prepared':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'delivered':
        return 'bg-green-100 text-green-800 border-green-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('¿Estás seguro de que quieres cancelar este pedido? Esta acción no se puede deshacer.')) {
      return
    }

    setCancelingOrder(orderId)
    
    try {
      await cancelOrder(orderId, 'Cancelado por el cliente')
      toast({
        title: "Pedido cancelado",
        description: "El pedido ha sido cancelado y el stock ha sido repuesto automáticamente",
        variant: "success"
      })
    } catch (error) {
      toast({
        title: "Error al cancelar",
        description: error instanceof Error ? error.message : "No se pudo cancelar el pedido",
        variant: "destructive"
      })
    } finally {
      setCancelingOrder(null)
    }
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar pedidos</h3>
        <p className="text-gray-600">{error}</p>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-4">
        {orders.map((order) => (
          <Card key={order.id} className="p-6 hover:shadow-md transition-shadow">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              
              {/* Info principal del pedido */}
              <div className="flex-1">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <h3 className="font-semibold text-gray-900">
                      Pedido #{order.id.slice(-8)}
                    </h3>
                    <Badge className={`border ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      <span className="ml-1">{getStatusLabel(order.status)}</span>
                    </Badge>
                    
                    {order.has_backorder && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 border-amber-200">
                        <AlertTriangle className="w-3 h-3 mr-1" />
                        Backorder
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex items-center text-sm text-gray-500">
                    <Calendar className="w-4 h-4 mr-1" />
                    {formatDate(order.created_at)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <ShoppingBag className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">
                      {order.total_items} {order.total_items === 1 ? 'artículo' : 'artículos'}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Package className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">
                      {order.items?.length || 0} {(order.items?.length || 0) === 1 ? 'producto' : 'productos'} diferentes
                    </span>
                  </div>
                  
                  <div className="font-semibold text-[var(--color-tomate)]">
                    Total: {formatPrice(order.total_amount)}
                  </div>
                </div>

                {/* Preview de productos */}
                {order.items && order.items.length > 0 && (
                  <div className="mt-3">
                    <div className="flex flex-wrap gap-1">
                      {order.items.slice(0, 3).map((item) => (
                        <span
                          key={item.id}
                          className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded"
                        >
                          {item.quantity}x {item.product_name}
                        </span>
                      ))}
                      {order.items.length > 3 && (
                        <span className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded">
                          +{order.items.length - 3} más
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Backorder items preview */}
                {order.has_backorder && order.backorder_items && (
                  <div className="mt-2 p-2 bg-amber-50 rounded-lg">
                    <p className="text-xs text-amber-700 font-medium mb-1">Artículos pendientes:</p>
                    <div className="flex flex-wrap gap-1">
                      {order.backorder_items.map((item) => (
                        <span 
                          key={item.product_id}
                          className="inline-block bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded"
                        >
                          {item.backorder_quantity}x {item.product_name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Acciones */}
              <div className="flex flex-col sm:flex-row gap-2 lg:flex-col">
                <Link href={`/pedidos/${order.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    <Eye className="w-4 h-4 mr-2" />
                    Ver detalles
                  </Button>
                </Link>
                
                {order.status === 'pending' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancelOrder(order.id)}
                    disabled={cancelingOrder === order.id}
                    className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    {cancelingOrder === order.id ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600 mr-2"></div>
                        Cancelando...
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4 mr-2" />
                        Cancelar
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Modal de detalles del pedido */}
      <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Pedido #{selectedOrder?.id.slice(-8)}
            </DialogTitle>
          </DialogHeader>
          
          {selectedOrder && (
            <div className="space-y-4">
              {/* Estado y fecha */}
              <div className="flex items-center justify-between">
                <Badge className={`border ${getStatusColor(selectedOrder.status)}`}>
                  {getStatusIcon(selectedOrder.status)}
                  <span className="ml-1">{getStatusLabel(selectedOrder.status)}</span>
                </Badge>
                <span className="text-sm text-gray-500">
                  {formatDate(selectedOrder.created_at)}
                </span>
              </div>

              {/* Productos */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Productos</h4>
                <div className="space-y-2">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="flex justify-between items-center py-2 border-b border-gray-100">
                      <div>
                        <p className="font-medium text-gray-900">{item.product_name}</p>
                        <p className="text-sm text-gray-600">
                          Cantidad: {item.quantity} × {formatPrice(item.unit_price)}
                        </p>
                      </div>
                      <p className="font-semibold">{formatPrice(item.total_price)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="flex justify-between items-center text-lg font-semibold border-t pt-3">
                <span>Total:</span>
                <span className="text-[var(--color-tomate)]">
                  {formatPrice(selectedOrder.total_amount)}
                </span>
              </div>

              {/* Notas */}
              {selectedOrder.notes && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Notas del pedido</h4>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">
                    {selectedOrder.notes}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}