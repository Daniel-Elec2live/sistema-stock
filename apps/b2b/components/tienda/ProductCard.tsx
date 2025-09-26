'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { ProductWithDiscount } from '@/lib/types'
import { useCartStore } from '@/stores/cartStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StockIndicator } from './StockIndicator'
import { ShoppingCart, Plus, Minus, Eye } from 'lucide-react'
import { showToast } from '@/lib/toast-helpers'

interface ProductCardProps {
  product: ProductWithDiscount
  viewMode: 'grid' | 'list'
}

export function ProductCard({ product, viewMode }: ProductCardProps) {
  const [quantity, setQuantity] = useState(1)
  const { addItem, getItem, openCart } = useCartStore()
  
  const cartItem = getItem(product.id)
  const isInCart = !!cartItem

  const handleAddToCart = () => {
    if (quantity > product.stock_actual) {
      showToast.cart.stockInsufficient(product.nombre)
      return
    }
    addItem(product, quantity)
    showToast.cart.itemAdded(product.nombre)
    setQuantity(1)
  }

  const handleQuickAdd = () => {
    if (product.stock_actual === 0) {
      showToast.cart.stockInsufficient(product.nombre)
      return
    }
    addItem(product, 1)
    showToast.cart.itemAdded(product.nombre)
    openCart()
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(price)
  }

  if (viewMode === 'list') {
    return (
      <div className="flex bg-white border border-gray-200 rounded-lg p-3 sm:p-4 hover:shadow-md transition-shadow">

        {/* Imagen */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 flex-shrink-0 mr-3 sm:mr-4">
          <Image
            src={product.image_url || '/placeholder-product.svg'}
            alt={product.nombre}
            width={80}
            height={80}
            className="w-full h-full object-cover rounded-md"
          />
        </div>

        {/* Info del producto */}
        <div className="flex-1 min-w-0">
          {/* Layout para móvil vs desktop */}
          <div className="sm:flex sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <Link href={`/producto/${product.id}`}>
                <h3 className="text-sm sm:text-lg font-semibold text-gray-900 hover:text-tomate line-clamp-1 mb-1">
                  {product.nombre}
                </h3>
              </Link>

              {product.brand && (
                <p className="text-xs sm:text-sm text-gray-600 mb-1">{product.brand}</p>
              )}

              <div className="flex items-center gap-2 mb-2 sm:mb-2">
                <StockIndicator stock={product.stock_actual} minStock={product.stock_minimo} />

                {product.discount_percentage > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    -{product.discount_percentage}%
                  </Badge>
                )}
              </div>

              {/* Precio y acciones en móvil */}
              <div className="flex items-center justify-between sm:hidden">
                <div className="text-left">
                  {product.discount_percentage > 0 ? (
                    <>
                      <p className="text-xs text-gray-500 line-through">
                        {formatPrice(product.precio_promedio || 0)}
                      </p>
                      <p className="text-sm font-bold text-tomate">
                        {formatPrice(product.final_price)}
                      </p>
                    </>
                  ) : (
                    <p className="text-sm font-bold text-gray-900">
                      {formatPrice(product.final_price)}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  <Link href={`/producto/${product.id}`}>
                    <Button variant="outline" size="sm" className="h-9 w-9 p-0 min-h-[44px] sm:h-8 sm:w-8 sm:min-h-[32px]">
                      <Eye className="w-3 h-3" />
                    </Button>
                  </Link>

                  <Button
                    onClick={handleQuickAdd}
                    disabled={product.stock_actual === 0}
                    size="sm"
                    className="btn-primary h-9 w-9 p-0 min-h-[44px] sm:h-8 sm:w-8 sm:min-h-[32px]"
                  >
                    <ShoppingCart className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Precio y acciones en desktop */}
            <div className="hidden sm:flex sm:items-center sm:gap-4 sm:ml-4">
              <div className="text-right">
                {product.discount_percentage > 0 ? (
                  <>
                    <p className="text-sm text-gray-500 line-through">
                      {formatPrice(product.precio_promedio || 0)}
                    </p>
                    <p className="text-lg font-bold text-tomate">
                      {formatPrice(product.final_price)}
                    </p>
                  </>
                ) : (
                  <p className="text-lg font-bold text-gray-900">
                    {formatPrice(product.final_price)}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Link href={`/producto/${product.id}`}>
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                </Link>

                <Button
                  onClick={handleQuickAdd}
                  disabled={product.stock_actual === 0}
                  size="sm"
                  className="btn-primary"
                >
                  <ShoppingCart className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Vista en grid
  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
      
      {/* Imagen del producto */}
      <div className="relative aspect-square">
        <Image
          src={product.image_url || '/placeholder-product.svg'}
          alt={product.nombre}
          fill
          className="object-cover"
        />
        
        {/* Badge de descuento */}
        {product.discount_percentage > 0 && (
          <Badge 
            variant="destructive" 
            className="absolute top-2 left-2 text-xs font-bold"
          >
            -{product.discount_percentage}%
          </Badge>
        )}

        {/* Botón de vista rápida */}
        <Link href={`/producto/${product.id}`}>
          <Button
            variant="secondary"
            size="sm"
            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Eye className="w-4 h-4" />
          </Button>
        </Link>
      </div>

      {/* Información del producto */}
      <div className="p-3 sm:p-4">
        <Link href={`/producto/${product.id}`}>
          <h3 className="font-semibold text-gray-900 mb-1 hover:text-tomate line-clamp-2 text-sm sm:text-base">
            {product.nombre}
          </h3>
        </Link>

        {product.brand && (
          <p className="text-xs sm:text-sm text-gray-600 mb-2">{product.brand}</p>
        )}

        {/* Stock */}
        <div className="mb-2 sm:mb-3">
          <StockIndicator stock={product.stock_actual} minStock={product.stock_minimo} />
        </div>

        {/* Precio */}
        <div className="mb-3 sm:mb-4">
          {product.discount_percentage > 0 ? (
            <>
              <p className="text-xs sm:text-sm text-gray-500 line-through">
                {formatPrice(product.precio_promedio || 0)}
              </p>
              <p className="text-base sm:text-lg font-bold text-tomate">
                {formatPrice(product.final_price)}
              </p>
            </>
          ) : (
            <p className="text-base sm:text-lg font-bold text-gray-900">
              {formatPrice(product.final_price)}
            </p>
          )}
        </div>

        {/* Controles de cantidad y carrito */}
        <div className="space-y-2 sm:space-y-3">
          {/* Selector de cantidad */}
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-medium text-gray-700 flex-shrink-0">Cant:</span>
            <div className="flex items-center space-x-1 sm:space-x-2 min-w-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                disabled={quantity <= 1}
                className="h-8 w-8 sm:h-8 sm:w-8 p-0 flex-shrink-0 min-h-[44px] sm:min-h-[32px]"
              >
                <Minus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </Button>
              <span className="w-6 sm:w-12 text-center text-xs sm:text-sm font-medium flex-shrink-0">{quantity}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuantity(Math.min(product.stock_actual, quantity + 1))}
                disabled={quantity >= product.stock_actual}
                className="h-8 w-8 sm:h-8 sm:w-8 p-0 flex-shrink-0 min-h-[44px] sm:min-h-[32px]"
              >
                <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </Button>
            </div>
          </div>

          {/* Botón agregar al carrito */}
          <Button
            onClick={handleAddToCart}
            disabled={product.stock_actual === 0}
            className="w-full btn-primary h-11 sm:h-10 text-sm sm:text-sm min-h-[44px]"
          >
            <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">
              {isInCart ? `En carrito (${cartItem?.quantity})` : 'Agregar al carrito'}
            </span>
            <span className="sm:hidden">
              {isInCart ? `(${cartItem?.quantity})` : 'Agregar'}
            </span>
          </Button>
        </div>
      </div>
    </div>
  )
}