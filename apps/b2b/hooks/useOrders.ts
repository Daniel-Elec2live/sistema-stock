'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Order, OrderStatus } from '@/lib/types'
import { useAuth } from './useAuth'

// Cache simple para evitar llamadas innecesarias
const ordersCache = new Map<string, { data: Order[], timestamp: number }>()
const CACHE_DURATION = 30000 // 30 segundos

// Función para invalidar cache (útil después de crear/modificar pedidos)
export const invalidateOrdersCache = () => {
  ordersCache.clear()
}

interface UseOrdersReturn {
  orders: Order[]
  loading: boolean
  error: string | null
  refresh: () => void
  getOrder: (orderId: string) => Promise<Order>
  cancelOrder: (orderId: string, reason?: string) => Promise<boolean>
}

interface OrderFilters {
  status?: OrderStatus
  limit?: number
  offset?: number
}

export function useOrders(filters?: OrderFilters): UseOrdersReturn {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { token } = useAuth()

  const fetchOrders = useCallback(async (forceRefresh = false) => {
    if (!token) {
      setError('No hay token de autenticación')
      setLoading(false)
      return
    }

    // Crear cache key basado en los filtros
    const cacheKey = JSON.stringify({
      token: token.slice(-8), // Solo últimos 8 chars por seguridad
      filters
    })

    // Verificar cache si no es refresh forzado
    if (!forceRefresh) {
      const cached = ordersCache.get(cacheKey)
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setOrders(cached.data)
        setLoading(false)
        return
      }
    }

    try {
      setLoading(true)
      setError(null)

      // Construir query params
      const params = new URLSearchParams()

      if (filters?.status) params.append('status', filters.status)
      if (filters?.limit) params.append('limit', filters.limit.toString())
      if (filters?.offset) params.append('offset', filters.offset.toString())

      const url = `/api/orders${params.toString() ? `?${params.toString()}` : ''}`

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al cargar pedidos')
      }

      const data = await response.json()

      if (data.success) {
        setOrders(data.data)
        // Guardar en cache
        ordersCache.set(cacheKey, {
          data: data.data,
          timestamp: Date.now()
        })
      } else {
        throw new Error(data.error || 'Error desconocido')
      }

    } catch (err) {
      console.error('Error fetching orders:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar pedidos')
    } finally {
      setLoading(false)
    }
  }, [token, filters])

  const getOrder = useCallback(async (orderId: string): Promise<Order> => {
    if (!token) {
      throw new Error('No hay token de autenticación')
    }

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al cargar pedido')
      }

      const data = await response.json()
      
      if (data.success) {
        return data.data
      } else {
        throw new Error(data.error || 'Pedido no encontrado')
      }

    } catch (err) {
      console.error('Error fetching order:', err)
      throw err
    }
  }, [token])

  const cancelOrder = useCallback(async (orderId: string, reason?: string): Promise<boolean> => {
    if (!token) {
      throw new Error('No hay token de autenticación')
    }

    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al cancelar pedido')
      }

      const data = await response.json()
      
      if (data.success) {
        // Invalidar cache para forzar refresh
        ordersCache.clear()

        // Actualizar la lista local de pedidos
        setOrders(prev => prev.map(order =>
          order.id === orderId
            ? { ...order, status: 'cancelled' as OrderStatus }
            : order
        ))
        return true
      } else {
        throw new Error(data.error || 'Error al cancelar pedido')
      }

    } catch (err) {
      console.error('Error canceling order:', err)
      throw err
    }
  }, [token])

  const refresh = useCallback(() => {
    fetchOrders(true) // Forzar refresh
  }, [fetchOrders])

  // Cargar pedidos al montar el componente
  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

  return {
    orders,
    loading,
    error,
    refresh,
    getOrder,
    cancelOrder
  }
}

// Hook especializado para estadísticas de pedidos
export function useOrderStats(orders?: Order[], loading?: boolean) {
  // Permitir pasar orders desde el hook padre para evitar duplicación
  const { orders: hookOrders, loading: hookLoading } = useOrders()

  const ordersToUse = orders || hookOrders
  const loadingToUse = loading !== undefined ? loading : hookLoading

  const stats = {
    total: ordersToUse.length,
    pending: ordersToUse.filter(o => o.status === 'pending').length,
    prepared: ordersToUse.filter(o => o.status === 'prepared').length,
    delivered: ordersToUse.filter(o => o.status === 'delivered').length,
    cancelled: ordersToUse.filter(o => o.status === 'cancelled').length,
    withBackorders: ordersToUse.filter(o => o.has_backorder).length,
    totalAmount: ordersToUse
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.total_amount, 0)
  }

  return {
    stats,
    loading: loadingToUse
  }
}

// Hook para obtener el estado de un pedido específico
export function useOrderStatus(orderId: string) {
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { token } = useAuth()

  useEffect(() => {
    if (!orderId || !token) {
      setLoading(false)
      return
    }

    const fetchOrderStatus = async () => {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(`/api/orders/${orderId}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Error al cargar estado del pedido')
        }

        const data = await response.json()
        
        if (data.success) {
          setOrder(data.data)
        } else {
          throw new Error(data.error || 'Pedido no encontrado')
        }

      } catch (err) {
        console.error('Error fetching order status:', err)
        setError(err instanceof Error ? err.message : 'Error al cargar estado del pedido')
      } finally {
        setLoading(false)
      }
    }

    fetchOrderStatus()
  }, [orderId, token])

  // Efecto separado para el polling basado en el estado del pedido
  useEffect(() => {
    if (!order || !orderId || !token) return

    // Solo hacer polling para pedidos que pueden cambiar de estado
    if (order.status === 'pending' || order.status === 'prepared') {
      // Polling cada 2 minutos solo para pedidos activos
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/orders/${orderId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })

          if (response.ok) {
            const data = await response.json()
            if (data.success) {
              setOrder(data.data)
            }
          }
        } catch (err) {
          console.warn('Error en polling de pedido:', err)
        }
      }, 120000)

      return () => clearInterval(interval)
    }
  }, [order?.status, orderId, token])

  return { order, loading, error }
}