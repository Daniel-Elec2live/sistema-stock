'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useOrders, useOrderStats } from '@/hooks/useOrders'
import { OrderHistory } from '@/components/tienda/OrderHistory'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Package, 
  ShoppingCart, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Plus,
  Filter,
  Download
} from 'lucide-react'
import { OrderStatus } from '@/lib/types'

export default function PedidosPage() {
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all')
  const { orders, loading, error, refresh } = useOrders({
    status: statusFilter === 'all' ? undefined : statusFilter
  })
  // Pasar orders al hook de stats para evitar duplicar la llamada a la API
  const { stats, loading: statsLoading } = useOrderStats(orders, loading)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(price)
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


  if (loading && orders.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 sm:pt-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[var(--color-tomate)] mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando tus pedidos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-20 sm:pt-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Mis Pedidos</h1>
          <p className="text-gray-600">Historial completo de tus pedidos y su estado</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
          
          <Link href="/catalogo">
            <Button className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo pedido
            </Button>
          </Link>
        </div>
      </div>

      {/* Estadísticas */}
      {!statsLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <ShoppingCart className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total pedidos</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Entregados</p>
                <p className="text-2xl font-bold text-gray-900">{stats.delivered}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-[var(--color-tomate)]/10 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-[var(--color-tomate)]" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total gastado</p>
                <p className="text-2xl font-bold text-gray-900">{formatPrice(stats.totalAmount)}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filtros por estado */}
      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filtrar por estado
          </h2>
          <Button variant="outline" size="sm" onClick={refresh}>
            Actualizar
          </Button>
        </div>

        <Tabs 
          value={statusFilter} 
          onValueChange={(value) => setStatusFilter(value as OrderStatus | 'all')}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-5 gap-1">
            <TabsTrigger value="all" className="text-xs sm:text-sm">
              <span className="hidden sm:inline">Todos</span>
              <span className="sm:hidden">Todo</span>
              <span className="ml-1">({stats.total})</span>
            </TabsTrigger>
            <TabsTrigger value="pending" className="text-xs sm:text-sm">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span className="hidden lg:inline">Pendientes</span>
              <span className="lg:hidden">Pend.</span>
              <span className="ml-1">({stats.pending})</span>
            </TabsTrigger>
            <TabsTrigger value="delivered" className="text-xs sm:text-sm">
              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span className="hidden lg:inline">Entregados</span>
              <span className="lg:hidden">Entr.</span>
              <span className="ml-1">({stats.delivered})</span>
            </TabsTrigger>
            <TabsTrigger value="prepared" className="text-xs sm:text-sm hidden lg:flex">
              <Package className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span className="hidden lg:inline">Preparados</span>
              <span className="lg:hidden">Prep.</span>
              <span className="ml-1">({stats.prepared})</span>
            </TabsTrigger>
            <TabsTrigger value="cancelled" className="text-xs sm:text-sm hidden lg:flex">
              <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
              <span className="hidden lg:inline">Cancelados</span>
              <span className="lg:hidden">Canc.</span>
              <span className="ml-1">({stats.cancelled})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={statusFilter} className="mt-6">
            {stats.withBackorders > 0 && statusFilter === 'all' && (
              <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div>
                    <h3 className="font-semibold text-amber-900">
                      Tienes {stats.withBackorders} pedido{stats.withBackorders !== 1 ? 's' : ''} con artículos pendientes
                    </h3>
                    <p className="text-sm text-amber-800 mt-1">
                      Te notificaremos cuando tengamos stock de los productos pendientes.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <OrderHistory 
              orders={orders}
              loading={loading}
              error={error}
            />
          </TabsContent>
        </Tabs>
      </Card>

      {/* Estado vacío */}
      {!loading && orders.length === 0 && (
        <Card className="p-12">
          <div className="text-center">
            <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {statusFilter === 'all' 
                ? 'No tienes pedidos aún'
                : `No tienes pedidos ${getStatusLabel(statusFilter as OrderStatus).toLowerCase()}`
              }
            </h3>
            <p className="text-gray-600 mb-6">
              {statusFilter === 'all'
                ? 'Explora nuestro catálogo y realiza tu primer pedido'
                : 'Cambia el filtro para ver pedidos en otros estados'
              }
            </p>
            
            {statusFilter === 'all' && (
              <Link href="/catalogo">
                <Button className="btn-primary">
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Explorar catálogo
                </Button>
              </Link>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}