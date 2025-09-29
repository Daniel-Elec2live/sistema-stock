// apps/backoffice/components/layout/Sidebar.tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Package,
  TruckIcon,
  AlertTriangle,
  Settings,
  ChevronLeft,
  ChevronRight,
  Plus,
  Menu,
  X,
  ShoppingBag,
  Users
} from 'lucide-react'

const navigationItems = [
  {
    name: 'Dashboard',
    href: '/',
    icon: LayoutDashboard,
    description: 'Vista general'
  },
  {
    name: 'Pedidos',
    href: '/pedidos',
    icon: ShoppingBag,
    description: 'Gestión de pedidos B2B'
  },
  {
    name: 'Clientes',
    href: '/clientes',
    icon: Users,
    description: 'Gestión y aprobación de clientes'
  },
  {
    name: 'Productos',
    href: '/productos',
    icon: Package,
    description: 'Catálogo y stock'
  },
  {
    name: 'Entradas',
    href: '/entradas',
    icon: TruckIcon,
    description: 'Albaranes y OCR'
  },
  {
    name: 'Alertas',
    href: '/alertas',
    icon: AlertTriangle,
    description: 'Stock bajo y caducidades'
  },
  {
    name: 'Ajustes',
    href: '/ajustes',
    icon: Settings,
    description: 'Mermas y correcciones'
  }
]

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const pathname = usePathname()

  // Cerrar sidebar móvil al cambiar de ruta
  useEffect(() => {
    setIsMobileOpen(false)
  }, [pathname])

  // Evitar scroll del body cuando el sidebar móvil está abierto
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileOpen])

  return (
    <>
      {/* Mobile Header con hamburger menu */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white border-b border-gray-200 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="La Traviata 1999"
                width={48}
                height={48}
                className="w-12 h-12 object-contain"
              />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">La Traviata 1999</h2>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="h-9 w-9 p-0"
          >
            {isMobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Desktop + Mobile Drawer */}
      <div className={cn(
        // Desktop sidebar
        'hidden lg:flex bg-white border-r border-gray-200 flex-col transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64',
        // Mobile drawer
        'lg:relative fixed inset-y-0 left-0 z-50',
        isMobileOpen ? 'flex' : 'hidden lg:flex'
      )}>
        {/* Desktop Logo y toggle */}
        <div className="hidden lg:block p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 flex items-center justify-center">
                  <Image
                    src="/logo.png"
                    alt="La Traviata 1999"
                    width={32}
                    height={32}
                    className="w-8 h-8 object-contain"
                  />
                </div>
                <div>
                  <h2 className="font-semibold text-gray-900">La Traviata 1999</h2>
                </div>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="h-8 w-8 p-0"
            >
              {isCollapsed ? (
                <ChevronRight className="h-4 w-4" />
              ) : (
                <ChevronLeft className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Header en drawer */}
        <div className="lg:hidden p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="La Traviata 1999"
                width={48}
                height={48}
                className="w-12 h-12 object-contain"
              />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">La Traviata 1999</h2>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <div className="space-y-2">
            {navigationItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== '/' && pathname.startsWith(item.href))
              
              return (
                <Link key={item.name} href={item.href}>
                  <div
                    className={cn(
                      'flex items-center gap-3 px-3 py-3 lg:py-2 rounded-lg text-sm transition-colors',
                      isActive
                        ? 'bg-tomate text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    )}
                  >
                    <item.icon className={cn(
                      'h-5 w-5 flex-shrink-0',
                      isActive ? 'text-white' : 'text-gray-500'
                    )} />
                    {/* En móvil siempre mostrar, en desktop solo si no collapsed */}
                    <div className="flex-1 min-w-0 lg:hidden">
                      <p className="font-medium truncate">{item.name}</p>
                      <p className={cn(
                        'text-xs truncate',
                        isActive ? 'text-red-100' : 'text-gray-500'
                      )}>
                        {item.description}
                      </p>
                    </div>
                    {!isCollapsed && (
                      <div className="hidden lg:block flex-1 min-w-0">
                        <p className="font-medium truncate">{item.name}</p>
                        <p className={cn(
                          'text-xs truncate',
                          isActive ? 'text-red-100' : 'text-gray-500'
                        )}>
                          {item.description}
                        </p>
                      </div>
                    )}
                  </div>
                </Link>
              )
            })}
          </div>
        </nav>

        {/* Quick Actions Mobile - siempre visible */}
        <div className="lg:hidden p-4 border-t border-gray-200">
          <div className="space-y-2">
            <Link href="/productos/nuevo">
              <Button className="w-full bg-tomate hover:bg-tomate/90 h-11">
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Producto
              </Button>
            </Link>
          </div>
        </div>

        {/* Quick Actions Desktop - solo si no collapsed */}
        {!isCollapsed && (
          <div className="hidden lg:block p-4 border-t border-gray-200">
            <div className="space-y-2">
              <Link href="/productos/nuevo">
                <Button className="w-full bg-tomate hover:bg-tomate/90" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Producto
                </Button>
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  )
}