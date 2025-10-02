'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ShoppingBag,
  Search,
  Filter,
  Eye,
  Package,
  Clock,
  CheckCircle,
  Truck,
  XCircle,
  User,
  Building,
  Phone,
  MapPin,
  RefreshCw,
  DollarSign,
  CreditCard
} from 'lucide-react'

interface Order {
  id: string
  customer_name: string
  customer_company?: string
  customer_phone?: string
  customer_address?: string
  status: 'pending' | 'confirmed' | 'prepared' | 'delivered' | 'cancelled'
  payment_status?: 'pending' | 'paid'
  total_amount: number
  total_items: number
  created_at: string
  updated_at: string
  order_number?: string
  delivery_date?: string
  cancelled_at?: string
  cancellation_reason?: string
  notes?: string
  has_backorder: boolean
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

const paymentStatusConfig = {
  pending: {
    label: 'Pendiente de pago',
    color: 'bg-red-100 text-red-800'
  },
  paid: {
    label: 'Pagado',
    color: 'bg-green-100 text-green-800'
  }
}

export default function PedidosPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [processingOrderId, setProcessingOrderId] = useState<string | null>(null)
  const [processingPaymentId, setProcessingPaymentId] = useState<string | null>(null)

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

  const fetchOrders = async (showLoader = false) => {
    // Solo mostrar loader en carga inicial o auto-refresh, no después de actualizar
    if (showLoader) {
      setLoading(true)
    }

    try {
      const timestamp = Date.now()
      console.log(`🔄 [FRONTEND] Fetching orders at ${timestamp}`)

      const response = await fetch(`/api/orders?_t=${timestamp}`, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      const data = await response.json()

      console.log(`📥 [FRONTEND] Received ${data.data?.length || 0} orders:`, data.data?.map((o: any) => ({
        id: o.id.slice(0, 8),
        status: o.status,
        updated_at: o.updated_at
      })))

      if (data.success) {
        console.log(`✅ [FRONTEND] Setting orders to state`)
        // Forzar nuevo array para que React detecte el cambio
        setOrders([...data.data])
        setLastUpdated(new Date())

        // Force re-render (React 18+)
        console.log(`🔄 [FRONTEND] State updated, should trigger re-render`)
      } else {
        console.error('Error fetching orders:', data.error)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      if (showLoader) {
        setLoading(false)
      }
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: 'confirmed' | 'prepared' | 'delivered') => {
    // Prevenir múltiples ejecuciones simultáneas
    if (processingOrderId === orderId) {
      return
    }

    setProcessingOrderId(orderId)

    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({ status: newStatus })
      })

      const data = await response.json()

      if (data.success) {
        console.log(`✅ [UPDATE] Status changed successfully, fetching fresh data...`)

        // Esperar 500ms para asegurar que el servidor propagó el cambio
        await new Promise(resolve => setTimeout(resolve, 500))

        // Refrescar datos del servidor SIN actualización optimista
        await fetchOrders(false)

        console.log(`✅ [UPDATE] Fresh data loaded`)

      } else {
        console.error('Error updating order:', data.error)
        alert(`Error al actualizar el estado del pedido: ${data.error}`)
      }
    } catch (error) {
      console.error('Network error:', error)
      alert('Error de conexión al actualizar el estado del pedido')
    } finally {
      setProcessingOrderId(null)
    }
  }

