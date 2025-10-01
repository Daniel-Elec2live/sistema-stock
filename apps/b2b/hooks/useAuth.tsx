'use client'

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { useRouter } from 'next/navigation'
import { AuthUser, Customer } from '@/lib/types'

interface AuthContextType {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  register: (userData: RegisterData) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  refreshUser: () => Promise<void>
  token: string | null
}

interface RegisterData {
  email: string
  password: string
  confirmPassword: string
  name: string
  company_name?: string
  phone?: string
  address?: string
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState<string | null>(null)
  const router = useRouter()

  // Cargar usuario desde cookie HTTP-only al iniciar
  useEffect(() => {
    console.log('🔄 useAuth - Initial load, fetching user from HTTP-only cookie...')
    fetchUser()
  }, [])

  const fetchUser = async () => {
    try {
      console.log('📡 useAuth - Calling /api/auth/me (cookie enviada automáticamente)')

      // La cookie HTTP-only se envía automáticamente con el request
      // NO necesitamos leerla desde JavaScript ni pasarla en headers
      const response = await fetch('/api/auth/me', {
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include' // Importante: incluir cookies en el request
      })

      console.log('📥 useAuth - /api/auth/me response:', response.status, response.ok ? 'OK' : 'ERROR')

      if (response.ok) {
        const data = await response.json()
        console.log('✅ useAuth - User data received:', data.success ? 'success' : 'failed')

        if (data.success) {
          setUser(data.data.user)
          // Guardar token en localStorage solo para uso en otros endpoints
          // (la autenticación real viene de la cookie HTTP-only)
          if (data.data.token) {
            localStorage.setItem('auth_token', data.data.token)
            setToken(data.data.token)
          }
        } else {
          console.log('❌ useAuth - Session invalid')
          setToken(null)
          setUser(null)
        }
      } else {
        console.log('❌ useAuth - No valid session (no cookie or expired)')
        setToken(null)
        setUser(null)
      }
    } catch (error) {
      console.error('❌ useAuth - Error fetching user:', error)
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
      console.log('✅ useAuth - Initial load completed')
    }
  }

  const login = useCallback(async (email: string, password: string) => {
    try {
      setLoading(true)
      
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (data.success) {
        console.log('✅ Login successful, setting up auth state...')
        const { token: newToken, user: userData } = data.data

        // Guardar en localStorage para lectura cliente
        // NOTA: La cookie la establece el servidor (HTTP-only, más seguro)
        localStorage.setItem('auth_token', newToken)

        setToken(newToken)
        setUser(userData)

        console.log('👤 User set in context:', userData)
        console.log('🍪 Cookie establecida por servidor (HTTP-only)')
        return { success: true }
      } else {
        console.log('❌ Login failed:', data.error)
        return { success: false, error: data.error || 'Error de autenticación' }
      }
    } catch (error) {
      console.error('Login error:', error)
      return { success: false, error: 'Error de conexión' }
    } finally {
      setLoading(false)
    }
  }, [])

  const register = useCallback(async (userData: RegisterData) => {
    try {
      setLoading(true)
      console.log('🚀 useAuth register called with:', userData)
      
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(userData)
      })

      console.log('📡 Response status:', response.status)
      const data = await response.json()
      console.log('📝 Response data:', data)

      if (data.success) {
        return { success: true }
      } else {
        return { success: false, error: data.error || 'Error en el registro' }
      }
    } catch (error) {
      console.error('❌ Register error:', error)
      return { success: false, error: 'Error de conexión' }
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('auth_token')
    // Nota: No podemos limpiar cookie HTTP-only desde JavaScript
    // El servidor debe tener un endpoint /api/auth/logout para invalidarla
    setToken(null)
    setUser(null)
    router.push('/login')
  }, [router])

  const refreshUser = useCallback(async () => {
    await fetchUser()
  }, [])

  const value: AuthContextType = {
    user,
    loading,
    login,
    register,
    logout,
    refreshUser,
    token
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}