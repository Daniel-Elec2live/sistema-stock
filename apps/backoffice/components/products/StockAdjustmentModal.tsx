// apps/backoffice/components/products/StockAdjustmentModal.tsx
'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { X, Package, Plus, Minus, AlertTriangle } from 'lucide-react'
import { Product } from '@/lib/types'

const adjustmentSchema = z.object({
  tipo: z.enum(['merma', 'correccion', 'devolucion', 'inventario']),
  cantidad: z.number().min(0.01, 'Cantidad debe ser mayor a 0'),
  motivo: z.string().min(1, 'Motivo es requerido').max(200, 'Motivo muy largo'),
  observaciones: z.string().max(500, 'Observaciones muy largas').optional()
})

type AdjustmentFormData = z.infer<typeof adjustmentSchema>

interface StockAdjustmentModalProps {
  product: Product
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function StockAdjustmentModal({
  product,
  isOpen,
  onClose,
  onSuccess
}: StockAdjustmentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newStock, setNewStock] = useState(product.stock_actual)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
    reset
  } = useForm<AdjustmentFormData>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      tipo: 'correccion',
      cantidad: 0,
      motivo: '',
      observaciones: ''
    }
  })

  const cantidad = watch('cantidad')
  const tipo = watch('tipo')

  // Calcular nuevo stock basado en tipo y cantidad
  const calculateNewStock = () => {
    if (!cantidad || cantidad <= 0) return product.stock_actual

    switch (tipo) {
      case 'correccion':
      case 'inventario':
        // Para corrección/inventario, la cantidad es el stock objetivo final
        return cantidad
      case 'merma':
        return Math.max(0, product.stock_actual - cantidad) // Restar
      case 'devolucion':
        return product.stock_actual + cantidad // Sumar
      default:
        return product.stock_actual
    }
  }

  const calculatedStock = calculateNewStock()

  const onSubmit = async (data: AdjustmentFormData) => {
    setIsSubmitting(true)
    try {
      // Para corrección/inventario, calcular la diferencia
      let adjustedCantidad = data.cantidad
      if (data.tipo === 'correccion' || data.tipo === 'inventario') {
        // Si queremos stock final de X, enviamos la diferencia (X - stock_actual)
        adjustedCantidad = data.cantidad - product.stock_actual
      }

      const response = await fetch('/api/stock/adjustment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: product.id,
          tipo: data.tipo,
          cantidad: adjustedCantidad,
          motivo: data.motivo,
          observaciones: data.observaciones
        })
      })

      if (response.ok) {
        onSuccess()
        onClose()
        reset()
      } else {
        const error = await response.json()
        console.error('Error ajustando stock:', error)
        // TODO: Mostrar toast de error
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

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

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md bg-white max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gray-100 rounded-lg">
                <Package className="w-5 h-5 text-gray-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Ajustar Stock
                </h2>
                <p className="text-sm text-gray-600 truncate">
                  {product.nombre}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="p-2"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Stock actual */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-1">Stock Actual</p>
              <p className="text-2xl font-bold text-gray-900">
                {product.stock_actual} <span className="text-base font-normal text-gray-600">{product.unidad}</span>
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Tipo de ajuste */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Ajuste
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
                    tipo === 'correccion'
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
                    tipo === 'inventario'
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
                    tipo === 'merma'
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
                    tipo === 'devolucion'
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}>
                    <Plus className="w-4 h-4 mx-auto mb-1" />
                    <div className="text-xs font-medium">Devolución</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Cantidad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {(tipo === 'correccion' || tipo === 'inventario') ? 'Nuevo Stock' : 'Cantidad'} ({product.unidad})
              </label>
              <Input
                type="number"
                step="0.01"
                {...register('cantidad', { valueAsNumber: true })}
                placeholder={
                  (tipo === 'correccion' || tipo === 'inventario')
                    ? 'Cantidad final deseada'
                    : tipo === 'merma'
                    ? 'Cantidad a reducir'
                    : 'Cantidad a añadir'
                }
              />
              {errors.cantidad && (
                <p className="text-red-600 text-sm mt-1">{errors.cantidad.message}</p>
              )}
            </div>

            {/* Preview del resultado */}
            {cantidad > 0 && (
              <div className={`p-3 rounded-lg border ${
                calculatedStock < product.stock_minimo
                  ? 'border-yellow-200 bg-yellow-50'
                  : 'border-blue-200 bg-blue-50'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Nuevo stock:</span>
                  <span className="font-bold text-gray-900">
                    {calculatedStock} {product.unidad}
                  </span>
                </div>
                {calculatedStock < product.stock_minimo && (
                  <div className="flex items-center gap-1 mt-1">
                    <AlertTriangle className="w-3 h-3 text-yellow-600" />
                    <span className="text-xs text-yellow-700">
                      Por debajo del stock mínimo ({product.stock_minimo} {product.unidad})
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Motivo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo
              </label>
              <select
                {...register('motivo')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Seleccionar motivo...</option>
                {motivosComunes[tipo]?.map(motivo => (
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Observaciones (opcional)
              </label>
              <textarea
                {...register('observaciones')}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Detalles adicionales sobre el ajuste..."
              />
              {errors.observaciones && (
                <p className="text-red-600 text-sm mt-1">{errors.observaciones.message}</p>
              )}
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !cantidad || cantidad <= 0}
                className="flex-1 bg-tomate hover:bg-tomate/90"
              >
                {isSubmitting ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                ) : null}
                Confirmar Ajuste
              </Button>
            </div>
          </form>
        </div>
      </Card>
    </div>
  )
}