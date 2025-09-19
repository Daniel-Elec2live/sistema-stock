// apps/backoffice/components/products/ProductForm.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Save, Package } from 'lucide-react'
import { productSchema } from '@/lib/validations'
import { Product } from '@/lib/types'
import { cn } from '@/lib/utils'
import { z } from 'zod'

type ProductFormData = z.infer<typeof productSchema>

interface ProductFormProps {
  initialData?: Partial<Product>
  onSubmit: (data: ProductFormData) => void
  isSubmitting?: boolean
  isEditing?: boolean
}

export function ProductForm({
  initialData,
  onSubmit,
  isSubmitting = false,
  isEditing = false
}: ProductFormProps) {
  const [proveedores, setProveedores] = useState<string[]>([])
  const [proveedorSuggestions, setProveedorSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [proveedorInput, setProveedorInput] = useState(initialData?.proveedor || '')

  const { 
    register, 
    handleSubmit, 
    formState: { errors },
    watch,
    setValue,
    getValues
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      nombre: initialData?.nombre || '',
      descripcion: initialData?.descripcion || '',
      unidad: initialData?.unidad || 'kg',
      stock_minimo: initialData?.stock_minimo || 5,
      stock_maximo: initialData?.stock_maximo || undefined,
      categoria: initialData?.categoria || '',
      proveedor: initialData?.proveedor || '',
      referencia: initialData?.referencia || ''
    }
  })

  // Cargar proveedores existentes
  useEffect(() => {
    const fetchProveedores = async () => {
      try {
        // Agregar timestamp para evitar cache
        const response = await fetch(`/api/proveedores?_t=${Date.now()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        })
        if (response.ok) {
          const data = await response.json()
          console.log('Proveedores cargados en ProductForm:', data.proveedores) // Debug
          setProveedores(data.proveedores || [])
        }
      } catch (error) {
        console.error('Error loading proveedores:', error)
      }
    }
    fetchProveedores()
  }, [])

  // Filtrar sugerencias cuando el usuario escribe
  const handleProveedorInputChange = (value: string) => {
    setProveedorInput(value)
    setValue('proveedor', value)
    
    if (value.length > 0) {
      const filtered = proveedores.filter(p => 
        p.toLowerCase().includes(value.toLowerCase())
      )
      setProveedorSuggestions(filtered.slice(0, 5)) // Máximo 5 sugerencias
      setShowSuggestions(filtered.length > 0)
    } else {
      setShowSuggestions(false)
    }
  }

  // Seleccionar proveedor de las sugerencias
  const selectProveedor = (proveedor: string) => {
    setProveedorInput(proveedor)
    setValue('proveedor', proveedor)
    setShowSuggestions(false)
    
    // Generar referencia automáticamente si no estamos editando
    if (!isEditing) {
      generateReference(proveedor)
    }
  }

  // Generar referencia automáticamente
  const generateReference = async (proveedor: string) => {
    if (proveedor.length < 3) return
    
    try {
      const response = await fetch(`/api/products/generate-reference?proveedor=${encodeURIComponent(proveedor)}`)
      if (response.ok) {
        const data = await response.json()
        setValue('referencia', data.referencia)
      }
    } catch (error) {
      console.error('Error generating reference:', error)
    }
  }

  // Generar referencia cuando el proveedor cambia (solo en creación)
  useEffect(() => {
    if (!isEditing && proveedorInput.length >= 3) {
      const timer = setTimeout(() => {
        generateReference(proveedorInput)
      }, 500) // Debounce de 500ms
      
      return () => clearTimeout(timer)
    }
  }, [proveedorInput, isEditing])

  const categorias = [
    'Verduras',
    'Lácteos',
    'Carnes',
    'Pescados',
    'Aceites',
    'Condimentos',
    'Cereales',
    'Bebidas',
    'Otros'
  ]

  const unidades = [
    'kg',
    'unidades',
    'litros',
    'bolsas',
    'cajas',
    'paquetes',
    'gramos',
    'ml'
  ]

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Información básica */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Package className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Información Básica
          </h3>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nombre del Producto *
            </label>
            <Input 
              {...register('nombre')} 
              className="h-12 lg:h-10"
              placeholder="Ej: Tomate Cherry"
            />
            {errors.nombre && (
              <p className="text-red-600 text-sm mt-1">{errors.nombre.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descripción
            </label>
            <textarea
              {...register('descripcion')}
              rows={4}
              className="w-full px-4 py-3 lg:px-3 lg:py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-tomate/20 focus:border-tomate"
              placeholder="Descripción opcional del producto..."
            />
            {errors.descripcion && (
              <p className="text-red-600 text-sm mt-1">{errors.descripcion.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Categoría *
            </label>
            <select 
              {...register('categoria')}
              className="w-full h-12 lg:h-10 px-4 lg:px-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-tomate/20 focus:border-tomate"
            >
              <option value="">Seleccionar categoría</option>
              {categorias.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            {errors.categoria && (
              <p className="text-red-600 text-sm mt-1">{errors.categoria.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proveedor *
            </label>
            <div className="relative">
              <Input 
                value={proveedorInput}
                onChange={(e) => handleProveedorInputChange(e.target.value)}
                onFocus={() => {
                  if (proveedorSuggestions.length > 0) setShowSuggestions(true)
                }}
                onBlur={() => {
                  // Delay para permitir clicks en sugerencias
                  setTimeout(() => setShowSuggestions(false), 200)
                }}
                placeholder="Escribir o seleccionar proveedor"
                className="h-12 lg:h-10"
              />
              
              {/* Sugerencias dropdown */}
              {showSuggestions && proveedorSuggestions.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-auto">
                  {proveedorSuggestions.map((proveedor, index) => (
                    <button
                      key={index}
                      type="button"
                      className="w-full px-4 py-3 lg:px-3 lg:py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      onClick={() => selectProveedor(proveedor)}
                    >
                      {proveedor}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {errors.proveedor && (
              <p className="text-red-600 text-sm mt-1">{errors.proveedor.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Referencia *
            </label>
            <Input 
              {...register('referencia')}
              placeholder={isEditing ? "Referencia del producto" : "Se genera automáticamente"}
              readOnly={!isEditing}
              className={cn(
                "h-12 lg:h-10",
                !isEditing ? "bg-gray-50 text-gray-600" : ""
              )}
            />
            {errors.referencia && (
              <p className="text-red-600 text-sm mt-1">{errors.referencia.message}</p>
            )}
            {!isEditing && (
              <p className="text-xs text-gray-500 mt-1">
                Formato: 3 letras del proveedor + 25 + número correlativo (ej: MAK25001)
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Configuración de stock */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Configuración de Stock
        </h3>

        <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unidad de Medida *
            </label>
            <select 
              {...register('unidad')}
              className="w-full h-12 lg:h-10 px-4 lg:px-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-tomate/20 focus:border-tomate"
            >
              {unidades.map(unidad => (
                <option key={unidad} value={unidad}>{unidad}</option>
              ))}
            </select>
            {errors.unidad && (
              <p className="text-red-600 text-sm mt-1">{errors.unidad.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stock Mínimo *
            </label>
            <Input 
              type="number"
              step="0.01"
              className="h-12 lg:h-10"
              {...register('stock_minimo', { valueAsNumber: true })}
              placeholder="5"
            />
            {errors.stock_minimo && (
              <p className="text-red-600 text-sm mt-1">{errors.stock_minimo.message}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Se generará alerta cuando el stock esté por debajo
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stock Máximo (opcional)
            </label>
            <Input 
              type="number"
              step="0.01"
              className="h-12 lg:h-10"
              {...register('stock_maximo', { 
                setValueAs: (value) => value === '' ? undefined : parseFloat(value)
              })}
              placeholder="100"
            />
            {errors.stock_maximo && (
              <p className="text-red-600 text-sm mt-1">{errors.stock_maximo.message}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Para sugerencias de compra automáticas
            </p>
          </div>
        </div>
      </Card>


      {/* Submit button */}
      <div className="flex flex-col lg:flex-row lg:justify-end gap-4">
        <Button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full lg:w-auto bg-tomate hover:bg-tomate/90 h-12 lg:h-10"
          size="lg"
        >
          {isSubmitting ? (
            <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {isEditing ? 'Actualizar Producto' : 'Crear Producto'}
        </Button>
      </div>

    </form>
  )
}