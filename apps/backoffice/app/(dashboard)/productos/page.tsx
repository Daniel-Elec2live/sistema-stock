// apps/backoffice/app/(dashboard)/productos/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { ProductList } from '@/components/products/ProductList'
import { 
  Search, 
  Plus, 
  Filter,
  Package,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import Link from 'next/link'
import { Product } from '@/lib/types'

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('')

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const params = new URLSearchParams()
        if (searchQuery) params.append('search', searchQuery)
        if (selectedCategory) params.append('categoria', selectedCategory)
        
        const response = await fetch(`/api/products?${params}`)
        const data = await response.json()
        
        if (response.ok) {
          setProducts(data.products || [])
        }
      } catch (error) {
        console.error('Error fetching products:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchProducts()
  }, [searchQuery, selectedCategory])

  // Función separada para refresh manual (usada por ProductList)
  const handleRefresh = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (selectedCategory) params.append('categoria', selectedCategory)
      
      const response = await fetch(`/api/products?${params}`)
      const data = await response.json()
      
      if (response.ok) {
        setProducts(data.products || [])
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const categories = ['Verduras', 'Lácteos', 'Carnes', 'Aceites', 'Condimentos']
  
  // Mock stats - en producción vendrían de la API
  const stats = {
    total: products.length,
    stockBajo: products.filter(p => p.stock_actual <= p.stock_minimo).length,
    sinStock: products.filter(p => p.stock_actual === 0).length,
    optimo: products.filter(p => p.stock_actual > p.stock_minimo).length
  }


  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Productos
          </h1>
          <p className="text-gray-600">
            Gestión de catálogo y control de stock
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/productos/nuevo">
            <Button className="w-full sm:w-auto bg-[#a21813] hover:bg-[#a21813]/90 h-11 lg:h-10">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Producto
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total</p>
              <p className="text-xl font-semibold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Stock Óptimo</p>
              <p className="text-xl font-semibold text-gray-900">{stats.optimo}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Stock Bajo</p>
              <p className="text-xl font-semibold text-gray-900">{stats.stockBajo}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Sin Stock</p>
              <p className="text-xl font-semibold text-gray-900">{stats.sinStock}</p>
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
                placeholder="Buscar por nombre o proveedor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm"
            >
              <option value="">Todas las categorías</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filtros
            </Button>
          </div>
        </div>
      </Card>

      {/* Products List */}
      <Card>
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-[#a21813] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando productos...</p>
          </div>
        ) : (
          <ProductList products={products} onRefresh={handleRefresh} />
        )}
      </Card>
    </div>
  )
}