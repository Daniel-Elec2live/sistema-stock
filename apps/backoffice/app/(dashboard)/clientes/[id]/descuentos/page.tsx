'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  ArrowLeft,
  Plus,
  Percent,
  Package,
  Tag,
  Calendar,
  Edit,
  Trash2,
  User,
  Search
} from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

interface Customer {
  id: string
  name: string
  email: string
  company_name?: string
}

interface Discount {
  id: string
  customer_id: string
  product_id?: string
  category?: string
  discount_percentage: number
  is_active: boolean
  valid_from?: string
  valid_until?: string
  created_at: string
  products?: {
    id: string
    nombre: string
  }
}

interface Product {
  id: string
  nombre: string
  categoria: string
}

export default function CustomerDiscountsPage() {
  const params = useParams()
  const customerId = params.id as string

  const [customer, setCustomer] = useState<Customer | null>(null)
  const [discounts, setDiscounts] = useState<Discount[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)

  useEffect(() => {
    if (customerId) {
      fetchCustomer()
      fetchDiscounts()
      fetchProducts()
    }
  }, [customerId])

  const fetchCustomer = async () => {
    try {
      const response = await fetch(`/api/customers?status=all`)
      const data = await response.json()
      if (data.success) {
        const foundCustomer = data.customers.find((c: Customer) => c.id === customerId)
        setCustomer(foundCustomer)
      }
    } catch (error) {
      console.error('Error fetching customer:', error)
    }
  }

  const fetchDiscounts = async () => {
    try {
      const response = await fetch(`/api/customers/${customerId}/discounts`)
      const data = await response.json()
      if (data.success) {
        setDiscounts(data.discounts)
      }
    } catch (error) {
      console.error('Error fetching discounts:', error)
    }
  }

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      const data = await response.json()
      if (data.success) {
        setProducts(data.products)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const createDiscount = async (discountData: any) => {
    try {
      const response = await fetch(`/api/customers/${customerId}/discounts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(discountData),
      })

      if (response.ok) {
        fetchDiscounts()
        setShowCreateForm(false)
      }
    } catch (error) {
      console.error('Error creating discount:', error)
    }
  }

  const deleteDiscount = async (discountId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este descuento?')) {
      return
    }

    try {
      const response = await fetch(`/api/discounts/${discountId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchDiscounts()
      }
    } catch (error) {
      console.error('Error deleting discount:', error)
    }
  }

  const toggleDiscountStatus = async (discountId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/discounts/${discountId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_active: !isActive }),
      })

      if (response.ok) {
        fetchDiscounts()
      }
    } catch (error) {
      console.error('Error updating discount:', error)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/clientes">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Percent className="h-5 w-5 sm:h-6 sm:w-6" />
              <span className="hidden sm:inline">Descuentos de Cliente</span>
              <span className="sm:hidden">Descuentos</span>
            </h1>
            {customer && (
              <div className="flex items-center gap-2 text-gray-600 mt-1 text-sm">
                <User className="h-4 w-4" />
                <span>{customer.name}</span>
                {customer.company_name && (
                  <span className="text-gray-400 hidden sm:inline">• {customer.company_name}</span>
                )}
              </div>
            )}
          </div>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="w-full sm:w-auto">
          <Plus className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Nuevo Descuento</span>
          <span className="sm:hidden">Nuevo</span>
        </Button>
      </div>

      {/* Create Form */}
      {showCreateForm && (
        <Card className="p-4 sm:p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4">Crear Nuevo Descuento</h2>
          <CreateDiscountForm
            products={products}
            onSubmit={createDiscount}
            onCancel={() => setShowCreateForm(false)}
          />
        </Card>
      )}

      {/* Discounts List */}
      {discounts.length === 0 ? (
        <Card className="p-8">
          <div className="text-center text-gray-500">
            <Percent className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">No hay descuentos</h3>
            <p>Este cliente no tiene descuentos configurados.</p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {discounts.map((discount) => (
            <DiscountCard
              key={discount.id}
              discount={discount}
              onDelete={deleteDiscount}
              onToggleStatus={toggleDiscountStatus}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function CreateDiscountForm({
  products,
  onSubmit,
  onCancel
}: {
  products: Product[]
  onSubmit: (data: any) => void
  onCancel: () => void
}) {
  const [formData, setFormData] = useState({
    discount_type: 'general', // 'general', 'product', 'category'
    product_id: '',
    category: '',
    discount_percentage: '',
    valid_from: '',
    valid_until: '',
    is_active: true
  })

  const [productSearch, setProductSearch] = useState('')
  const [showProductDropdown, setShowProductDropdown] = useState(false)
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [selectedProductName, setSelectedProductName] = useState('')

  // Filtrar productos por búsqueda
  useEffect(() => {
    if (productSearch) {
      const filtered = products.filter(product =>
        product.nombre.toLowerCase().includes(productSearch.toLowerCase())
      )
      setFilteredProducts(filtered.slice(0, 10)) // Limitar a 10 resultados
    } else {
      setFilteredProducts([])
    }
  }, [productSearch, products])

  const categories = Array.from(new Set(products.map(p => p.categoria).filter(Boolean)))

  const handleProductSelect = (product: Product) => {
    setFormData({ ...formData, product_id: product.id })
    setSelectedProductName(product.nombre)
    setProductSearch(product.nombre)
    setShowProductDropdown(false)
  }

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.product-search-container')) {
        setShowProductDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const discountData: any = {
      discount_percentage: parseFloat(formData.discount_percentage),
      is_active: formData.is_active
    }

    if (formData.discount_type === 'product') {
      discountData.product_id = formData.product_id
    } else if (formData.discount_type === 'category') {
      discountData.category = formData.category
    }

    if (formData.valid_from) {
      discountData.valid_from = formData.valid_from
    }
    if (formData.valid_until) {
      discountData.valid_until = formData.valid_until
    }

    onSubmit(discountData)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Descuento
          </label>
          <select
            value={formData.discount_type}
            onChange={(e) => setFormData({ ...formData, discount_type: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="general">General (todos los productos)</option>
            <option value="product">Producto específico</option>
            <option value="category">Categoría</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Porcentaje de Descuento (%)
          </label>
          <Input
            type="number"
            min="0"
            max="100"
            step="0.01"
            value={formData.discount_percentage}
            onChange={(e) => setFormData({ ...formData, discount_percentage: e.target.value })}
            placeholder="ej. 10.5"
            required
          />
        </div>

        {formData.discount_type === 'product' && (
          <div className="relative product-search-container">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Producto
            </label>
            <div className="relative">
              <Input
                type="text"
                value={productSearch}
                onChange={(e) => {
                  setProductSearch(e.target.value)
                  setShowProductDropdown(true)
                  if (!e.target.value) {
                    setFormData({ ...formData, product_id: '' })
                    setSelectedProductName('')
                  }
                }}
                onFocus={() => setShowProductDropdown(true)}
                placeholder="Buscar producto..."
                className="pr-8"
                required
              />
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>

            {showProductDropdown && filteredProducts.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleProductSelect(product)}
                    className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                  >
                    <div className="font-medium">{product.nombre}</div>
                    <div className="text-gray-500 text-xs">{product.categoria}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {formData.discount_type === 'category' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoría
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Seleccionar categoría</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Válido desde (opcional)
          </label>
          <Input
            type="date"
            value={formData.valid_from}
            onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Válido hasta (opcional)
          </label>
          <Input
            type="date"
            value={formData.valid_until}
            onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="is_active"
          checked={formData.is_active}
          onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
          className="rounded"
        />
        <label htmlFor="is_active" className="text-sm text-gray-700">
          Descuento activo
        </label>
      </div>

      <div className="flex gap-2 pt-4">
        <Button type="submit">
          Crear Descuento
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
      </div>
    </form>
  )
}

function DiscountCard({
  discount,
  onDelete,
  onToggleStatus
}: {
  discount: Discount
  onDelete: (id: string) => void
  onToggleStatus: (id: string, isActive: boolean) => void
}) {
  const getDiscountType = () => {
    if (discount.product_id) return 'Producto específico'
    if (discount.category) return 'Categoría'
    return 'General'
  }

  const getDiscountTarget = () => {
    if (discount.products) return discount.products.nombre
    if (discount.category) return discount.category
    return 'Todos los productos'
  }

  return (
    <Card className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
            <div className="flex items-center gap-2">
              {discount.product_id ? (
                <Package className="h-5 w-5 text-blue-500" />
              ) : discount.category ? (
                <Tag className="h-5 w-5 text-purple-500" />
              ) : (
                <Percent className="h-5 w-5 text-green-500" />
              )}
              <h3 className="text-lg font-semibold">
                {discount.discount_percentage}% de descuento
              </h3>
            </div>
            <Badge
              variant={discount.is_active ? "default" : "secondary"}
              className={discount.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}
            >
              {discount.is_active ? 'Activo' : 'Inactivo'}
            </Badge>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <span className="font-medium">Tipo:</span> {getDiscountType()}
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm text-gray-600">
              <span className="font-medium">Aplica a:</span>
              <span className="break-words">{getDiscountTarget()}</span>
            </div>

            {(discount.valid_from || discount.valid_until) && (
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className="font-medium sm:hidden">Vigencia:</span>
                </div>
                <span className="text-xs sm:text-sm">
                  {discount.valid_from && `Desde: ${new Date(discount.valid_from).toLocaleDateString('es-ES')}`}
                  {discount.valid_from && discount.valid_until && (
                    <span className="hidden sm:inline"> • </span>
                  )}
                  {discount.valid_until && (
                    <span className="block sm:inline">
                      {discount.valid_from && <br className="sm:hidden" />}
                      Hasta: {new Date(discount.valid_until).toLocaleDateString('es-ES')}
                    </span>
                  )}
                </span>
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500">
            Creado: {new Date(discount.created_at).toLocaleDateString('es-ES')}
          </p>
        </div>

        <div className="flex flex-row sm:flex-col gap-2 sm:ml-4">
          <Button
            size="sm"
            variant="outline"
            onClick={() => onToggleStatus(discount.id, discount.is_active)}
            className={`flex-1 sm:flex-none ${discount.is_active ? "text-gray-600" : "text-green-600"}`}
          >
            <span className="hidden sm:inline">
              {discount.is_active ? 'Desactivar' : 'Activar'}
            </span>
            <span className="sm:hidden">
              {discount.is_active ? 'Desact.' : 'Activ.'}
            </span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => onDelete(discount.id)}
            className="flex-1 sm:flex-none text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            <span className="ml-1 sm:hidden">Borrar</span>
          </Button>
        </div>
      </div>
    </Card>
  )
}