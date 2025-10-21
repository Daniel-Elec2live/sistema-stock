// apps/backoffice/components/entries/EntryForm.tsx
'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Plus, Trash2, Save } from 'lucide-react'

const entrySchema = z.object({
  proveedor: z.string().min(1, 'Proveedor es requerido'),
  fecha: z.string().min(1, 'Fecha es requerida'),
  productos: z.array(z.object({
    id: z.string().min(1, 'Producto es requerido'),
    nombre: z.string().min(1, 'Nombre es requerido'),
    cantidad: z.number().min(0.01, 'Cantidad debe ser mayor a 0'),
    precio: z.number().min(0, 'Precio debe ser mayor o igual a 0'),
    unidad: z.string().min(1, 'Unidad es requerida'),
    caducidad: z.string().optional()
  })).min(1, 'Debe haber al menos un producto')
})

type EntryFormData = z.infer<typeof entrySchema>

interface Producto {
  id: string
  nombre: string
  unidad: string
  proveedor: string
}

interface EntryFormProps {
  onSubmit: (data: EntryFormData) => void
  initialData?: Partial<EntryFormData>
}

export function EntryForm({ onSubmit, initialData }: EntryFormProps) {
  const [proveedores, setProveedores] = useState<string[]>([])
  const [productos, setProductos] = useState<Producto[]>([])
  const [loadingProductos, setLoadingProductos] = useState(false)
  
  const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm<EntryFormData>({
    resolver: zodResolver(entrySchema),
    defaultValues: {
      proveedor: initialData?.proveedor || '',
      fecha: initialData?.fecha || new Date().toISOString().split('T')[0],
      productos: initialData?.productos || [
        { id: '', nombre: '', cantidad: 0, precio: 0, unidad: 'kg', caducidad: '' }
      ]
    }
  })

  const formProductos = watch('productos')
  const selectedProveedor = watch('proveedor')
  
  // Cargar proveedores al montar el componente
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
          const { proveedores } = await response.json()
          console.log('Proveedores cargados en EntryForm:', proveedores) // Debug
          setProveedores(proveedores)
        }
      } catch (error) {
        console.error('Error cargando proveedores:', error)
      }
    }
    fetchProveedores()
  }, [])
  
  // Cargar productos cuando cambia el proveedor
  useEffect(() => {
    if (selectedProveedor) {
      const fetchProductos = async () => {
        setLoadingProductos(true)
        try {
          const response = await fetch(`/api/productos?proveedor=${encodeURIComponent(selectedProveedor)}&_t=${Date.now()}`, {
            cache: 'no-store',
            headers: {
              'Cache-Control': 'no-cache'
            }
          })
          if (response.ok) {
            const { productos } = await response.json()
            setProductos(productos)
          }
        } catch (error) {
          console.error('Error cargando productos:', error)
        } finally {
          setLoadingProductos(false)
        }
      }
      fetchProductos()
    } else {
      setProductos([])
    }
  }, [selectedProveedor])
  
  // Función para manejar cambio de producto
  const handleProductoChange = (index: number, productoId: string) => {
    const producto = productos.find(p => p.id === productoId)
    if (producto) {
      setValue(`productos.${index}.id`, producto.id)
      setValue(`productos.${index}.nombre`, producto.nombre)
      setValue(`productos.${index}.unidad`, producto.unidad)
    }
  }

  const addProduct = () => {
    setValue('productos', [
      ...formProductos,
      { id: '', nombre: '', cantidad: 0, precio: 0, unidad: 'kg', caducidad: '' }
    ])
  }

  const removeProduct = (index: number) => {
    if (formProductos.length > 1) {
      setValue('productos', formProductos.filter((_, i) => i !== index))
    }
  }

  const total = formProductos.reduce((sum, p) => sum + (p.cantidad * p.precio), 0)

  return (
    <Card className="p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Información general */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Proveedor *
            </label>
            <select 
              {...register('proveedor')}
              className="w-full h-10 px-3 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#a21813]/20 focus:border-[#a21813]"
            >
              <option value="">Selecciona un proveedor</option>
              {proveedores.map((proveedor) => (
                <option key={proveedor} value={proveedor}>
                  {proveedor}
                </option>
              ))}
            </select>
            {errors.proveedor && (
              <p className="text-red-600 text-sm mt-1">{errors.proveedor.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha *
            </label>
            <Input type="date" {...register('fecha')} />
            {errors.fecha && (
              <p className="text-red-600 text-sm mt-1">{errors.fecha.message}</p>
            )}
          </div>
        </div>

        {/* Lista de productos */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-medium text-gray-900">
              Productos ({formProductos.length})
            </h4>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              onClick={addProduct}
              disabled={!selectedProveedor}
            >
              <Plus className="w-4 h-4 mr-2" />
              Añadir Producto
            </Button>
          </div>
          {!selectedProveedor && (
            <p className="text-sm text-gray-600 mb-4">
              Selecciona un proveedor para añadir productos
            </p>
          )}

          <div className="space-y-4">
            {formProductos.map((_, index) => (
              <div key={index} className="border rounded-lg p-4 bg-gray-50">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Producto *
                    </label>
                    <select 
                      {...register(`productos.${index}.id`)}
                      className="w-full h-8 px-3 border border-gray-300 rounded-md text-sm"
                      onChange={(e) => handleProductoChange(index, e.target.value)}
                      disabled={!selectedProveedor || loadingProductos}
                    >
                      <option value="">
                        {loadingProductos ? 'Cargando...' : 'Selecciona un producto'}
                      </option>
                      {productos.map((producto) => (
                        <option key={producto.id} value={producto.id}>
                          {producto.nombre}
                        </option>
                      ))}
                    </select>
                    {errors.productos?.[index]?.id && (
                      <p className="text-red-600 text-xs mt-1">
                        Producto es requerido
                      </p>
                    )}
                    <input type="hidden" {...register(`productos.${index}.nombre`)} />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Cantidad *
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      {...register(`productos.${index}.cantidad`, { valueAsNumber: true })}
                      className="h-8"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Precio €
                    </label>
                    <Input
                      type="number"
                      step="0.01"
                      {...register(`productos.${index}.precio`, { valueAsNumber: true })}
                      className="h-8"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Unidad
                    </label>
                    <Input 
                      {...register(`productos.${index}.unidad`)}
                      className="h-8 bg-gray-50"
                      readOnly
                      placeholder="Se autorellena"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Caducidad (opcional)
                    </label>
                    <Input
                      type="date"
                      {...register(`productos.${index}.caducidad`)}
                      className="h-8"
                    />
                  </div>
                  
                  <div className="flex items-end justify-between">
                    <span className="text-sm text-gray-600">
                      Subtotal: €{(formProductos[index]?.cantidad * formProductos[index]?.precio || 0).toFixed(2)}
                    </span>
                    {formProductos.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeProduct(index)}
                        className="text-red-600 hover:text-red-700 h-8"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Resumen y submit */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t">
          <div className="text-lg font-semibold text-gray-900">
            Total: €{total.toFixed(2)}
          </div>
          
          <Button type="submit" className="bg-tomate hover:bg-tomate/90">
            <Save className="w-4 h-4 mr-2" />
            Guardar Entrada
          </Button>
        </div>

        {errors.productos && (
          <p className="text-red-600 text-sm">{errors.productos.message}</p>
        )}
      </form>
    </Card>
  )
}