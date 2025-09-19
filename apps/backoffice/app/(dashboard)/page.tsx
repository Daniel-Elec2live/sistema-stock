// apps/backoffice/app/(dashboard)/page.tsx
'use client'

import { Suspense, useState, useEffect } from 'react'
import { StockCard } from '@/components/dashboard/StockCard'
import { AlertCard } from '@/components/dashboard/AlertCard'
import { KPICard } from '@/components/dashboard/KPICard'
import { Button } from '@/components/ui/button'
import { Package, AlertTriangle, TrendingUp, CheckCircle } from 'lucide-react'
import Link from 'next/link'

interface KPIData {
  value: string
  change: string
  trend: 'up' | 'down' | 'neutral'
}

interface KPIs {
  productos_activos: KPIData
  stock_bajo: KPIData
  sin_stock: KPIData
  stock_optimo: KPIData
  caducidades_proximas: KPIData
  valor_stock: KPIData
  entradas_mes: number
  raw_data: {
    total_productos: number
    stock_bajo: number
    sin_stock: number
    stock_optimo: number
    valor_stock: number
  }
}

export default function DashboardPage() {
  const [kpis, setKpis] = useState<KPIs | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        const response = await fetch('/api/dashboard/kpis')
        if (response.ok) {
          const data = await response.json()
          setKpis(data.kpis)
        }
      } catch (error) {
        console.error('Error fetching KPIs:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchKPIs()
  }, [])

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Panel de Control
          </h1>
          <p className="text-gray-600">
            Gestión de stock en tiempo real
          </p>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <KPICardSkeleton />
            <KPICardSkeleton />
            <KPICardSkeleton />
            <KPICardSkeleton />
          </>
        ) : kpis ? (
          <>
            <KPICard
              title="Productos Activos"
              value={kpis.productos_activos.value}
              change={kpis.productos_activos.change}
              trend={kpis.productos_activos.trend}
              icon={Package}
            />
            
            <KPICard
              title="Stock Óptimo"
              value={kpis.stock_optimo.value}
              change={kpis.stock_optimo.change}
              trend={kpis.stock_optimo.trend}
              icon={CheckCircle}
            />

            <KPICard
              title="Stock Bajo"
              value={kpis.stock_bajo.value}
              change={kpis.stock_bajo.change}
              trend={kpis.stock_bajo.trend}
              icon={AlertTriangle}
              variant="warning"
            />

            <KPICard
              title="Sin Stock"
              value={kpis.sin_stock.value}
              change={kpis.sin_stock.change}
              trend={kpis.sin_stock.trend}
              icon={AlertTriangle}
              variant="danger"
            />
          </>
        ) : (
          <div className="col-span-4 text-center text-gray-500">
            Error cargando datos
          </div>
        )}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Stock Crítico */}
        <div className="lg:col-span-2">
          <Suspense fallback={<StockCardSkeleton />}>
            <StockCard />
          </Suspense>
        </div>

        {/* Alertas */}
        <div>
          <Suspense fallback={<AlertCardSkeleton />}>
            <AlertCard />
          </Suspense>
        </div>
      </div>
    </div>
  )
}

// Skeletons para loading
function KPICardSkeleton() {
  return (
    <div className="bg-white rounded-lg border p-6 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-24 mb-2"></div>
      <div className="h-8 bg-gray-200 rounded w-16 mb-1"></div>
      <div className="h-3 bg-gray-200 rounded w-12"></div>
    </div>
  )
}

function StockCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border p-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gray-200 rounded"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-24"></div>
            </div>
            <div className="h-6 w-16 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AlertCardSkeleton() {
  return (
    <div className="bg-white rounded-lg border p-6 animate-pulse">
      <div className="h-6 bg-gray-200 rounded w-24 mb-4"></div>
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="p-3 bg-gray-50 rounded">
            <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
            <div className="h-3 bg-gray-200 rounded w-48"></div>
          </div>
        ))}
      </div>
    </div>
  )
}