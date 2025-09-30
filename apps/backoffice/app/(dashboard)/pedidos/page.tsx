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
  RefreshCw
} from 'lucide-react'

interface Order {
  id: string
  customer_name: string
  customer_company?: string
  customer_phone?: string
  customer_address?: string
  status: 'pending' | 'confirmed' | 'prepared' | 'delivered' | 'cancelled'
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

export default function PedidosPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest')
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

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

  const fetchOrders = async () => {
    setLoading(true)
    try {
      // CRÍTICO: cache: 'no-store' deshabilita el Router Cache de Next.js (lado cliente)
      const response = await fetch(`/api/orders?_t=${Date.now()}`, {
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
        console.log('📋 Frontend - Orders received:', data.data.length)
        console.log('📊 Frontend - All order statuses:',
          data.data.map((o: any) => ({
            id: o.id.slice(0, 8),
            status: o.status,
            customer: o.customer_name?.slice(0, 15) || 'N/A'
          }))
        )
        console.log('🔍 Frontend - Status distribution:', {
          pending: data.data.filter((o: any) => o.status === 'pending').length,
          confirmed: data.data.filter((o: any) => o.status === 'confirmed').length,
          prepared: data.data.filter((o: any) => o.status === 'prepared').length,
          delivered: data.data.filter((o: any) => o.status === 'delivered').length,
          cancelled: data.data.filter((o: any) => o.status === 'cancelled').length,
        })
        setOrders(data.data)
        setLastUpdated(new Date())
      } else {
        console.error('Error fetching orders:', data.error)
      }
    } catch (error) {
      console.error('Error fetching orders:', error)
    } finally {
      setLoading(false)
    }
  }

  const updateOrderStatus = async (orderId: string, newStatus: 'confirmed' | 'prepared' | 'delivered') => {
    const timestamp = Date.now()
    const url = `/api/orders/${orderId}/status?_patch=${timestamp}&_r=${Math.random()}`

    console.log(`🔄 Frontend - Updating order ${orderId.slice(0, 8)} to status: ${newStatus}`)
    console.log(`🔄 Frontend - PATCH URL: ${url}`)
    console.log(`🔄 Frontend - Timestamp: ${timestamp}`)

    try {
      const response = await fetch(url, {
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

      console.log(`📥 Frontend - Raw response status: ${response.status}`)
      console.log(`📥 Frontend - Raw response ok: ${response.ok}`)

      const data = await response.json()
      console.log(`📥 Frontend - API Response for ${orderId.slice(0, 8)}:`, data)

      if (data.success) {
        console.log(`✅ Frontend - Successfully updated order ${orderId.slice(0, 8)} to ${newStatus}`)

        // Actualizar el estado local inmediatamente para UX
        setOrders(prev => prev.map(order =>
          order.id === orderId
            ? { ...order, status: newStatus, updated_at: new Date().toISOString() }
            : order
        ))

        console.log(`✅ Frontend - Order ${orderId.slice(0, 8)} updated locally to ${newStatus}`)

        // REFRESCAR DATOS desde el servidor - La verificación en el endpoint PATCH
        // confirma que el update se persiste inmediatamente, no hay lag de replicación
        console.log('🔄 List view - Fetching fresh data from server')
        fetchOrders()

      } else {
        console.error(`❌ Frontend - Error updating order ${orderId.slice(0, 8)}:`, data.error)
        alert(`Error al actualizar el estado del pedido: ${data.error}`)
      }
    } catch (error) {
      console.error(`❌ Frontend - Network error updating order ${orderId.slice(0, 8)}:`, error)
      alert('Error de conexión al actualizar el estado del pedido')
    }
  }

  useEffect(() => {
    fetchOrders()

    // Polling automático cada 2 minutos para nuevos pedidos (menos agresivo)
    const interval = setInterval(() => {
      console.log('🔄 Auto-refresh: Checking for new orders...')
      fetchOrders()
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
            onClick={fetchOrders}
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


                    {order.status === 'pending' && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, 'confirmed')}
                        className="bg-orange-600 hover:bg-orange-700 min-h-[44px] sm:min-h-[36px]"
                      >
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirmar Pedido
                      </Button>
                    )}

                    {order.status === 'confirmed' && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, 'prepared')}
                        className="bg-blue-600 hover:bg-blue-700 min-h-[44px] sm:min-h-[36px]"
                      >
                        <Package className="w-4 h-4 mr-2" />
                        Marcar como Preparado
                      </Button>
                    )}

                    {order.status === 'prepared' && (
                      <Button
                        size="sm"
                        onClick={() => updateOrderStatus(order.id, 'delivered')}
                        className="bg-green-600 hover:bg-green-700 min-h-[44px] sm:min-h-[36px]"
                      >
                        <Truck className="w-4 h-4 mr-2" />
                        Marcar como Entregado
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