// apps/backoffice/app/(dashboard)/productos/[id]/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Package, TrendingUp, TrendingDown, Plus, Minus, RotateCcw, Edit } from 'lucide-react'
import Link from 'next/link'

interface HistorialEntry {
  id: string
  tipo: 'entrada' | 'salida' | 'ajuste' | 'merma'
  cantidad: number
  fecha: string
  motivo?: string
  referencia?: string
  usuario?: string
  precio_unitario?: number
  lote?: string
}

interface Product {
  id: string
  nombre: string
  unidad: string
  stock_actual: number
  proveedor: string
}

interface ProductHistoryPageProps {
  params: { id: string }
}

export default function ProductHistoryPage({ params }: ProductHistoryPageProps) {
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [historial, setHistorial] = useState<HistorialEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [filterTipo, setFilterTipo] = useState<string>('')

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Obtener datos del producto
        const productResponse = await fetch(`/api/products/${params.id}`)
        if (!productResponse.ok) {
          router.push('/productos')
          return
        }
        const productData = await productResponse.json()
        setProduct(productData.product)

        // Obtener historial del producto
        const historialResponse = await fetch(`/api/products/${params.id}/historial`)
        if (historialResponse.ok) {
          const historialData = await historialResponse.json()
          setHistorial(historialData.historial || [])
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [params.id, router])

  const filteredHistorial = filterTipo 
    ? historial.filter(entry => entry.tipo === filterTipo)
    : historial

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'entrada':
        return <Plus className="w-4 h-4 text-green-600" />
      case 'salida':
        return <Minus className="w-4 h-4 text-red-600" />
      case 'ajuste':
        return <RotateCcw className="w-4 h-4 text-blue-600" />
      case 'merma':
        return <TrendingDown className="w-4 h-4 text-orange-600" />
      default:
        return <Package className="w-4 h-4 text-gray-600" />
    }
  }

  const getTipoBadge = (tipo: string) => {
    const styles = {
      entrada: 'bg-green-100 text-green-800',
      salida: 'bg-red-100 text-red-800',
      ajuste: 'bg-blue-100 text-blue-800',
      merma: 'bg-orange-100 text-orange-800'
    }
    
    return (
      <Badge className={`text-xs ${styles[tipo as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
        {tipo.charAt(0).toUpperCase() + tipo.slice(1)}
      </Badge>
    )
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <p className="text-gray-600">Producto no encontrado</p>
        <Link href="/productos">
          <Button className="mt-4">Volver a Productos</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/productos">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Historial de Movimientos
            </h1>
            <p className="text-gray-600">
              {product.nombre} • Stock actual: {product.stock_actual} {product.unidad}
            </p>
          </div>
        </div>
        
        <Link href={`/productos/${product.id}/editar`}>
          <Button className="bg-[#a21813] hover:bg-[#a21813]/90">
            <Edit className="w-4 h-4 mr-2" />
            Editar Producto
          </Button>
        </Link>
      </div>

      {/* Product Info Card */}
      <Card className="p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gray-100 rounded-lg">
            <Package className="w-6 h-6 text-gray-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{product.nombre}</h2>
            <p className="text-sm text-gray-600">
              Proveedor: {product.proveedor || 'No definido'}
            </p>
            <div className="flex items-center gap-4 mt-2">
              <span className="text-2xl font-bold text-gray-900">
                {product.stock_actual} <span className="text-base font-normal text-gray-600">{product.unidad}</span>
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterTipo('')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterTipo === '' 
                ? 'bg-[#a21813] text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos ({historial.length})
          </button>
          <button
            onClick={() => setFilterTipo('entrada')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterTipo === 'entrada' 
                ? 'bg-[#a21813] text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Entradas ({historial.filter(h => h.tipo === 'entrada').length})
          </button>
          <button
            onClick={() => setFilterTipo('salida')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterTipo === 'salida' 
                ? 'bg-[#a21813] text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Salidas ({historial.filter(h => h.tipo === 'salida').length})
          </button>
          <button
            onClick={() => setFilterTipo('ajuste')}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              filterTipo === 'ajuste' 
                ? 'bg-[#a21813] text-white' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Ajustes ({historial.filter(h => h.tipo === 'ajuste').length})
          </button>
        </div>
      </Card>

      {/* Historial */}
      <Card>
        {filteredHistorial.length === 0 ? (
          <div className="p-8 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay movimientos
            </h3>
            <p className="text-gray-600">
              {filterTipo ? `No hay movimientos de tipo "${filterTipo}"` : 'Aún no se han registrado movimientos para este producto'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredHistorial.map((entry) => (
              <div key={entry.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      {getTipoIcon(entry.tipo)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        {getTipoBadge(entry.tipo)}
                        <span className="text-sm text-gray-600">
                          {new Date(entry.fecha).toLocaleDateString('es-ES', {
                            year: 'numeric',
                            month: 'short', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                      <p className="font-medium text-gray-900 mt-1">
                        {entry.tipo === 'entrada' ? '+' : entry.tipo === 'salida' ? '-' : '±'}
                        {Math.abs(entry.cantidad)} {product.unidad}
                      </p>
                      {entry.motivo && (
                        <p className="text-sm text-gray-600 mt-1">
                          {entry.motivo}
                        </p>
                      )}
                      {entry.referencia && (
                        <p className="text-xs text-gray-500 mt-1">
                          Ref: {entry.referencia}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {entry.precio_unitario && (
                      <p className="text-sm font-medium text-gray-900">
                        €{entry.precio_unitario.toFixed(2)}/{product.unidad}
                      </p>
                    )}
                    {entry.usuario && (
                      <p className="text-xs text-gray-500">
                        {entry.usuario}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}