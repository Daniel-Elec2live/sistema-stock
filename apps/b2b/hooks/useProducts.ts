'use client'

import { useState, useEffect, useCallback } from 'react'
import { ProductWithDiscount, ProductFilters } from '@/lib/types'
import { useAuth } from './useAuth'

interface UseProductsReturn {
  products: ProductWithDiscount[] | null
  loading: boolean
  error: string | null
  refresh: () => void
  addToCart: (productId: string, quantity?: number) => void
}

export function useProducts(filters?: ProductFilters): UseProductsReturn {
  const [products, setProducts] = useState<ProductWithDiscount[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { token } = useAuth()

  const fetchProducts = useCallback(async () => {
    if (!token) {
      setError('No hay token de autenticación')
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      // Construir query params
      const params = new URLSearchParams()

      if (filters?.search) params.append('search', filters.search)
      if (filters?.categoria) params.append('categoria', filters.categoria)
      if (filters?.min_precio) params.append('min_precio', filters.min_precio.toString())
      if (filters?.max_precio) params.append('max_precio', filters.max_precio.toString())
      if (filters?.solo_con_stock) params.append('solo_con_stock', 'true')
      if (filters?.ordenar_por) params.append('ordenar_por', filters.ordenar_por)
      if (filters?.orden) params.append('orden', filters.orden)

      const url = `/api/stock${params.toString() ? `?${params.toString()}` : ''}`
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al cargar productos')
      }

      const data = await response.json()
      
      if (data.success) {
        setProducts(data.data)
      } else {
        throw new Error(data.error || 'Error desconocido')
      }

    } catch (err) {
      console.error('Error fetching products:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar productos')
    } finally {
      setLoading(false)
    }
  }, [token, filters])

  const refresh = useCallback(() => {
    fetchProducts()
  }, [fetchProducts])

  // Función helper para agregar al carrito
  const addToCart = useCallback((productId: string, quantity = 1) => {
    // Esta función se puede usar desde otros componentes
    // La lógica real está en el store del carrito
    console.log(`Adding ${quantity} of product ${productId} to cart`)
  }, [])

  // Efecto para cargar productos cuando cambian los filtros
  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  // Efecto para recargar cada 5 minutos (stock actualizado pero menos agresivo)
  useEffect(() => {
    if (!loading && products) {
      const interval = setInterval(() => {
        fetchProducts()
      }, 300000) // 5 minutos

      return () => clearInterval(interval)
    }
  }, [loading, products, fetchProducts])

  return {
    products,
    loading,
    error,
    refresh,
    addToCart
  }
}

// Hook especializado para un producto individual
export function useProduct(productId: string) {
  const [product, setProduct] = useState<ProductWithDiscount | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { token } = useAuth()

  useEffect(() => {
    if (!productId || !token) {
      setLoading(false)
      return
    }

    const fetchProduct = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/products/${productId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Error al cargar producto')
        }

        const data = await response.json()
        
        if (data.success) {
          setProduct(data.data)
        } else {
          throw new Error(data.error || 'Producto no encontrado')
        }

      } catch (err) {
        console.error('Error fetching product:', err)
        setError(err instanceof Error ? err.message : 'Error al cargar producto')
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [productId, token])

  return { product, loading, error }
}