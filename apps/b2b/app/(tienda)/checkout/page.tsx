'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { useCartStore } from '@/stores/cartStore'
import { useAuth } from '@/hooks/useAuth'
import { BackorderDialog } from '@/components/tienda/BackorderDialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { showToast } from '@/lib/toast-helpers'
import { invalidateOrdersCache } from '@/hooks/useOrders'
import { 
  ShoppingCart, 
  AlertTriangle, 
  CreditCard, 
  Package, 
  MapPin, 
  Phone,
  User,
  Building
} from 'lucide-react'
import { BackorderItem } from '@/lib/types'

export default function CheckoutPage() {
  const { items, getTotalAmount, getTotalItems, clearCart } = useCartStore()
  const { user, token } = useAuth()
  const router = useRouter()
  
  const [loading, setLoading] = useState(false)
  const [showBackorderDialog, setShowBackorderDialog] = useState(false)
  const [backorderItems, setBackorderItems] = useState<BackorderItem[]>([])
  const [notes, setNotes] = useState('')
  
  const totalAmount = getTotalAmount()
  const totalItems = getTotalItems()

  // Redirigir si el carrito está vacío
  useEffect(() => {
    if (items.length === 0) {
      router.push('/catalogo')
    }
  }, [items.length, router])

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(price)
  }

  const handlePlaceOrder = async (allowBackorder = false) => {
    if (!token || !user?.customer) {
      showToast.auth.loginError("Debes iniciar sesión para continuar")
      return
    }

    if (!user.customer.is_approved) {
      showToast.warning(
        "Cuenta pendiente",
        "Tu cuenta está pendiente de aprobación por nuestro equipo"
      )
      return
    }

    setLoading(true)

    try {
      const orderData = {
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity
        })),
        allow_backorder: allowBackorder,
        notes: notes.trim() || undefined
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(orderData)
      })

      const data = await response.json()

      if (data.success) {
        // Pedido creado exitosamente
        showToast.order.created(data.data.order_id)

        // Invalidar cache de pedidos para que se actualice la lista
        invalidateOrdersCache()

        // Limpiar carrito y redirigir
        clearCart()
        router.push(`/confirmacion/${data.data.order_id}`)

      } else if (response.status === 400 && data.data?.product_name) {
        // Stock insuficiente - mostrar dialog de backorder
        const product = items.find(item => item.product.nombre === data.data.product_name)
        if (product) {
          setBackorderItems([{
            product_id: product.product_id,
            product_name: data.data.product_name,
            requested_quantity: data.data.requested,
            available_quantity: data.data.available,
            backorder_quantity: data.data.requested - data.data.available
          }])
          setShowBackorderDialog(true)
        }
      } else {
        showToast.order.createError(data.error || "Hubo un problema procesando tu pedido")
      }
    } catch (error) {
      console.error('Error placing order:', error)
      showToast.network.serverError()
    } finally {
      setLoading(false)
    }
  }

  const handleBackorderConfirm = () => {
    setShowBackorderDialog(false)
    handlePlaceOrder(true) // Intentar de nuevo con backorder permitido
  }

  if (items.length === 0) {
    return null // El useEffect se encarga de la redirección
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Información del pedido */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Checkout</h1>
            <p className="text-gray-600">Revisa tu pedido antes de confirmar</p>
          </div>

          {/* Información del cliente */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <User className="w-5 h-5 mr-2 text-[var(--color-tomate)]" />
              Información de entrega
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-3">
                <Building className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-900">{user?.customer?.name}</p>
                  {user?.customer?.company_name && (
                    <p className="text-sm text-gray-600">{user.customer.company_name}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-gray-900">{user?.customer?.phone || 'No especificado'}</p>
                  <p className="text-sm text-gray-600">Teléfono</p>
                </div>
              </div>
              
              {user?.customer?.address && (
                <div className="md:col-span-2 flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-900">{user.customer.address}</p>
                    <p className="text-sm text-gray-600">Dirección de entrega</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Productos en el carrito */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Package className="w-5 h-5 mr-2 text-[var(--color-tomate)]" />
              Productos ({totalItems} {totalItems === 1 ? 'artículo' : 'artículos'})
            </h2>
            
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.product_id} className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                  
                  {/* Imagen */}
                  <div className="w-16 h-16 flex-shrink-0">
                    <Image
                      src={item.product.image_url || '/placeholder-product.svg'}
                      alt={item.product.nombre || 'Producto'}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover rounded-md"
                    />
                  </div>

                  {/* Info del producto */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 line-clamp-1">
                      {item.product.nombre}
                    </h3>
                    {item.product.brand && (
                      <p className="text-sm text-gray-600">{item.product.brand}</p>
                    )}
                    
                    {/* Stock warning */}
                    {item.quantity > item.product.stock_actual && (
                      <div className="flex items-center mt-1">
                        <AlertTriangle className="w-4 h-4 text-amber-500 mr-1" />
                        <span className="text-xs text-amber-600">
                          Solo {item.product.stock_actual} disponibles
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Cantidad y precio */}
                  <div className="text-right">
                    <p className="font-medium text-gray-900">
                      {item.quantity} × {formatPrice(item.product.final_price)}
                    </p>
                    <p className="text-lg font-bold text-[var(--color-tomate)]">
                      {formatPrice(item.product.final_price * item.quantity)}
                    </p>
                    {item.product.discount_percentage > 0 && (
                      <p className="text-xs text-gray-500">
                        Descuento: {item.product.discount_percentage}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Notas del pedido */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Notas del pedido (opcional)
            </h2>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Instrucciones especiales, preferencias de entrega, etc."
              className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--color-tomate)] focus:border-transparent"
              rows={4}
              maxLength={500}
            />
            <p className="text-xs text-gray-500 mt-1">
              {notes.length}/500 caracteres
            </p>
          </Card>
        </div>

        {/* Resumen del pedido */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-24">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Resumen del pedido
            </h2>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">{formatPrice(totalAmount)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600">Envío</span>
                <span className="font-medium text-[var(--color-rucula)]">Gratuito</span>
              </div>
              
              <Separator />
              
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Total</span>
                <span className="font-bold text-[var(--color-tomate)]">
                  {formatPrice(totalAmount)}
                </span>
              </div>
            </div>

            {/* Información de la Fase 1 */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-start space-x-2">
                <CreditCard className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Pago offline
                  </p>
                  <p className="text-xs text-blue-700 mt-1">
                    El pago se coordinará fuera de la plataforma. 
                    Te contactaremos para gestionar el pago y la entrega.
                  </p>
                </div>
              </div>
            </div>

            {/* Botón de confirmar pedido */}
            <Button
              onClick={() => handlePlaceOrder(false)}
              disabled={loading || totalItems === 0}
              className="w-full mt-6 btn-primary"
              size="lg"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Procesando...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Confirmar Pedido
                </>
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center mt-4">
              Al confirmar tu pedido, el stock se reservará inmediatamente
            </p>
          </Card>
        </div>
      </div>

      {/* Dialog de backorder */}
      <BackorderDialog
        isOpen={showBackorderDialog}
        onClose={() => setShowBackorderDialog(false)}
        onConfirm={handleBackorderConfirm}
        backorderItems={backorderItems}
      />
    </div>
  )
}