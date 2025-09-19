'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { useProduct } from '@/hooks/useProducts'
import { useCartStore } from '@/stores/cartStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { StockIndicator } from '@/components/tienda/StockIndicator'
import { toast } from '@/components/ui/toast'
import { 
  ShoppingCart, 
  Plus, 
  Minus, 
  ArrowLeft,
  Share2,
  Heart,
  Package,
  Calendar,
  Tag
} from 'lucide-react'

export default function ProductoPage() {
  const params = useParams()
  const productId = params.id as string
  
  const { product, loading, error } = useProduct(productId)
  const { addItem, getItem, openCart } = useCartStore()
  const [quantity, setQuantity] = useState(1)

  const cartItem = getItem(productId)

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(price)
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return null
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long'
    })
  }

  const handleAddToCart = () => {
    if (!product) return
    
    addItem(product, quantity)
    toast({
      title: "Producto agregado",
      description: `${product.name} se agregó al carrito`,
    })
    setQuantity(1)
  }

  const handleBuyNow = () => {
    if (!product) return
    
    addItem(product, quantity)
    openCart()
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product?.name,
          text: `Mira este producto en La Traviata 1999`,
          url: window.location.href
        })
      } catch (error) {
        // Fallback a copiar URL
        navigator.clipboard.writeText(window.location.href)
        toast({
          title: "URL copiada",
          description: "El enlace del producto se copió al portapapeles"
        })
      }
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast({
        title: "URL copiada",
        description: "El enlace del producto se copió al portapapeles"
      })
    }
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="aspect-square bg-gray-200 rounded-lg"></div>
            <div className="space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-6 bg-gray-200 rounded w-1/4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Producto no encontrado</h1>
          <p className="text-gray-600 mb-6">{error || 'El producto solicitado no existe'}</p>
          <Link href="/catalogo">
            <Button className="btn-primary">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al catálogo
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* Breadcrumb */}
      <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-8">
        <Link href="/catalogo" className="hover:text-[var(--color-tomate)]">
          Catálogo
        </Link>
        <span>/</span>
        {product.category && (
          <>
            <Link 
              href={`/catalogo?category=${product.category}`}
              className="hover:text-[var(--color-tomate)] capitalize"
            >
              {product.category}
            </Link>
            <span>/</span>
          </>
        )}
        <span className="text-gray-900 font-medium">{product.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        
        {/* Imagen del producto */}
        <div className="space-y-4">
          <div className="aspect-square relative overflow-hidden rounded-lg bg-gray-100">
            <Image
              src={product.image_url || '/placeholder-product.svg'}
              alt={product.name || product.nombre || 'Producto'}
              fill
              className="object-cover"
              priority
            />
            
            {/* Badge de descuento */}
            {product.discount_percentage > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute top-4 left-4 text-sm font-bold"
              >
                -{product.discount_percentage}% OFF
              </Badge>
            )}
          </div>
          
          {/* Galería adicional (placeholder para futuro) */}
          <div className="hidden sm:grid grid-cols-4 gap-2">
            {[...Array(4)].map((_, i) => (
              <div 
                key={i} 
                className="aspect-square bg-gray-100 rounded-md opacity-50 cursor-not-allowed"
              />
            ))}
          </div>
        </div>

        {/* Información del producto */}
        <div className="space-y-6">
          
          {/* Header */}
          <div>
            {product.brand && (
              <p className="text-sm text-gray-600 mb-2">{product.brand}</p>
            )}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {product.name}
            </h1>
            
            <div className="flex items-center space-x-4 mb-4">
              <StockIndicator 
                stock={product.stock_quantity} 
                minStock={product.min_stock}
                size="md"
                showQuantity={true}
              />
              
              {product.approx_expiry && (
                <div className="flex items-center text-sm text-gray-600">
                  <Calendar className="w-4 h-4 mr-1" />
                  Caduca: {formatDate(product.approx_expiry)}
                </div>
              )}
            </div>
          </div>

          {/* Precio */}
          <div className="border-t border-b border-gray-200 py-6">
            {product.discount_percentage > 0 ? (
              <div className="space-y-2">
                <p className="text-2xl text-gray-500 line-through">
                  {formatPrice(product.price)}
                </p>
                <div className="flex items-center space-x-3">
                  <p className="text-4xl font-bold text-[var(--color-tomate)]">
                    {formatPrice(product.final_price)}
                  </p>
                  <Badge variant="destructive" className="text-sm">
                    Ahorras {formatPrice(product.price - product.final_price)}
                  </Badge>
                </div>
              </div>
            ) : (
              <p className="text-4xl font-bold text-gray-900">
                {formatPrice(product.final_price)}
              </p>
            )}
            
            <p className="text-sm text-gray-600 mt-2">
              Precio con descuentos aplicados • IVA incluido
            </p>
          </div>

          {/* Descripción */}
          {product.description && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Descripción</h3>
              <p className="text-gray-700 leading-relaxed">{product.description}</p>
            </div>
          )}

          {/* Información adicional */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {product.category && (
              <div className="flex items-center space-x-2">
                <Tag className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600">Categoría:</span>
                <span className="font-medium capitalize">{product.category}</span>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">Stock disponible:</span>
              <span className="font-medium">{product.stock_quantity} unidades</span>
            </div>
          </div>

          {/* Controles de compra */}
          <div className="space-y-6 border-t border-gray-200 pt-6">
            
            {/* Selector de cantidad */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cantidad
              </label>
              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                
                <div className="w-20 text-center">
                  <input
                    type="number"
                    min="1"
                    max={product.stock_quantity}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Math.min(product.stock_quantity, parseInt(e.target.value) || 1)))}
                    className="w-full text-center border border-gray-300 rounded-md py-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-tomate)]"
                  />
                </div>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))}
                  disabled={quantity >= product.stock_quantity}
                >
                  <Plus className="w-4 h-4" />
                </Button>
                
                <span className="text-sm text-gray-600">
                  de {product.stock_quantity} disponibles
                </span>
              </div>
            </div>

            {/* Subtotal */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-gray-900">Subtotal:</span>
                <span className="text-2xl font-bold text-[var(--color-tomate)]">
                  {formatPrice(product.final_price * quantity)}
                </span>
              </div>
              {quantity > 1 && (
                <p className="text-sm text-gray-600 mt-1">
                  {quantity} × {formatPrice(product.final_price)}
                </p>
              )}
            </div>

            {/* Botones de acción */}
            <div className="space-y-3">
              <Button
                onClick={handleBuyNow}
                disabled={product.stock_quantity === 0}
                className="w-full btn-primary"
                size="lg"
              >
                <ShoppingCart className="w-5 h-5 mr-2" />
                Comprar ahora
              </Button>
              
              <Button
                onClick={handleAddToCart}
                disabled={product.stock_quantity === 0}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Plus className="w-5 h-5 mr-2" />
                {cartItem ? `En carrito (${cartItem.quantity})` : 'Agregar al carrito'}
              </Button>
            </div>

            {/* Acciones secundarias */}
            <div className="flex justify-center space-x-4 pt-4 border-t border-gray-200">
              <Button variant="ghost" size="sm" onClick={handleShare}>
                <Share2 className="w-4 h-4 mr-2" />
                Compartir
              </Button>
              
              <Button variant="ghost" size="sm">
                <Heart className="w-4 h-4 mr-2" />
                Favoritos
              </Button>
            </div>

            {/* Aviso de stock bajo */}
            {product.stock_quantity > 0 && product.stock_quantity <= product.min_stock && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <p className="text-sm text-amber-800">
                  ⚠️ <strong>¡Últimas unidades!</strong> Solo quedan {product.stock_quantity} en stock.
                </p>
              </div>
            )}

            {/* Producto agotado */}
            {product.stock_quantity === 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-800">
                  😞 <strong>Producto agotado.</strong> Te notificaremos cuando vuelva a estar disponible.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Productos relacionados (placeholder para futuro) */}
      <div className="mt-16 border-t border-gray-200 pt-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Productos relacionados</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-gray-100 aspect-square rounded-lg opacity-50 flex items-center justify-center">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}