  const togglePaymentStatus = async (orderId: string, currentStatus: string) => {
    if (processingPaymentId === orderId) {
      return
    }

    // Alternar entre pending y paid
    const newStatus = currentStatus === 'paid' ? 'pending' : 'paid'
    setProcessingPaymentId(orderId)

    try {
      const response = await fetch(`/api/orders/${orderId}/payment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
          'Pragma': 'no-cache',
          'Expires': '0'
        },
        body: JSON.stringify({ payment_status: newStatus })
      })

      const data = await response.json()

      if (data.success) {
        console.log(`✅ [PAYMENT] Payment status toggled to ${newStatus}`)
        await new Promise(resolve => setTimeout(resolve, 500))
        await fetchOrders(false)
      } else {
        console.error('Error updating payment:', data.error)
        alert(`Error al actualizar el estado de pago: ${data.error}`)
      }
    } catch (error) {
      console.error('Network error:', error)
      alert('Error de conexión al actualizar el pago')
    } finally {
      setProcessingPaymentId(null)
    }
  }

  useEffect(() => {
    fetchOrders(true) // Initial load - show spinner

    // Polling automático cada 2 minutos para nuevos pedidos (menos agresivo)
    const interval = setInterval(() => {
      fetchOrders(true) // Auto-refresh puede mostrar loader
    }, 120000) // 2 minutos

    return () => clearInterval(interval)
  }, [])

  // Filtrar pedidos
  const filteredOrders = orders.filter(order => {
    const matchesSearch =
      order.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer_company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || order.status === statusFilter

    return matchesSearch && matchesStatus
  })

  // Ordenar pedidos
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const dateA = new Date(a.created_at).getTime()
    const dateB = new Date(b.created_at).getTime()
    return sortOrder === 'newest' ? dateB - dateA : dateA - dateB
  })

  // Estadísticas rápidas
  const stats = {
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    prepared: orders.filter(o => o.status === 'prepared').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    cancelled: orders.filter(o => o.status === 'cancelled').length
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
          <span className="ml-2 text-gray-600">Cargando pedidos...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <ShoppingBag className="w-7 h-7 mr-2 text-tomate" />
            Gestión de Pedidos
          </h1>
          <p className="text-gray-600 mt-1">
            Controla y gestiona todos los pedidos del sistema B2B
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <Button
            onClick={() => fetchOrders(false)}
            variant="outline"
            size="sm"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualizar
          </Button>
          {lastUpdated && (
            <p className="text-xs text-gray-500">
              Última actualización: {lastUpdated.toLocaleTimeString('es-ES')}
            </p>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
            <p className="text-xs text-gray-600">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            <p className="text-xs text-gray-600">Pendientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600">{stats.confirmed}</div>
            <p className="text-xs text-gray-600">Confirmados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.prepared}</div>
            <p className="text-xs text-gray-600">Preparados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.delivered}</div>
            <p className="text-xs text-gray-600">Entregados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.cancelled}</div>
            <p className="text-xs text-gray-600">Cancelados</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input
                  placeholder="Buscar por cliente, empresa o ID de pedido..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending">Pendientes</SelectItem>
                <SelectItem value="confirmed">Confirmados</SelectItem>
                <SelectItem value="prepared">Preparados</SelectItem>
                <SelectItem value="delivered">Entregados</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortOrder} onValueChange={(value: 'newest' | 'oldest') => setSortOrder(value)}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Más recientes</SelectItem>
                <SelectItem value="oldest">Más antiguos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders List */}
      <div className="space-y-4">
        {sortedOrders.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <ShoppingBag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay pedidos
              </h3>
              <p className="text-gray-600">
                {searchTerm || statusFilter !== 'all'
                  ? 'No se encontraron pedidos con los filtros aplicados'
                  : 'No hay pedidos registrados en el sistema'
                }
              </p>
            </CardContent>
          </Card>
        ) : (
          sortedOrders.map((order) => {
            const statusInfo = statusConfig[order.status]
            const StatusIcon = statusInfo.icon

            return (
              <Card key={order.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <CardTitle className="text-lg">
                        Pedido #{order.id.slice(0, 8).toUpperCase()}
                      </CardTitle>
                      <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                        <span>{formatDate(order.created_at)}</span>
                        <span>•</span>
                        <span>{order.total_items} {order.total_items === 1 ? 'artículo' : 'artículos'}</span>
                        <span>•</span>
                        <span className="font-semibold">{formatPrice(order.total_amount)}</span>
                        {order.has_backorder && (
                          <>
                            <span>•</span>
                            <Badge variant="outline" className="text-xs">
                              Con backorder
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <Badge className={statusInfo.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusInfo.label}
                      </Badge>
                      <Badge className={paymentStatusConfig[order.payment_status || 'pending'].color}>
                        <DollarSign className="w-3 h-3 mr-1" />
                        {paymentStatusConfig[order.payment_status || 'pending'].label}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  {/* Customer Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <p className="font-medium text-gray-900">{order.customer_name}</p>
                        <p className="text-xs text-gray-600">Cliente</p>
                      </div>
                    </div>

                    {order.customer_company && (
                      <div className="flex items-center gap-2">
                        <Building className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{order.customer_company}</p>
                          <p className="text-xs text-gray-600">Empresa</p>
                        </div>
                      </div>
                    )}

                    {order.customer_phone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">{order.customer_phone}</p>
                          <p className="text-xs text-gray-600">Teléfono</p>
                        </div>
                      </div>
                    )}

                    {order.customer_address && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900 line-clamp-1">{order.customer_address}</p>
                          <p className="text-xs text-gray-600">Dirección</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Notes */}
                  {order.notes && (
                    <div className="bg-gray-50 rounded-lg p-3 mb-4">
                      <p className="text-sm text-gray-700">
                        <strong>Notas:</strong> {order.notes}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/pedidos/${order.id}`)}
                      className="min-h-[44px] sm:min-h-[36px]"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalle
                    </Button>

                    {/* Botón de pago - alternar entre pagado/pendiente */}
                    {order.status !== 'cancelled' && (
                      <Button
                        size="sm"
                        onClick={() => togglePaymentStatus(order.id, order.payment_status || 'pending')}
                        disabled={processingPaymentId === order.id}
                        variant="outline"
                        className={`min-h-[44px] sm:min-h-[36px] disabled:opacity-50 disabled:cursor-not-allowed border-2 ${
                          (order.payment_status || 'pending') === 'paid'
                            ? 'border-green-600 text-green-700 hover:bg-green-50'
                            : 'border-red-600 text-red-700 hover:bg-red-50'
                        }`}
                      >
                        {processingPaymentId === order.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                        ) : (
                          <DollarSign className="w-4 h-4 mr-2" />
                        )}
                        <span className="hidden sm:inline">
                          {processingPaymentId === order.id
                            ? 'Procesando...'
                            : (order.payment_status || 'pending') === 'paid'
                            ? 'Marcar Pendiente'
                            : 'Marcar Pagado'}
                        </span>
                        <span className="sm:hidden">
                          {processingPaymentId === order.id
                            ? '...'
                            : (order.payment_status || 'pending') === 'paid'
                            ? 'Pendiente'
                            : 'Pagado'}
                        </span>
                      </Button>
                    )}

