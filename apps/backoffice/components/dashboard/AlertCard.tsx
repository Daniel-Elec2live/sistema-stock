// apps/backoffice/components/dashboard/AlertCard.tsx
'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Clock, TrendingDown } from 'lucide-react'
import Link from 'next/link'

interface Alert {
  id: string
  tipo: 'stock_bajo' | 'caducidad' | 'precio'
  titulo: string
  descripcion: string
  fecha: string
  prioridad: 'alta' | 'media' | 'baja'
}

export function AlertCard() {
  const [alertas, setAlertas] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAlertas = async () => {
      try {
        const response = await fetch('/api/dashboard/alerts')
        if (response.ok) {
          const data = await response.json()
          setAlertas(data.alerts || [])
        }
      } catch (error) {
        console.error('Error fetching alerts:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAlertas()
  }, [])
  const iconos = {
    stock_bajo: TrendingDown,
    caducidad: Clock,
    precio: AlertTriangle
  }

  const colorPrioridad = {
    alta: 'bg-red-50 border-red-200 text-red-800',
    media: 'bg-yellow-50 border-yellow-200 text-yellow-800', 
    baja: 'bg-blue-50 border-blue-200 text-blue-800'
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Alertas Recientes
        </h3>
        <Link href="/alertas">
          <Button variant="outline" size="sm">
            Ver Todas
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {loading ? (
          // Loading skeleton
          [...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse p-3 rounded-lg border bg-gray-50">
              <div className="flex items-start gap-3">
                <div className="w-4 h-4 bg-gray-200 rounded mt-0.5 flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-40 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="w-12 h-5 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))
        ) : (
          alertas.map((alerta) => {
            const Icon = iconos[alerta.tipo]
            return (
              <div 
                key={alerta.id}
                className={`p-3 rounded-lg border ${colorPrioridad[alerta.prioridad]} transition-colors hover:shadow-sm`}
              >
                <div className="flex items-start gap-3">
                  <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">
                      {alerta.titulo}
                    </p>
                    <p className="text-sm opacity-90">
                      {alerta.descripcion}
                    </p>
                    <p className="text-xs opacity-75 mt-1">
                      {new Date(alerta.fecha).toLocaleDateString('es-ES')}
                    </p>
                  </div>
                  <Badge 
                    variant="secondary" 
                    className="text-xs capitalize"
                  >
                    {alerta.prioridad}
                  </Badge>
                </div>
              </div>
            )
          })
        )}
      </div>

      {alertas.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No hay alertas pendientes</p>
        </div>
      )}
    </div>
  )
}