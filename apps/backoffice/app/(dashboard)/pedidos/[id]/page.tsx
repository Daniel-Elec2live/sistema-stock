'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  ArrowLeft,
  Package,
  User,
  Building,
  Phone,
  MapPin,
  Calendar,
  FileText,
  ShoppingBag,
  AlertTriangle,
  CheckCircle,
  Clock,
  Truck,
  XCircle,
  RefreshCw,
  Copy
} from 'lucide-react'

interface OrderItem {
  id: string
  product_id: string
  product_name: string
  quantity: number
  unit_price: number
  discount_percentage: number
  total_price: number
}

interface BackorderItem {
  product_id: string
  product_name: string
  requested_quantity: number
  available_quantity: number
  backorder_quantity: number
}

interface OrderDetails {
  id: string
  customer_name: string
  customer_company?: string
  customer_phone?: string
  customer_address?: string
  status: 'pending' | 'confirmed' | 'prepared' | 'delivered' | 'cancelled'
  total_amount: number
  total_items: number
  order_number?: string
  delivery_date?: string
  cancelled_at?: string
  cancellation_reason?: string
  notes?: string
  has_backorder: boolean
  created_at: string
  updated_at: string
  items: OrderItem[]
  backorder_items?: BackorderItem[]
}

const statusConfig = {
  pending: {
    label: 'Pendiente',
    color: 'bg-yellow-100 text-yellow-800',
    icon: Clock,
    description: 'Esperando confirmación'
  },
  confirmed: {
    label: 'Confirmado',
    color: 'bg-orange-100 text-orange-800',
    icon: CheckCircle,
    description: 'Confirmado, esperando preparación'
  },
  prepared: {
    label: 'Preparado',
    color: 'bg-blue-100 text-blue-800',
    icon: Package,
    description: 'Listo para entrega'
  },
  delivered: {
    label: 'Entregado',
    color: 'bg-green-100 text-green-800',
    icon: Truck,
    description: 'Completado'
  },
  cancelled: {
    label: 'Cancelado',
    color: 'bg-red-100 text-red-800',
    icon: XCircle,
    description: 'Cancelado'
  }
}