                    {order.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, 'confirmed')}
                        disabled={processingOrderId === order.id}
                        className="bg-orange-600 hover:bg-orange-700 min-h-[44px] sm:min-h-[36px] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingOrderId === order.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                          <CheckCircle className="w-4 h-4 mr-2" />
                        )}
                        {processingOrderId === order.id ? 'Procesando...' : 'Confirmar Pedido'}
                      </Button>
                    )}

                    {order.status === 'confirmed' && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, 'prepared')}
                        disabled={processingOrderId === order.id}
                        className="bg-blue-600 hover:bg-blue-700 min-h-[44px] sm:min-h-[36px] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingOrderId === order.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                          <Package className="w-4 h-4 mr-2" />
                        )}
                        {processingOrderId === order.id ? 'Procesando...' : 'Marcar como Preparado'}
                      </Button>
                    )}

                    {order.status === 'prepared' && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, 'delivered')}
                        disabled={processingOrderId === order.id}
                        className="bg-green-600 hover:bg-green-700 min-h-[44px] sm:min-h-[36px] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {processingOrderId === order.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                          <Truck className="w-4 h-4 mr-2" />
                        )}
                        {processingOrderId === order.id ? 'Procesando...' : 'Marcar como Entregado'}
                      </Button>
                    )}

                    {order.status === 'delivered' && (
                      <span className="text-sm text-green-600 font-medium px-3 py-1">
                        ✅ Completado
                      </span>
                    )}

                    {order.status === 'cancelled' && (
                      <span className="text-sm text-red-600 font-medium px-3 py-1">
                        ❌ Cancelado
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}