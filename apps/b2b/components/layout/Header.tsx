'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter, usePathname } from 'next/navigation'
import { Search, ShoppingCart, User, Menu, X } from 'lucide-react'
import { useCartStore } from '@/stores/cartStore'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const router = useRouter()
  const pathname = usePathname()

  const { openCart, getTotalItems } = useCartStore()
  const { user, logout } = useAuth()

  const totalItems = getTotalItems()

  // Solo mostrar búsqueda en la página de catálogo
  const showSearch = pathname === '/catalogo'

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/catalogo?search=${encodeURIComponent(searchQuery.trim())}`)
      setSearchQuery('')
    }
  }

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/catalogo" className="flex items-center space-x-2 flex-shrink-0">
            <div className="w-10 h-10 flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="La Traviata 1999"
                width={40}
                height={40}
                className="w-10 h-10 object-contain"
              />
            </div>
            <span className="font-bold text-base sm:text-lg text-gray-900 hidden xs:block">
              La Traviata 1999
            </span>
          </Link>

          {/* Búsqueda - Desktop */}
          {showSearch && (
            <form onSubmit={handleSearch} className="hidden md:flex items-center flex-1 max-w-md mx-8">
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  type="text"
                  placeholder="Buscar productos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 w-full"
                />
              </div>
            </form>
          )}

          {/* Navegación - Desktop */}
          <div className="hidden md:flex items-center space-x-6">
            <Link 
              href="/catalogo" 
              className="text-gray-700 hover:text-[var(--color-tomate)] font-medium"
            >
              Catálogo
            </Link>
            <Link 
              href="/pedidos" 
              className="text-gray-700 hover:text-[var(--color-tomate)] font-medium"
            >
              Mis Pedidos
            </Link>
          </div>

          {/* Acciones de usuario */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            
            {/* Carrito */}
            <Button
              variant="ghost"
              size="sm"
              onClick={openCart}
              className="relative p-2 hover:bg-gray-100"
            >
              <ShoppingCart className="w-6 h-6 text-gray-700" />
              {totalItems > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-tomate text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 z-10 border-2 border-white shadow-sm">
                  {totalItems > 99 ? '99+' : totalItems}
                </span>
              )}
            </Button>

            {/* Usuario - Desktop */}
            <div className="hidden md:block">
              {user ? (
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-700">
                    Hola, {user.customer?.name?.split(' ')[0] || 'Usuario'}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={logout}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    Salir
                  </Button>
                </div>
              ) : (
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    <User className="w-4 h-4 mr-2" />
                    Entrar
                  </Button>
                </Link>
              )}
            </div>

            {/* Menú móvil */}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleMenu}
              className="md:hidden p-1.5"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Búsqueda móvil */}
        {showSearch && (
          <div className="md:hidden px-4 sm:px-6 pb-4">
            <form onSubmit={handleSearch} className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Buscar productos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 w-full"
              />
            </form>
          </div>
        )}
      </div>

      {/* Menú móvil desplegable */}
      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200">
          <div className="px-4 sm:px-6 py-3 space-y-3">
            <Link
              href="/catalogo"
              onClick={() => setIsMenuOpen(false)}
              className="block py-2 text-gray-700 hover:text-tomate"
            >
              Catálogo
            </Link>
            <Link
              href="/pedidos"
              onClick={() => setIsMenuOpen(false)}
              className="block py-2 text-gray-700 hover:text-tomate"
            >
              Mis Pedidos
            </Link>
            
            {user ? (
              <div className="pt-2 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-2">
                  {user.customer?.name || user.email}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    logout()
                    setIsMenuOpen(false)
                  }}
                  className="text-gray-500"
                >
                  Cerrar sesión
                </Button>
              </div>
            ) : (
              <div className="pt-2 border-t border-gray-200">
                <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <User className="w-4 h-4 mr-2" />
                    Iniciar sesión
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}