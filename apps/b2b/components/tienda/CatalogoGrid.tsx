'use client'

import { useProducts } from '@/hooks/useProducts'
import { ProductCard } from './ProductCard'
import { ProductFilters } from '@/lib/types'
import { AlertCircle, Package } from 'lucide-react'

interface CatalogoGridProps {
  filters: ProductFilters
  viewMode: 'grid' | 'list'
}

export function CatalogoGrid({ filters, viewMode }: CatalogoGridProps) {
  const { products, loading, error } = useProducts(filters)

  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-3 sm:gap-4">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="bg-gray-200 aspect-square rounded-lg mb-4"></div>
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Error al cargar productos</h3>
        <p className="text-gray-600">{error}</p>
      </div>
    )
  }

  if (!products || products.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No se encontraron productos</h3>
        <p className="text-gray-600">
          {filters.search || filters.categoria
            ? 'Intenta ajustar los filtros para ver más productos'
            : 'No hay productos disponibles en este momento'
          }
        </p>
      </div>
    )
  }

  return (
    <div className={`
      ${viewMode === 'grid' 
        ? 'grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 gap-3 sm:gap-4' 
        : 'space-y-4'
      }
    `}>
      {products.map((product) => (
        <ProductCard 
          key={product.id} 
          product={product} 
          viewMode={viewMode} 
        />
      ))}
    </div>
  )
}