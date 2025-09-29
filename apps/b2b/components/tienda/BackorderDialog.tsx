'use client'

import { useState } from 'react'
import { BackorderItem } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertTriangle, Package, Clock, CheckCircle } from 'lucide-react'

interface BackorderDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  backorderItems: BackorderItem[]
}

export function BackorderDialog({ 
  isOpen, 
  onClose, 
  onConfirm, 
  backorderItems 
}: BackorderDialogProps) {
  const [confirmed, setConfirmed] = useState(false)

  const handleConfirm = () => {
    if (confirmed) {
      onConfirm()
      setConfirmed(false) // Reset para próxima vez
    }
  }

  const handleClose = () => {
    setConfirmed(false)
    onClose()
  }

  const getTotalBackorderQuantity = () => {
    return backorderItems.reduce((total, item) => total + item.backorder_quantity, 0)
  }

  const getTotalAvailableQuantity = () => {
    return backorderItems.reduce((total, item) => total + item.available_quantity, 0)
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" />
            <span>Stock Insuficiente Detectado</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          
          {/* Explicación principal */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-amber-900 mb-1">
                  Algunos productos no tienen stock suficiente
                </h3>
                <p className="text-sm text-amber-800">
                  Puedes proceder con el pedido parcial ahora y recibirás el resto cuando tengamos stock, 
                  o puedes cancelar y modificar tu carrito.
                </p>
              </div>
            </div>
          </div>

          {/* Detalle de productos con problemas de stock */}
          <div className="space-y-4">
            <h4 className="font-semibold text-gray-900">Detalle de productos afectados:</h4>
            
            {backorderItems.map((item) => (
              <div key={item.product_id} className="border rounded-lg p-4 bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900 mb-2">{item.product_name}</h5>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <Package className="w-4 h-4 text-blue-500" />
                        <div>
                          <p className="text-gray-600">Solicitado</p>
                          <p className="font-semibold">{item.requested_quantity}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        <div>
                          <p className="text-gray-600">Disponible ahora</p>
                          <p className="font-semibold text-green-600">{item.available_quantity}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <Clock className="w-4 h-4 text-amber-500" />
                        <div>
                          <p className="text-gray-600">Pendiente</p>
                          <p className="font-semibold text-amber-600">{item.backorder_quantity}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Resumen de la situación */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">¿Qué sucederá si procedes?</h4>
            <div className="space-y-2 text-sm text-blue-800">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>Recibirás {getTotalAvailableQuantity()} unidades inmediatamente</span>
              </div>
              <div className="flex items-center space-x-2">
                <Clock className="w-4 h-4 text-amber-500" />
                <span>
                  Te notificaremos cuando tengamos las {getTotalBackorderQuantity()} unidades restantes
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <Package className="w-4 h-4 text-blue-500" />
                <span>No pagarás las unidades pendientes hasta que las enviemos</span>
              </div>
            </div>
          </div>

          {/* Checkbox de confirmación */}
          <div className="flex items-start space-x-3 p-4 bg-gray-50 rounded-lg">
            <input
              type="checkbox"
              id="backorder-confirm"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 h-4 w-4 text-[var(--color-tomate)] focus:ring-[var(--color-tomate)] border-gray-300 rounded"
            />
            <label htmlFor="backorder-confirm" className="text-sm text-gray-700">
              <span className="font-medium">Confirmo que entiendo las condiciones:</span>
              <br />
              Acepto recibir el pedido parcial ahora y el resto cuando haya stock disponible.
              Entiendo que solo pagaré por lo que esté disponible en cada recogida.
            </label>
          </div>

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancelar y revisar carrito
            </Button>
            
            <Button
              onClick={handleConfirm}
              disabled={!confirmed}
              className="flex-1 btn-primary"
            >
              Proceder con pedido parcial
            </Button>
          </div>

          {/* Nota adicional */}
          <div className="text-xs text-gray-500 text-center border-t pt-4">
            <p>
              💡 <strong>Consejo:</strong> Puedes volver al carrito y ajustar las cantidades 
              si prefieres esperar a que tengamos todo el stock disponible.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}