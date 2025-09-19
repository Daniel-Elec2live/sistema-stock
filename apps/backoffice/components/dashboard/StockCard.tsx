// apps/backoffice/components/dashboard/StockCard.tsx
'use client'

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Package } from 'lucide-react'
import Link from 'next/link'

interface StockItem {
  id: string
  nombre: string
  proveedor: string
  stock_actual: number
  stock_minimo: number
  unidad: string
  proximaCaducidad?: string
}

export function StockCard() {
  const [stockCritico, setStockCritico] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStockCritico = async () => {
      try {
        const response = await fetch('/api/products?limit=10&stock_status=critical')
        if (response.ok) {
          const data = await response.json()
          const criticos = data.products?.filter((p: StockItem) => 
            p.stock_actual <= p.stock_minimo
          ) || []
          setStockCritico(criticos.slice(0, 5)) // Mostrar solo los 5 más críticos
        }
      } catch (error) {
        console.error('Error fetching stock crítico:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStockCritico()
  }, [])
  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Stock Crítico
        </h3>
        <Link href="/productos">
          <Button variant="outline" size="sm">
            Ver Todo
          </Button>
        </Link>
      </div>

      <div className="space-y-3">
        {loading ? (
          // Loading skeleton
          [...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse flex items-center gap-3 p-3">
              <div className="w-8 h-8 bg-gray-200 rounded"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-48"></div>
              </div>
              <div className="w-16 h-6 bg-gray-200 rounded"></div>
            </div>
          ))
        ) : stockCritico.length > 0 ? (
          stockCritico.map((item) => (
            <div 
              key={item.id}
              className="flex items-center gap-3 p-3 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <div className="p-2 rounded bg-gray-100">
                <Package className="w-4 h-4 text-gray-600" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-900 truncate">
                    {item.nombre}
                  </p>
                  {item.stock_actual === 0 && (
                    <Badge variant="destructive" className="text-xs">
                      Sin Stock
                    </Badge>
                  )}
                  {item.proximaCaducidad && (
                    <Badge variant="secondary" className="text-xs">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      Caduca Pronto
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-gray-600">
                  {item.proveedor || 'Sin proveedor'} • {item.stock_actual} {item.unidad}
                </p>
              </div>
              
              <div className="text-right">
                <p className="text-sm font-medium text-tomate">
                  Mín: {item.stock_minimo}
                </p>
                <Link href={`/productos/${item.id}/editar`}>
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs">
                    Editar
                  </Button>
                </Link>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-gray-500">
            <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No hay productos con stock crítico</p>
          </div>
        )}
      </div>

      {stockCritico.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Package className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>Todo el stock está en niveles óptimos</p>
        </div>
      )}
    </div>
  )
}