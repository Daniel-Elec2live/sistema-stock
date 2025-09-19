'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useCartStore } from '@/stores/cartStore'
import { Button } from '@/components/ui/button'
import { X, Plus, Minus, ShoppingBag, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function CartSidebar() {
  const { 
    items, 
    isOpen, 
    closeCart, 
    updateQuantity, 
    removeItem, 
    getTotalAmount, 
    getTotalItems 
  } = useCartStore()

  const totalAmount = getTotalAmount()
  const totalItems = getTotalItems()

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(price)
  }

  return (
    <>
      {/* Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 z-50"
            onClick={closeCart}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className="fixed top-0 right-0 h-full w-full max-w-md bg-white shadow-xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                Mi Carrito ({totalItems})
              </h2>
              <Button variant="ghost" size="sm" onClick={closeCart}>
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <ShoppingBag className="w-16 h-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Tu carrito está vacío
                  </h3>
                  <p className="text-gray-500 mb-6">
                    Explora nuestro catálogo y agrega productos
                  </p>
                  <Link href="/catalogo" onClick={closeCart}>
                    <Button className="btn-primary">
                      Ver catálogo
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="p-4 space-y-4">
                  {items.map((item) => (
                    <div key={item.product_id} className="flex items-center space-x-3 bg-gray-50 rounded-lg p-3">
                      
                      {/* Imagen del producto */}
                      <div className="w-16 h-16 flex-shrink-0">
                        <Image
                          src={item.product.image_url || '/placeholder-product.svg'}
                          alt={item.product.nombre || item.product.name || 'Producto'}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover rounded-md"
                        />
                      </div>

                      {/* Info del producto */}
                      <div className="flex-1 min-w-0">
                        <Link 
                          href={`/producto/${item.product_id}`}
                          onClick={closeCart}
                        >
                          <h4 className="text-sm font-medium text-gray-900 hover:text-[var(--color-tomate)] line-clamp-2">
                            {item.product.name}
                          </h4>
                        </Link>
                        
                        {item.product.brand && (
                          <p className="text-xs text-gray-600 mt-1">
                            {item.product.brand}
                          </p>
                        )}

                        {/* Precio */}
                        <div className="mt-1">
                          {item.product.discount_percentage > 0 ? (
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500 line-through">
                                {formatPrice(item.product.price)}
                              </span>
                              <span className="text-sm font-semibold text-[var(--color-tomate)]">
                                {formatPrice(item.product.final_price)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-sm font-semibold text-gray-900">
                              {formatPrice(item.product.final_price)}
                            </span>
                          )}
                        </div>

                        {/* Controles de cantidad */}
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="w-7 h-7 p-0"
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            
                            <span className="text-sm font-medium w-8 text-center">
                              {item.quantity}
                            </span>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                              disabled={item.quantity >= item.product.stock_quantity}
                              className="w-7 h-7 p-0"
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(item.product_id)}
                            className="text-red-500 hover:text-red-700 w-7 h-7 p-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer con total y checkout */}
            {items.length > 0 && (
              <div className="border-t border-gray-200 p-4 space-y-4">
                
                {/* Total */}
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-gray-900">Total:</span>
                  <span className="text-xl font-bold text-[var(--color-tomate)]">
                    {formatPrice(totalAmount)}
                  </span>
                </div>

                {/* Botones de acción */}
                <div className="space-y-2">
                  <Link href="/carrito" onClick={closeCart}>
                    <Button variant="outline" className="w-full">
                      Ver carrito completo
                    </Button>
                  </Link>
                  
                  <Link href="/checkout" onClick={closeCart}>
                    <Button className="w-full btn-primary">
                      Comprar
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}