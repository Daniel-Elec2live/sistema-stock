'use client'

import { Badge } from '@/components/ui/badge'

interface StockIndicatorProps {
  stock: number
  minStock: number
  size?: 'sm' | 'md' | 'lg'
  showQuantity?: boolean
}

export function StockIndicator({ 
  stock, 
  minStock, 
  size = 'sm', 
  showQuantity = true 
}: StockIndicatorProps) {
  
  const getStockStatus = () => {
    if (stock === 0) {
      return {
        label: 'Sin stock',
        variant: 'destructive' as const,
        className: 'badge-stock-bajo'
      }
    }
    
    if (stock <= minStock) {
      return {
        label: showQuantity ? `Stock bajo (${stock})` : 'Stock bajo',
        variant: 'secondary' as const,
        className: 'badge-stock-medio'
      }
    }
    
    if (stock <= minStock * 2) {
      return {
        label: showQuantity ? `Stock medio (${stock})` : 'Stock medio',
        variant: 'secondary' as const,
        className: 'badge-stock-medio'
      }
    }
    
    return {
      label: showQuantity ? `En stock (${stock})` : 'En stock',
      variant: 'secondary' as const,
      className: 'badge-stock-alto'
    }
  }

  const stockStatus = getStockStatus()
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1',
    lg: 'text-base px-4 py-2'
  }

  return (
    <Badge 
      variant={stockStatus.variant}
      className={`${stockStatus.className} ${sizeClasses[size]} font-medium`}
    >
      {stockStatus.label}
    </Badge>
  )
}