export default function OrderDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const orderId = params?.id as string

  const [order, setOrder] = useState<OrderDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(price)
  }

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const fetchOrderDetails = async () => {
    setLoading(true)
    try {
      // CRÍTICO: cache: 'no-store' deshabilita el Router Cache de Next.js (lado cliente)
      const response = await fetch(`/api/orders/${orderId}/details?_t=${Date.now()}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      const data = await response.json()

      if (data.success) {
        setOrder(data.data)
      } else {
        console.error('Error fetching order details:', data.error)
      }
    } catch (error) {
      console.error('Error fetching order details:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (newStatus: 'confirmed' | 'prepared' | 'delivered') => {
    if (!order) return

    console.log(`🔄 Order Details - Updating ${orderId.slice(0, 8)} to ${newStatus}`)

    setUpdating(true)
    try {
      const response = await fetch(`/api/orders/${orderId}/status?_patch=${Date.now()}&_r=${Math.random()}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0',
          'X-Timestamp': Date.now().toString()
        },
        body: JSON.stringify({ status: newStatus })
      })

      const data = await response.json()
      console.log(`📥 Order Details - API Response:`, data)

      if (data.success) {
        console.log(`✅ Order Details - Update successful, refreshing details...`)

        // Actualizar estado local inmediatamente para UX
        setOrder(prev => prev ? { ...prev, status: newStatus, updated_at: new Date().toISOString() } : null)

        console.log(`✅ Order Details - Status updated to ${newStatus}`)

        // REFRESCAR DATOS desde el servidor para sincronización
        console.log('🔄 Detail view - Fetching fresh data from server')
        fetchOrderDetails()

      } else {
        console.error(`❌ Order Details - Update failed:`, data.error)
        alert(`Error al actualizar el estado del pedido: ${data.error}`)
      }
    } catch (error) {
      console.error('Error updating order status:', error)
      alert('Error al actualizar el estado del pedido')
    } finally {
      setUpdating(false)
    }
  }

  const copyOrderId = () => {
    navigator.clipboard.writeText(orderId)
    // Simple feedback - you could use a toast here
    alert('ID del pedido copiado al portapapeles')
  }

  useEffect(() => {
    if (orderId) {
      fetchOrderDetails()
    }
  }, [orderId])

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Cargando detalles del pedido...</span>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <ShoppingBag className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Pedido no encontrado
          </h3>
          <p className="text-gray-600 mb-6">
            No se pudo encontrar el pedido solicitado
          </p>
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    )
  }

  const statusInfo = statusConfig[order.status]
  const StatusIcon = statusInfo.icon

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            onClick={() => router.back()}
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">
                Pedido #{order.id.slice(0, 8).toUpperCase()}
              </h1>
              <Button
                onClick={copyOrderId}
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-gray-600 mt-1">
              {formatDate(order.created_at)} • {order.total_items} {order.total_items === 1 ? 'artículo' : 'artículos'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge className={statusInfo.color}>
            <StatusIcon className="w-3 h-3 mr-1" />
            {statusInfo.label}
          </Badge>

          <Button
            onClick={fetchOrderDetails}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">

          {/* Customer Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="w-5 h-5 mr-2 text-gray-600" />
                Información del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <User className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{order.customer_name}</p>
                    <p className="text-sm text-gray-600">Nombre</p>
                  </div>
                </div>

                {order.customer_company && (
                  <div className="flex items-center gap-3">
                    <Building className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{order.customer_company}</p>
                      <p className="text-sm text-gray-600">Empresa</p>
                    </div>
                  </div>
                )}

                {order.customer_phone && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{order.customer_phone}</p>
                      <p className="text-sm text-gray-600">Teléfono</p>
                    </div>
                  </div>
                )}

                {order.customer_address && (
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="font-medium text-gray-900">{order.customer_address}</p>
                      <p className="text-sm text-gray-600">Dirección</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Order Items */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="w-5 h-5 mr-2 text-gray-600" />
                Productos ({order.items.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{item.product_name}</h4>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span>Cantidad: {item.quantity}</span>
                        <span>Precio unitario: {formatPrice(item.unit_price)}</span>
                        {item.discount_percentage > 0 && (
                          <span className="text-orange-600">Descuento: {item.discount_percentage}%</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-gray-900">
                        {formatPrice(item.total_price)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <Separator className="my-4" />

              <div className="flex justify-between text-lg font-bold">
                <span>Total del Pedido:</span>
                <span className="text-tomate">{formatPrice(order.total_amount)}</span>
              </div>
            </CardContent>
          </Card>

          {/* Backorder Items */}
          {order.has_backorder && order.backorder_items && order.backorder_items.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center text-orange-700">
                  <AlertTriangle className="w-5 h-5 mr-2" />
                  Productos en Backorder
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.backorder_items.map((item) => (
                    <div key={item.product_id} className="flex items-center justify-between p-3 bg-orange-50 border border-orange-200 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{item.product_name}</p>
                        <p className="text-sm text-orange-700">
                          Solicitado: {item.requested_quantity} | Disponible: {item.available_quantity} | Pendiente: {item.backorder_quantity}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {order.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2 text-gray-600" />
                  Notas del Pedido
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{order.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Status and Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Estado del Pedido</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <Badge className={`${statusInfo.color} text-sm px-3 py-1`}>
                  <StatusIcon className="w-4 h-4 mr-1" />
                  {statusInfo.label}
                </Badge>
                <p className="text-sm text-gray-600 mt-2">
                  {statusInfo.description}
                </p>
              </div>

              <Separator />

              {/* Action Buttons */}
              <div className="space-y-3">
                {order.status === 'pending' && (
                  <Button
                    onClick={() => updateOrderStatus('confirmed')}
                    disabled={updating}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    {updating ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="w-4 h-4 mr-2" />
                    )}
                    Confirmar Pedido
                  </Button>
                )}

                {order.status === 'confirmed' && (
                  <Button
                    onClick={() => updateOrderStatus('prepared')}
                    disabled={updating}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {updating ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Package className="w-4 h-4 mr-2" />
                    )}
                    Marcar como Preparado
                  </Button>
                )}

                {order.status === 'prepared' && (
                  <Button
                    onClick={() => updateOrderStatus('delivered')}
                    disabled={updating}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {updating ? (
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Truck className="w-4 h-4 mr-2" />
                    )}
                    Marcar como Entregado
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {order.order_number && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Número:</span>
                  <span className="font-medium">{order.order_number}</span>
                </div>
              )}

              <div className="flex justify-between">
                <span className="text-gray-600">Artículos:</span>
                <span className="font-medium">{order.total_items}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Total:</span>
                <span className="font-bold text-tomate">{formatPrice(order.total_amount)}</span>
              </div>

              {order.delivery_date && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Entrega:</span>
                  <span className="font-medium">
                    {new Date(order.delivery_date).toLocaleDateString('es-ES')}
                  </span>
                </div>
              )}

              <Separator />

              <div className="text-xs text-gray-500">
                <p>Creado: {formatDate(order.created_at)}</p>
                <p>Actualizado: {formatDate(order.updated_at)}</p>
                {order.cancelled_at && (
                  <p className="text-red-600">Cancelado: {formatDate(order.cancelled_at)}</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}