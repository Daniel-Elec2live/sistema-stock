// apps/backoffice/components/dashboard/KPICard.tsx
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface KPICardProps {
  title: string
  value: string
  change: string
  trend: 'up' | 'down' | 'neutral'
  icon: LucideIcon
  variant?: 'default' | 'warning' | 'danger'
}

export function KPICard({ 
  title, 
  value, 
  change, 
  trend, 
  icon: Icon, 
  variant = 'default' 
}: KPICardProps) {
  const trendColor = {
    up: 'text-rucula',
    down: 'text-tomate',
    neutral: 'text-gray-500'
  }[trend]

  const variantStyles = {
    default: 'border-gray-200',
    warning: 'border-pan border-2',
    danger: 'border-tomate border-2'
  }[variant]

  return (
    <div className={cn(
      'bg-white rounded-lg border p-4 sm:p-6 transition-all hover:shadow-md',
      variantStyles
    )}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs sm:text-sm font-medium text-gray-600">{title}</p>
          <p className="text-xl sm:text-2xl font-semibold text-gray-900 mt-1">{value}</p>
          <p className={cn('text-xs sm:text-sm mt-1', trendColor)}>
            {change}
          </p>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <Icon className="w-6 h-6 text-gray-600" />
        </div>
      </div>
    </div>
  )
}