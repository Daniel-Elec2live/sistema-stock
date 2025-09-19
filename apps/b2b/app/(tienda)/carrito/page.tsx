'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useCartStore } from '@/stores/cartStore'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, Plus, Minus, Trash2, ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { showToast } from '@/lib/toast-helpers'

export default function CarritoPage() {
  const {
    items,
    updateQuantity,
    removeItem,
    clearCart,
    getTotalItems,
    getTotalAmount
  } = useCartStore()

  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(price)
  }

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    const item = items.find(item => item.product_id === productId)
    if (!item) return

    if (newQuantity <= 0) {
      removeItem(productId)
      showToast.cart.itemRemoved(item.product.nombre)
    } else {
      updateQuantity(productId, newQuantity)
      showToast.cart.itemUpdated(item.product.nombre)
    }
  }

  const handleCheckout = () => {
    if (items.length === 0) return
    setIsLoading(true)
    router.push('/checkout')
  }

  if (items.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <ShoppingCart className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Tu carrito está vacío
          </h2>
          <p className="text-gray-600 mb-6">
            Añade algunos productos para empezar tu pedido
          </p>
          <Link href="/catalogo">
            <Button className="btn-primary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Continuar comprando
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Carrito de compra
        </h1>
        <Badge variant="secondary" className="text-sm">
          {getTotalItems()} {getTotalItems() === 1 ? 'artículo' : 'artículos'}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lista de productos */}
        <div className="lg:col-span-2 space-y-4">
          {items.map((item) => (
            <Card key={item.product_id} className="p-4">
              <div className="flex items-center gap-4">
                {/* Imagen del producto */}
                <div className="w-20 h-20 flex-shrink-0">
                  <Image
                    src={item.product.image_url || '/placeholder-product.svg'}
                    alt={item.product.nombre}
                    width={80}
                    height={80}
                    className="w-full h-full object-cover rounded-md"
                  />
                </div>

                {/* Información del producto */}
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 line-clamp-2">
                    {item.product.nombre}
                  </h3>
                  {item.product.brand && (
                    <p className="text-sm text-gray-600">{item.product.brand}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-gray-500">
                      Stock: {item.product.stock_actual}
                    </span>
                    {item.product.discount_percentage > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        -{item.product.discount_percentage}%
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Controles de cantidad */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateQuantity(item.product_id, item.quantity - 1)}
                    disabled={item.quantity <= 1}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-12 text-center font-medium">
                    {item.quantity}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateQuantity(item.product_id, item.quantity + 1)}
                    disabled={item.quantity >= item.product.stock_actual}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>

                {/* Precio */}
                <div className="text-right min-w-0">
                  {item.product.discount_percentage > 0 ? (
                    <>
                      <p className="text-sm text-gray-500 line-through">
                        {formatPrice(item.product.precio_promedio || 0)}
                      </p>
                      <p className="font-bold text-[var(--color-tomate)]">
                        {formatPrice(item.product.final_price * item.quantity)}
                      </p>
                    </>
                  ) : (
                    <p className="font-bold text-gray-900">
                      {formatPrice(item.product.final_price * item.quantity)}
                    </p>
                  )}
                </div>

                {/* Botón eliminar */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    removeItem(item.product_id)
                    showToast.cart.itemRemoved(item.product.nombre)
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Card>
          ))}

          {/* Botón limpiar carrito */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={() => {
                clearCart()
                showToast.cart.cartCleared()
              }}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Vaciar carrito
            </Button>
          </div>
        </div>

        {/* Resumen del pedido */}
        <div className="lg:col-span-1">
          <Card className="p-6 sticky top-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Resumen del pedido
            </h3>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">
                  {formatPrice(getTotalAmount())}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Envío</span>
                <span className="font-medium text-green-600">Gratuito</span>
              </div>
              <div className="border-t pt-3">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span className="text-[var(--color-tomate)]">
                    {formatPrice(getTotalAmount())}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={handleCheckout}
                disabled={isLoading || items.length === 0}
                className="w-full btn-primary"
              >
                {isLoading ? 'Procesando...' : 'Comprar'}
              </Button>

              <Link href="/catalogo">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Continuar comprando
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}