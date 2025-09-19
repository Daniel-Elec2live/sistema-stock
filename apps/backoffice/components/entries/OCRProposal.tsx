// apps/backoffice/components/entries/OCRProposal.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertTriangle, Edit, X } from 'lucide-react'

interface ValidationData {
  proveedor?: string
  fecha?: string
  productos?: Array<{
    nombre: string
    cantidad: number
    precio: number
    unidad: string
    caducidad?: string
  }>
}

interface OCRProposalProps {
  data: {
    id: string
    proveedor?: string
    fecha?: string
    productos?: Array<{
      nombre: string
      cantidad: number
      precio: number
      unidad: string
      caducidad?: string
    }>
    confianza?: number
  }
  onValidate: (data: ValidationData) => void
  onCancel: () => void
}

export function OCRProposal({ data, onValidate, onCancel }: OCRProposalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedData, setEditedData] = useState(data)

  const confidenceColor = (confidence?: number) => {
    if (!confidence) return 'bg-gray-100 text-gray-600'
    if (confidence >= 0.8) return 'bg-green-100 text-green-800'
    if (confidence >= 0.6) return 'bg-yellow-100 text-yellow-800'
    return 'bg-red-100 text-red-800'
  }

  const handleProductEdit = (index: number, field: string, value: string | number) => {
    const updatedProducts = [...(editedData.productos || [])]
    updatedProducts[index] = { ...updatedProducts[index], [field]: value }
    setEditedData({ ...editedData, productos: updatedProducts })
  }

  const handleValidate = () => {
    onValidate(editedData)
  }

  const total = editedData.productos?.reduce((sum, p) => sum + (p.cantidad * p.precio), 0) || 0

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Propuesta de Entrada
          </h3>
          <p className="text-gray-600">
            Revisa y valida los datos extraídos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={confidenceColor(data.confianza)}>
            Confianza: {((data.confianza || 0) * 100).toFixed(0)}%
          </Badge>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(!isEditing)}
          >
            <Edit className="w-4 h-4 mr-2" />
            {isEditing ? 'Ver' : 'Editar'}
          </Button>
        </div>
      </div>

      {/* Información del proveedor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Proveedor
          </label>
          {isEditing ? (
            <Input
              value={editedData.proveedor || ''}
              onChange={(e) => setEditedData({ ...editedData, proveedor: e.target.value })}
            />
          ) : (
            <p className="text-gray-900">{editedData.proveedor || 'No detectado'}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Fecha
          </label>
          {isEditing ? (
            <Input
              type="date"
              value={editedData.fecha || ''}
              onChange={(e) => setEditedData({ ...editedData, fecha: e.target.value })}
            />
          ) : (
            <p className="text-gray-900">
              {editedData.fecha ? new Date(editedData.fecha).toLocaleDateString('es-ES') : 'No detectada'}
            </p>
          )}
        </div>
      </div>

      <hr className="my-6 border-gray-200" />

      {/* Lista de productos */}
      <div className="mb-6">
        <h4 className="font-medium text-gray-900 mb-4">
          Productos Detectados ({editedData.productos?.length || 0})
        </h4>
        
        <div className="space-y-3">
          {editedData.productos?.map((producto, index) => (
            <div key={index} className="border rounded-lg p-4 bg-gray-50">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Producto
                  </label>
                  {isEditing ? (
                    <Input
                      value={producto.nombre}
                      onChange={(e) => handleProductEdit(index, 'nombre', e.target.value)}
                      className="h-8"
                    />
                  ) : (
                    <p className="text-sm font-medium text-gray-900">
                      {producto.nombre}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Cantidad
                  </label>
                  {isEditing ? (
                    <Input
                      type="number"
                      value={producto.cantidad}
                      onChange={(e) => handleProductEdit(index, 'cantidad', parseFloat(e.target.value))}
                      className="h-8"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">
                      {producto.cantidad} {producto.unidad}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Precio Unitario
                  </label>
                  {isEditing ? (
                    <Input
                      type="number"
                      step="0.01"
                      value={producto.precio}
                      onChange={(e) => handleProductEdit(index, 'precio', parseFloat(e.target.value))}
                      className="h-8"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">
                      €{producto.precio.toFixed(2)}
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Caducidad
                  </label>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={producto.caducidad || ''}
                      onChange={(e) => handleProductEdit(index, 'caducidad', e.target.value)}
                      className="h-8"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">
                      {producto.caducidad 
                        ? new Date(producto.caducidad).toLocaleDateString('es-ES')
                        : 'No especificada'
                      }
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-200">
                <span className="text-xs text-gray-600">
                  Subtotal: €{(producto.cantidad * producto.precio).toFixed(2)}
                </span>
                {(data.confianza || 0) < 0.7 && (
                  <Badge variant="secondary" className="text-xs">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    Revisar
                  </Badge>
                )}
              </div>
            </div>
          )) || (
            <div className="text-center py-8 text-gray-500">
              <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No se detectaron productos en el documento</p>
            </div>
          )}
        </div>
      </div>

      <hr className="my-6 border-gray-200" />

      {/* Resumen y acciones */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="text-lg font-semibold text-gray-900">
          Total: €{total.toFixed(2)}
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>
            <X className="w-4 h-4 mr-2" />
            Cancelar
          </Button>
          <Button onClick={handleValidate} className="bg-tomate hover:bg-tomate/90">
            <CheckCircle className="w-4 h-4 mr-2" />
            Validar y Actualizar Stock
          </Button>
        </div>
      </div>
    </Card>
  )
}