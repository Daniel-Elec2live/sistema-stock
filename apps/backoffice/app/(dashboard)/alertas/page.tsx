// apps/backoffice/app/(dashboard)/alertas/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { 
  AlertTriangle, 
  Clock, 
  TrendingDown, 
  Search,
  Filter,
  CheckCircle,
  X
} from 'lucide-react'
import { Alert } from '@/lib/types'
import { formatDate } from '@/lib/utils'

export default function AlertasPage() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'todas' | 'stock_bajo' | 'caducidad' | 'precio'>('todas')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchAlerts()
  }, [])

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts?limit=50')
      const data = await response.json()
      
      if (response.ok) {
        setAlerts(data.alertas || [])
      }
    } catch (error) {
      console.error('Error fetching alerts:', error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (alertId: string) => {
    try {
      await fetch(`/api/alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leida: true })
      })
      
      setAlerts(alerts.map(alert => 
        alert.id === alertId ? { ...alert, leida: true } : alert
      ))
    } catch (error) {
      console.error('Error marking alert as read:', error)
    }
  }

  const dismissAlert = async (alertId: string) => {
    try {
      await fetch(`/api/alerts/${alertId}`, {
        method: 'DELETE'
      })
      
      setAlerts(alerts.filter(alert => alert.id !== alertId))
    } catch (error) {
      console.error('Error dismissing alert:', error)
    }
  }

  const filteredAlerts = alerts.filter(alert => {
    const matchesFilter = filter === 'todas' || alert.tipo === filter
    const matchesSearch = searchQuery === '' || 
      alert.titulo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.descripcion.toLowerCase().includes(searchQuery.toLowerCase())
    
    return matchesFilter && matchesSearch
  })

  const alertsByPriority = {
    alta: filteredAlerts.filter(a => a.prioridad === 'alta'),
    media: filteredAlerts.filter(a => a.prioridad === 'media'),
    baja: filteredAlerts.filter(a => a.prioridad === 'baja')
  }

  const getAlertIcon = (tipo: Alert['tipo']) => {
    switch (tipo) {
      case 'stock_bajo':
        return TrendingDown
      case 'caducidad':
        return Clock
      case 'precio':
        return AlertTriangle
      default:
        return AlertTriangle
    }
  }

  const getAlertColor = (prioridad: Alert['prioridad']) => {
    switch (prioridad) {
      case 'alta':
        return 'border-red-200 bg-red-50'
      case 'media':
        return 'border-yellow-200 bg-yellow-50'
      case 'baja':
        return 'border-blue-200 bg-blue-50'
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-32 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Centro de Alertas
          </h1>
          <p className="text-gray-600">
            Monitoreo de stock, caducidades y variaciones de precio
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={fetchAlerts}
            size="sm"
          >
            Actualizar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Alta Prioridad</p>
              <p className="text-xl font-semibold text-gray-900">
                {alertsByPriority.alta.length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Media Prioridad</p>
              <p className="text-xl font-semibold text-gray-900">
                {alertsByPriority.media.length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <TrendingDown className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Baja Prioridad</p>
              <p className="text-xl font-semibold text-gray-900">
                {alertsByPriority.baja.length}
              </p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-xl font-semibold text-gray-900">
                {filteredAlerts.length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar alertas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
            >
              <option value="todas">Todas las alertas</option>
              <option value="stock_bajo">Stock bajo</option>
              <option value="caducidad">Caducidades</option>
              <option value="precio">Variaciones precio</option>
            </select>
            
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Más filtros
            </Button>
          </div>
        </div>
      </Card>

      {/* Alerts List */}
      <div className="space-y-4">
        {['alta', 'media', 'baja'].map(prioridad => {
          const priorityAlerts = alertsByPriority[prioridad as keyof typeof alertsByPriority]
          
          if (priorityAlerts.length === 0) return null
          
          return (
            <div key={prioridad}>
              <h3 className="text-lg font-medium text-gray-900 mb-3 capitalize">
                Prioridad {prioridad} ({priorityAlerts.length})
              </h3>
              
              <div className="space-y-3">
                {priorityAlerts.map((alert) => {
                  const Icon = getAlertIcon(alert.tipo)
                  
                  return (
                    <Card 
                      key={alert.id}
                      className={`p-4 border-2 ${getAlertColor(alert.prioridad)} ${
                        alert.leida ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-white rounded-lg border">
                          <Icon className="w-4 h-4" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-gray-900">
                              {alert.titulo}
                            </h4>
                            <Badge 
                              variant="secondary"
                              className="text-xs capitalize"
                            >
                              {alert.tipo.replace('_', ' ')}
                            </Badge>
                            {!alert.leida && (
                              <Badge variant="destructive" className="text-xs">
                                Nueva
                              </Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-gray-700 mb-2">
                            {alert.descripcion}
                          </p>
                          
                          <p className="text-xs text-gray-500">
                            {formatDate(alert.fecha)}
                          </p>
                        </div>
                        
                        <div className="flex gap-1">
                          {!alert.leida && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => markAsRead(alert.id)}
                              className="h-8 w-8 p-0"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </Button>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => dismissAlert(alert.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </div>
          )
        })}
        
        {filteredAlerts.length === 0 && (
          <Card className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay alertas
            </h3>
            <p className="text-gray-600">
              {filter === 'todas' 
                ? 'Todo está bajo control. No hay alertas pendientes.'
                : `No hay alertas de tipo "${filter}".`
              }
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}