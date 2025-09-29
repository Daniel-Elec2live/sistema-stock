'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { CatalogoGrid } from '@/components/tienda/CatalogoGrid'
import { ProductFilters } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Filter, Grid, List, SortAsc, SortDesc } from 'lucide-react'

export default function CatalogoPage() {
  const searchParams = useSearchParams()
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  
  const [filters, setFilters] = useState<ProductFilters>({
    search: searchParams.get('search') || '',
    categoria: searchParams.get('categoria') || '',
    solo_con_stock: searchParams.get('stock') === 'true',
    ordenar_por: (searchParams.get('sort') as 'nombre' | 'precio_promedio' | 'stock_actual') || 'nombre',
    orden: (searchParams.get('order') as 'asc' | 'desc') || 'asc'
  })

  // Actualizar filtros cuando cambien los search params
  useEffect(() => {
    setFilters(prev => ({
      ...prev,
      search: searchParams.get('search') || '',
      categoria: searchParams.get('categoria') || ''
    }))
  }, [searchParams])

  const updateFilter = (key: keyof ProductFilters, value: string | number | boolean | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearFilters = () => {
    setFilters({
      search: '',
      categoria: '',
      solo_con_stock: false,
      ordenar_por: 'nombre',
      orden: 'asc'
    })
  }

  const toggleSort = () => {
    setFilters(prev => ({
      ...prev,
      orden: prev.orden === 'asc' ? 'desc' : 'asc'
    }))
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pt-20 sm:pt-8">
      
      {/* Header del catálogo */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">Catálogo de Productos</h1>
        <p className="text-sm sm:text-base text-gray-600">Encuentra todos nuestros productos con stock actualizado en tiempo real</p>
      </div>

      {/* Controles de vista y filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        
        {/* Filtros rápidos */}
        <div className="flex flex-wrap gap-2">
          <Button
            variant={isFilterOpen ? "default" : "outline"}
            size="sm"
            onClick={() => setIsFilterOpen(!isFilterOpen)}
            className="btn-primary"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          
          <Button
            variant={filters.solo_con_stock ? "default" : "outline"}
            size="sm"
            onClick={() => updateFilter('solo_con_stock', !filters.solo_con_stock)}
            className={filters.solo_con_stock ? "btn-secondary" : ""}
          >
            Solo con stock
          </Button>
        </div>

        {/* Controles de vista */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSort}
          >
            {filters.orden === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
          </Button>
          
          <div className="flex border rounded-lg">
            <Button
              variant={viewMode === 'grid' ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode('grid')}
              className="rounded-r-none"
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode('list')}
              className="rounded-l-none"
            >
              <List className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Panel de filtros expandible */}
      {isFilterOpen && (
        <div className="bg-gray-50 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Búsqueda */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar producto
              </label>
              <Input
                type="text"
                placeholder="Nombre del producto..."
                value={filters.search || ''}
                onChange={(e) => updateFilter('search', e.target.value)}
              />
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoría
              </label>
              <select
                value={filters.categoria || ''}
                onChange={(e) => updateFilter('categoria', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-tomate)]"
              >
                <option value="">Todas las categorías</option>
                <option value="Carnes">Carnes</option>
                <option value="Pescados">Pescados</option>
                <option value="Verduras">Verduras</option>
                <option value="Lácteos">Lácteos</option>
                <option value="Conservas">Conservas</option>
                <option value="Bebidas">Bebidas</option>
                <option value="Otros">Otros</option>
              </select>
            </div>

            {/* Ordenar por */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ordenar por
              </label>
              <select
                value={filters.ordenar_por || 'nombre'}
                onChange={(e) => updateFilter('ordenar_por', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-tomate)]"
              >
                <option value="nombre">Nombre</option>
                <option value="precio_promedio">Precio</option>
                <option value="stock_actual">Stock</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={clearFilters}>
              Limpiar filtros
            </Button>
          </div>
        </div>
      )}

      {/* Grid de productos */}
      <CatalogoGrid filters={filters} viewMode={viewMode} />
    </div>
  )
}