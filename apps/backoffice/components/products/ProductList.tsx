// apps/backoffice/components/products/ProductList.tsx
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Edit, 
  MoreVertical, 
  Package, 
  AlertTriangle,
  TrendingUp,
  TrendingDown
} from 'lucide-react'
import { Product } from '@/lib/types'
import { cn, formatCurrency, getStockStatus } from '@/lib/utils'
import { StockAdjustmentModal } from './StockAdjustmentModal'

interface ProductListProps {
  products: Product[]
  onRefresh: () => void
}

export function ProductList({ products, onRefresh }: ProductListProps) {
  const [sortBy, setSortBy] = useState<'nombre' | 'stock_actual' | 'stock_minimo'>('nombre')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [stockModalProduct, setStockModalProduct] = useState<Product | null>(null)

  const sortedProducts = [...products].sort((a, b) => {
    const aValue = a[sortBy]
    const bValue = b[sortBy]
    
    if (typeof aValue === 'string' && typeof bValue === 'string') {
      return sortOrder === 'asc' 
        ? aValue.localeCompare(bValue)
        : bValue.localeCompare(aValue)
    }
    
    if (typeof aValue === 'number' && typeof bValue === 'number') {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
    }
    
    return 0
  })

  const getStockBadge = (product: Product) => {
    const status = getStockStatus(product.stock_actual, product.stock_minimo)
    
    switch (status) {
      case 'critical':
        return (
          <Badge className="text-xs bg-red-100 text-red-800">
            <AlertTriangle className="w-3 h-3 mr-1" />
            Sin Stock
          </Badge>
        )
      case 'low':
        return (
          <Badge className="text-xs bg-yellow-100 text-yellow-800">
            <TrendingDown className="w-3 h-3 mr-1" />
            Bajo
          </Badge>
        )
      case 'ok':
        return (
          <Badge className="text-xs bg-green-100 text-green-800">
            <TrendingUp className="w-3 h-3 mr-1" />
            Correcto
          </Badge>
        )
    }
  }

  const handleSort = (field: typeof sortBy) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(field)
      setSortOrder('asc')
    }
  }

  const toggleMenu = (productId: string) => {
    setOpenMenuId(openMenuId === productId ? null : productId)
  }

  if (products.length === 0) {
    return (
      <div className="p-8 text-center">
        <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No hay productos
        </h3>
        <p className="text-gray-600 mb-4">
          Comienza añadiendo tu primer producto al catálogo.
        </p>
        <Link href="/productos/nuevo">
          <Button className="bg-[#a21813] hover:bg-[#a21813]/90">
            Crear Primer Producto
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Desktop Table Header */}
      <div className="hidden lg:block bg-gray-50 px-6 py-3 border-b border-gray-200">
        <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-600">
          <div 
            className="col-span-3 cursor-pointer hover:text-gray-900 flex items-center gap-1"
            onClick={() => handleSort('nombre')}
          >
            Producto
            {sortBy === 'nombre' && (
              <span className="text-xs">
                {sortOrder === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </div>
          <div className="col-span-2">Referencia</div>
          <div className="col-span-1">Categoría</div>
          <div 
            className="col-span-2 cursor-pointer hover:text-gray-900 flex items-center gap-1"
            onClick={() => handleSort('stock_actual')}
          >
            Stock Actual
            {sortBy === 'stock_actual' && (
              <span className="text-xs">
                {sortOrder === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </div>
          <div 
            className="col-span-2 cursor-pointer hover:text-gray-900 flex items-center gap-1"
            onClick={() => handleSort('stock_minimo')}
          >
            Mínimo
            {sortBy === 'stock_minimo' && (
              <span className="text-xs">
                {sortOrder === 'asc' ? '↑' : '↓'}
              </span>
            )}
          </div>
          <div className="col-span-1">Estado</div>
          <div className="col-span-1"></div>
        </div>
      </div>

      {/* Mobile Sort Controls */}
      <div className="lg:hidden px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">Ordenar por:</span>
          <select 
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [field, order] = e.target.value.split('-') as [typeof sortBy, typeof sortOrder]
              setSortBy(field)
              setSortOrder(order)
            }}
            className="text-sm border-gray-300 rounded-md px-3 py-1"
          >
            <option value="nombre-asc">Producto (A-Z)</option>
            <option value="nombre-desc">Producto (Z-A)</option>
            <option value="stock_actual-asc">Stock (Menor)</option>
            <option value="stock_actual-desc">Stock (Mayor)</option>
            <option value="stock_minimo-asc">Mínimo (Menor)</option>
            <option value="stock_minimo-desc">Mínimo (Mayor)</option>
          </select>
        </div>
      </div>

      {/* Desktop Table Body */}
      <div className="hidden lg:block divide-y divide-gray-200">
        {sortedProducts.map((product) => (
          <div 
            key={product.id}
            className="px-6 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="grid grid-cols-12 gap-4 items-center">
              {/* Producto */}
              <div className="col-span-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-gray-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {product.nombre}
                    </p>
                    <p className="text-sm text-gray-600 truncate">
                      {product.proveedor || 'Sin proveedor'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Referencia */}
              <div className="col-span-2">
                <span className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                  {product.referencia || 'N/A'}
                </span>
              </div>

              {/* Categoría */}
              <div className="col-span-1">
                <span className="text-xs text-gray-600">
                  {product.categoria || 'Sin categoría'}
                </span>
              </div>

              {/* Stock Actual */}
              <div className="col-span-2">
                <div className="flex items-center gap-2">
                  <span className={cn(
                    'font-medium',
                    product.stock_actual === 0 ? 'text-red-600' :
                    product.stock_actual <= product.stock_minimo ? 'text-yellow-600' :
                    'text-gray-900'
                  )}>
                    {product.stock_actual}
                  </span>
                  <span className="text-sm text-gray-500">
                    {product.unidad}
                  </span>
                </div>
              </div>

              {/* Mínimo */}
              <div className="col-span-2">
                <span className="text-sm text-gray-600">
                  {product.stock_minimo} {product.unidad}
                </span>
              </div>

              {/* Estado */}
              <div className="col-span-1">
                {getStockBadge(product)}
              </div>

              {/* Actions */}
              <div className="col-span-1 flex justify-end relative">
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => toggleMenu(product.id)}
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
                
                {openMenuId === product.id && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    <div className="py-1">
                      <Link href={`/productos/${product.id}/editar`}>
                        <button 
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50"
                          onClick={() => setOpenMenuId(null)}
                        >
                          <Edit className="w-4 h-4" />
                          Editar
                        </button>
                      </Link>
                      <Link href={`/productos/${product.id}`}>
                        <button 
                          className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50"
                          onClick={() => setOpenMenuId(null)}
                        >
                          Ver Historial
                        </button>
                      </Link>
                      <button
                        className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-50"
                        onClick={() => {
                          setStockModalProduct(product)
                          setOpenMenuId(null)
                        }}
                      >
                        Ajustar Stock
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Mobile Card Layout */}
      <div className="lg:hidden space-y-4 p-4">
        {sortedProducts.map((product) => (
          <div 
            key={product.id}
            className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm"
          >
            {/* Header con nombre y estado */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="w-6 h-6 text-gray-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-gray-900 truncate">
                    {product.nombre}
                  </h3>
                  <p className="text-sm text-gray-600 truncate">
                    {product.proveedor || 'Sin proveedor'}
                  </p>
                </div>
              </div>
              <div className="ml-2 flex items-center gap-2">
                {getStockBadge(product)}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => toggleMenu(product.id)}
                  className="p-1 h-8 w-8"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Referencia */}
            <div className="mb-3">
              <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Referencia</span>
              <div className="mt-1">
                <span className="text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                  {product.referencia || 'N/A'}
                </span>
              </div>
            </div>

            {/* Grid de información */}
            <div className="grid grid-cols-2 gap-4 mb-3">
              {/* Stock Actual */}
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Actual</span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className={cn(
                    'text-lg font-bold',
                    product.stock_actual === 0 ? 'text-red-600' :
                    product.stock_actual <= product.stock_minimo ? 'text-yellow-600' :
                    'text-gray-900'
                  )}>
                    {product.stock_actual}
                  </span>
                  <span className="text-sm text-gray-500">
                    {product.unidad}
                  </span>
                </div>
              </div>

              {/* Mínimo */}
              <div>
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Mínimo</span>
                <div className="mt-1 flex items-baseline gap-1">
                  <span className="text-lg font-semibold text-gray-700">
                    {product.stock_minimo}
                  </span>
                  <span className="text-sm text-gray-500">
                    {product.unidad}
                  </span>
                </div>
              </div>
            </div>

            {/* Categoría */}
            {product.categoria && (
              <div className="mb-3">
                <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Categoría</span>
                <p className="mt-1 text-sm text-gray-700">{product.categoria}</p>
              </div>
            )}

            {/* Menu desplegable móvil */}
            {openMenuId === product.id && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <div className="flex flex-col space-y-1">
                  <Link href={`/productos/${product.id}/editar`}>
                    <button 
                      className="flex items-center gap-2 w-full p-3 text-sm hover:bg-gray-50 rounded text-left"
                      onClick={() => setOpenMenuId(null)}
                    >
                      <Edit className="w-4 h-4" />
                      Editar Producto
                    </button>
                  </Link>
                  <Link href={`/productos/${product.id}`}>
                    <button 
                      className="flex items-center gap-2 w-full p-3 text-sm hover:bg-gray-50 rounded text-left"
                      onClick={() => setOpenMenuId(null)}
                    >
                      Ver Historial
                    </button>
                  </Link>
                  <button
                    className="flex items-center gap-2 w-full p-3 text-sm hover:bg-gray-50 rounded text-left"
                    onClick={() => {
                      setStockModalProduct(product)
                      setOpenMenuId(null)
                    }}
                  >
                    Ajustar Stock
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 hidden lg:block">
        <p className="text-sm text-gray-600">
          Mostrando {products.length} productos
        </p>
      </div>

      {/* Mobile Footer */}
      <div className="lg:hidden px-4 py-3 bg-gray-50 border-t border-gray-200">
        <p className="text-sm text-gray-600 text-center">
          {products.length} productos encontrados
        </p>
      </div>
      
      {/* Overlay para cerrar menú al hacer clic fuera */}
      {openMenuId && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpenMenuId(null)}
        />
      )}

      {/* Modal de ajuste de stock */}
      {stockModalProduct && (
        <StockAdjustmentModal
          product={stockModalProduct}
          isOpen={!!stockModalProduct}
          onClose={() => setStockModalProduct(null)}
          onSuccess={() => {
            setStockModalProduct(null)
            onRefresh() // Refrescar la lista después del ajuste
          }}
        />
      )}
    </div>
  )
}