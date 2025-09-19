'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { CartItem, ProductWithDiscount } from '@/lib/types'

interface CartStore {
  items: CartItem[]
  isOpen: boolean
  
  // Acciones del carrito
  addItem: (product: ProductWithDiscount, quantity?: number) => void
  removeItem: (productId: string) => void
  updateQuantity: (productId: string, quantity: number) => void
  clearCart: () => void
  
  // UI
  toggleCart: () => void
  openCart: () => void
  closeCart: () => void
  
  // Getters
  getTotalItems: () => number
  getTotalAmount: () => number
  getItem: (productId: string) => CartItem | undefined
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      isOpen: false,

      addItem: (product: ProductWithDiscount, quantity = 1) => {
        set((state) => {
          const existingItem = state.items.find(item => item.product_id === product.id)
          
          if (existingItem) {
            // Actualizar cantidad existente
            return {
              items: state.items.map(item =>
                item.product_id === product.id
                  ? { ...item, quantity: item.quantity + quantity }
                  : item
              )
            }
          } else {
            // Agregar nuevo item
            return {
              items: [...state.items, {
                product_id: product.id,
                product,
                quantity
              }]
            }
          }
        })
      },

      removeItem: (productId: string) => {
        set((state) => ({
          items: state.items.filter(item => item.product_id !== productId)
        }))
      },

      updateQuantity: (productId: string, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(productId)
          return
        }
        
        set((state) => ({
          items: state.items.map(item =>
            item.product_id === productId
              ? { ...item, quantity }
              : item
          )
        }))
      },

      clearCart: () => {
        set({ items: [] })
      },

      toggleCart: () => {
        set((state) => ({ isOpen: !state.isOpen }))
      },

      openCart: () => {
        set({ isOpen: true })
      },

      closeCart: () => {
        set({ isOpen: false })
      },

      getTotalItems: () => {
        const { items } = get()
        return items.reduce((total, item) => total + item.quantity, 0)
      },

      getTotalAmount: () => {
        const { items } = get()
        return items.reduce((total, item) => 
          total + (item.product.final_price * item.quantity), 0
        )
      },

      getItem: (productId: string) => {
        const { items } = get()
        return items.find(item => item.product_id === productId)
      }
    }),
    {
      name: 'cart-storage',
      // Solo persistir items, no el estado de UI
      partialize: (state) => ({ items: state.items })
    }
  )
)

// Provider para React (opcional, para uso en layouts)
export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>
}