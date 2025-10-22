// apps/backoffice/app/(dashboard)/ajustes/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Minus, 
  Plus, 
  AlertTriangle, 
  RefreshCw,
  Search,
  Package
} from 'lucide-react'
import { Product, StockAdjustment } from '@/lib/types'
import { formatDate } from '@/lib/utils'
import { z } from 'zod'

// Schema actualizado para coincidir con el modal
const adjustmentSchema = z.object({
  tipo: z.enum(['merma', 'correccion', 'devolucion', 'inventario']),
  cantidad: z.number().min(0.01, 'Cantidad debe ser mayor a 0'),
  motivo: z.string().min(1, 'Motivo es requerido').max(200, 'Motivo muy largo'),
  observaciones: z.string().max(500, 'Observaciones muy largas').optional()
})

type AdjustmentFormData = z.infer<typeof adjustmentSchema>

export default function AjustesPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([])
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const { 
    register, 
    handleSubmit, 
    formState: { errors }, 
    reset,
    watch
  } = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      tipo: 'correccion',
      cantidad: 0,
      motivo: '',
      observaciones: ''
    }
  })

  const tipoAjuste = watch('tipo')
  const cantidad = watch('cantidad')

  // Motivos comunes por tipo (igual que en StockAdjustmentModal)
  const motivosComunes = {
    merma: [
      'Producto dañado',
      'Fecha de caducidad vencida',
      'Deterioro en almacén',
      'Rotura durante manipulación'
    ],
    correccion: [
      'Corrección de inventario',
      'Error en registro anterior',
      'Ajuste por diferencias',
      'Corrección manual'
    ],
    inventario: [
      'Recuento físico',
      'Inventario anual',
      'Auditoria de stock',
      'Verificación de existencias'
    ],
    devolucion: [
      'Devolución de cliente',
      'Producto recuperado',
      'Corrección de salida errónea',
      'Reingreso de mercancía'
    ]
  }

  // Calcular nuevo stock basado en tipo y cantidad (igual que en StockAdjustmentModal)
  const calculateNewStock = () => {
    if (!selectedProduct || !cantidad || cantidad <= 0) return selectedProduct?.stock_actual || 0

    switch (tipoAjuste) {
      case 'correccion':
      case 'inventario':
        // Para corrección/inventario, la cantidad es el stock objetivo final
        return cantidad
      case 'merma':
        return Math.max(0, selectedProduct.stock_actual - cantidad) // Restar
      case 'devolucion':
        return selectedProduct.stock_actual + cantidad // Sumar
      default:
        return selectedProduct.stock_actual
    }
  }

  const calculatedStock = calculateNewStock()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [productsRes, adjustmentsRes] = await Promise.all([
        fetch(`/api/products?limit=100&_t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        }),
        fetch(`/api/stock/adjustments?limit=10&_t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        })
      ])

      if (productsRes.ok) {
        const productsData = await productsRes.json()
        setProducts(productsData.products || [])
      }

      if (adjustmentsRes.ok) {
        const adjustmentsData = await adjustmentsRes.json()
        console.log('[AJUSTES DEBUG] Ajustes recibidos:', adjustmentsData.adjustments?.length || 0)
        console.log('[AJUSTES DEBUG] Primeros 3 ajustes:', adjustmentsData.adjustments?.slice(0, 3))
        console.log('[AJUSTES DEBUG] Productos disponibles:', products.length)
        setAdjustments(adjustmentsData.adjustments || [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filteredProducts = products.filter(product =>
    product.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const onSubmit = async (data: AdjustmentFormData) => {
    console.log('Form data received:', data)
    console.log('Selected product:', selectedProduct)
    
    if (!selectedProduct) {
      console.error('No product selected')
      return
    }
    
    setSubmitting(true)
    try {
      // Para corrección/inventario, calcular la diferencia (igual que en StockAdjustmentModal)
      let adjustedCantidad = data.cantidad
      if (data.tipo === 'correccion' || data.tipo === 'inventario') {
        // Si queremos stock final de X, enviamos la diferencia (X - stock_actual)
        adjustedCantidad = data.cantidad - selectedProduct.stock_actual
      }

      const payload = {
        ...data,
        cantidad: adjustedCantidad,
        product_id: selectedProduct.id
      }
      
      console.log('Sending payload:', payload)
      
      const response = await fetch('/api/stock/adjustment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      
      console.log('Response status:', response.status)
      
      if (response.ok) {
        const result = await response.json()
        console.log('Success result:', result)
        // Actualizar listas
        await fetchData()
        // Reset form
        reset()
        setSelectedProduct(null)
        // TODO: Mostrar toast de éxito
      } else {
        const error = await response.json()
        console.error('Error creating adjustment:', error)
        // TODO: Mostrar toast de error
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const getAjusteTipoBadge = (tipo: StockAdjustment['tipo']) => {
    switch (tipo) {
      case 'merma':
        return <Badge variant="destructive" className="text-xs">Merma</Badge>
      case 'correccion':
        return <Badge variant="secondary" className="text-xs">Corrección</Badge>
      case 'inventario':
        return <Badge className="text-xs bg-purple-100 text-purple-800">Inventario</Badge>
      case 'devolucion':
        return <Badge className="text-xs bg-green-100 text-green-800">Devolución</Badge>
      default:
        return <Badge variant="secondary" className="text-xs">{tipo}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
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
            Ajustes de Stock
          </h1>
          <p className="text-gray-600">
            Gestión de mermas, ajustes y devoluciones
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={fetchData}
          size="sm"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulario de ajuste */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Nuevo Ajuste
          </h3>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Selección de producto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Producto *
              </label>
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar producto..."
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                {selectedProduct ? (
                  <div className="p-3 bg-tomate/10 border border-tomate/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {selectedProduct.nombre}
                        </p>
                        <p className="text-sm text-gray-600">
                          Stock actual: {selectedProduct.stock_actual} {selectedProduct.unidad}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedProduct(null)}
                      >
                        Cambiar
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="max-h-40 overflow-auto border border-gray-300 rounded-md">
                    {filteredProducts.map(product => (
                      <button
                        key={product.id}
                        type="button"
                        onClick={() => setSelectedProduct(product)}
                        className="w-full p-3 text-left hover:bg-gray-50 border-b border-gray-200 last:border-b-0"
                      >
                        <div className="flex items-center gap-3">
                          <Package className="w-4 h-4 text-gray-400" />
                          <div>
                            <p className="font-medium text-gray-900">
                              {product.nombre}
                            </p>
                            <p className="text-sm text-gray-600">
                              {product.stock_actual} {product.unidad}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Tipo de ajuste */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Ajuste *
              </label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                <label className="relative">
                  <input
                    type="radio"
                    value="correccion"
                    {...register('tipo')}
                    className="sr-only"
                  />
                  <div className={`p-3 border rounded-lg text-center cursor-pointer transition-colors ${
                    tipoAjuste === 'correccion'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}>
                    <div className="text-xs font-medium">Corrección</div>
                    <div className="text-xs text-gray-500 mt-1">Ajuste directo</div>
                  </div>
                </label>

                <label className="relative">
                  <input
                    type="radio"
                    value="inventario"
                    {...register('tipo')}
                    className="sr-only"
                  />
                  <div className={`p-3 border rounded-lg text-center cursor-pointer transition-colors ${
                    tipoAjuste === 'inventario'
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}>
                    <div className="text-xs font-medium">Inventario</div>
                    <div className="text-xs text-gray-500 mt-1">Recuento</div>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="relative">
                  <input
                    type="radio"
                    value="merma"
                    {...register('tipo')}
                    className="sr-only"
                  />
                  <div className={`p-3 border rounded-lg text-center cursor-pointer transition-colors ${
                    tipoAjuste === 'merma'
                      ? 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}>
                    <Minus className="w-4 h-4 mx-auto mb-1" />
                    <div className="text-xs font-medium">Merma</div>
                  </div>
                </label>

                <label className="relative">
                  <input
                    type="radio"
                    value="devolucion"
                    {...register('tipo')}
                    className="sr-only"
                  />
                  <div className={`p-3 border rounded-lg text-center cursor-pointer transition-colors ${
                    tipoAjuste === 'devolucion'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}>
                    <Plus className="w-4 h-4 mx-auto mb-1" />
                    <div className="text-xs font-medium">Devolución</div>
                  </div>
                </label>
              </div>
              {errors.tipo && (
                <p className="text-red-600 text-sm mt-1">{errors.tipo.message}</p>
              )}
            </div>

            {/* Cantidad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {(tipoAjuste === 'correccion' || tipoAjuste === 'inventario') ? 'Nuevo Stock' : 'Cantidad'} {selectedProduct ? `(${selectedProduct.unidad})` : '*'}
              </label>
              <Input
                type="number"
                step="0.01"
                {...register('cantidad', { valueAsNumber: true })}
                placeholder={
                  (tipoAjuste === 'correccion' || tipoAjuste === 'inventario')
                    ? 'Cantidad final deseada'
                    : tipoAjuste === 'merma'
                    ? 'Cantidad a reducir'
                    : 'Cantidad a añadir'
                }
              />
              {errors.cantidad && (
                <p className="text-red-600 text-sm mt-1">{errors.cantidad.message}</p>
              )}
            </div>

            {/* Preview del resultado */}
            {selectedProduct && cantidad > 0 && (
              <div className={`p-3 rounded-lg border ${
                calculatedStock < selectedProduct.stock_minimo
                  ? 'border-yellow-200 bg-yellow-50'
                  : 'border-blue-200 bg-blue-50'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Nuevo stock:</span>
                  <span className="font-bold text-gray-900">
                    {calculatedStock} {selectedProduct.unidad}
                  </span>
                </div>
                {calculatedStock < selectedProduct.stock_minimo && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3 h-3 text-yellow-600" />
                    <span className="text-xs text-yellow-700">
                      Por debajo del stock mínimo ({selectedProduct.stock_minimo} {selectedProduct.unidad})
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Motivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Motivo *
              </label>
              <select
                {...register('motivo')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-tomate/20 focus:border-tomate"
              >
                <option value="">Seleccionar motivo...</option>
                {motivosComunes[tipoAjuste]?.map(motivo => (
                  <option key={motivo} value={motivo}>{motivo}</option>
                ))}
                <option value="Otro">Otro (especificar en observaciones)</option>
              </select>
              {errors.motivo && (
                <p className="text-red-600 text-sm mt-1">{errors.motivo.message}</p>
              )}
            </div>

            {/* Observaciones */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observaciones
              </label>
              <textarea
                {...register('observaciones')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-tomate/20 focus:border-tomate"
                placeholder="Detalles adicionales (opcional)..."
              />
              {errors.observaciones && (
                <p className="text-red-600 text-sm mt-1">{errors.observaciones.message}</p>
              )}
            </div>

            {/* Submit */}
            <Button
              type="submit"
              disabled={!selectedProduct || submitting}
              className="w-full bg-tomate hover:bg-tomate/90"
            >
              {submitting ? (
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
              ) : null}
              Registrar Ajuste
            </Button>
          </form>
        </Card>

        {/* Historial de ajustes */}
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Ajustes Recientes
          </h3>

          <div className="space-y-3">
            {adjustments.map((adjustment) => {
              // Usar datos del JOIN en lugar de buscar en el array
              const productName = adjustment.products?.nombre || 'Producto eliminado'
              const productUnit = adjustment.products?.unidad || 'ud'

              return (
                <div
                  key={adjustment.id}
                  className="p-3 border border-gray-200 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      {getAjusteTipoBadge(adjustment.tipo)}
                      <span className="text-sm font-medium text-gray-900">
                        {productName}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {formatDate(adjustment.created_at)}
                    </span>
                  </div>

                  <div className="text-sm text-gray-700 mb-1">
                    <span className="font-medium">
                      {adjustment.tipo === 'devolucion' ? '+' : '-'}{adjustment.cantidad} {productUnit}
                    </span>
                    {' • '}
                    <span>{adjustment.motivo}</span>
                  </div>
                  
                  {adjustment.observaciones && (
                    <p className="text-xs text-gray-600">
                      {adjustment.observaciones}
                    </p>
                  )}
                </div>
              )
            })}
            
            {adjustments.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No hay ajustes registrados</p>
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}