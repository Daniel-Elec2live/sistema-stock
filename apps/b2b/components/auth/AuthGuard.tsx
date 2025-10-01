'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { AlertCircle, Clock, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AuthGuardProps {
  children: React.ReactNode
  requireApproval?: boolean
}

export function AuthGuard({ children, requireApproval = false }: AuthGuardProps) {
  const { user, loading, logout } = useAuth()
  const router = useRouter()

  useEffect(() => {
    console.log('🛡️ AuthGuard - loading:', loading, 'user:', user ? 'exists' : 'null')
    if (!loading && !user) {
      console.log('🔄 AuthGuard - Redirigiendo a /login')
      router.push('/login')
    }
  }, [user, loading, router])

  // Mostrar spinner mientras carga
  if (loading) {
    console.log('⏳ AuthGuard - Loading state (showing spinner)')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[var(--color-tomate)] mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando autenticación...</p>
        </div>
      </div>
    )
  }

  // Redirigir si no está autenticado
  if (!user) {
    console.log('❌ AuthGuard - No user, returning null')
    return null // El useEffect se encarga de la redirección
  }

  console.log('✅ AuthGuard - User authenticated:', { email: user.email, isApproved: user.customer?.is_approved })

  // Verificar aprobación del cliente si es requerida
  if (requireApproval && user.customer && !user.customer.is_approved) {
    console.log('⏸️ AuthGuard - User not approved, showing pending screen')
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-16 h-16 bg-[var(--color-pan)] rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-gray-700" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Cuenta Pendiente de Aprobación
          </h2>
          
          <p className="text-gray-600 mb-6 leading-relaxed">
            Tu cuenta ha sido registrada exitosamente. Nuestro equipo está revisando 
            tu solicitud y te contactaremos pronto para activar tu acceso a la tienda.
          </p>
          
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-[var(--color-rucula)] mt-0.5 flex-shrink-0" />
              <div className="text-left">
                <p className="text-sm font-medium text-gray-900 mb-1">
                  ¿Necesitas acceso urgente?
                </p>
                <p className="text-sm text-gray-600">
                  Contacta con nuestro equipo comercial para acelerar el proceso de aprobación.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Email registrado:</span>
              <span className="font-medium text-gray-900">{user.email}</span>
            </div>
            
            {user.customer?.company_name && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Empresa:</span>
                <span className="font-medium text-gray-900">{user.customer.company_name}</span>
              </div>
            )}

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Estado:</span>
              <span className="inline-flex items-center px-2 py-1 bg-[var(--color-pan)] text-gray-900 text-xs font-medium rounded-full">
                <Clock className="w-3 h-3 mr-1" />
                Pendiente
              </span>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-4">
              ¿Esta no es tu cuenta? Puedes cerrar sesión e intentar con otra cuenta.
            </p>
            <Button 
              variant="outline" 
              onClick={logout}
              className="w-full"
            >
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Usuario autenticado y aprobado (o no se requiere aprobación)
  console.log('✅ AuthGuard - Rendering children (user approved or no approval required)')
  return <>{children}</>
}

// Componente para mostrar estado de aprobación en otros lugares
export function ApprovalStatus() {
  const { user } = useAuth()

  if (!user?.customer) {
    return null
  }

  if (user.customer.is_approved) {
    return (
      <div className="inline-flex items-center px-2 py-1 bg-[var(--color-rucula)] text-white text-xs font-medium rounded-full">
        <ShieldCheck className="w-3 h-3 mr-1" />
        Aprobado
      </div>
    )
  }

  return (
    <div className="inline-flex items-center px-2 py-1 bg-[var(--color-pan)] text-gray-900 text-xs font-medium rounded-full">
      <Clock className="w-3 h-3 mr-1" />
      Pendiente
    </div>
  )
}