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

  // Cargar token y usuario desde localStorage/cookies al iniciar
  useEffect(() => {
    let savedToken = localStorage.getItem('auth_token')

    // Si no hay token en localStorage, intentar obtenerlo de las cookies
    if (!savedToken) {
      const cookies = document.cookie.split(';')
      const authCookie = cookies.find(cookie => cookie.trim().startsWith('auth_token='))
      if (authCookie) {
        savedToken = authCookie.split('=')[1]
        // Sincronizar a localStorage para futuras sesiones
        localStorage.setItem('auth_token', savedToken)
      }
    }

    if (savedToken) {
      setToken(savedToken)
      fetchUser(savedToken)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUser = async (authToken: string) => {
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setUser(data.data.user)
        } else {
          // Token inválido
          localStorage.removeItem('auth_token')
          document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
          setToken(null)
        }
      } else {
        // Error de servidor o token inválido
        localStorage.removeItem('auth_token')
        document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        setToken(null)
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      localStorage.removeItem('auth_token')
      document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
      setToken(null)
    } finally {
      setLoading(false)
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
        
        // Guardar en localStorage Y en cookies para el middleware
        localStorage.setItem('auth_token', newToken)
        document.cookie = `auth_token=${newToken}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax` // 7 días
        
        setToken(newToken)
        setUser(userData)
        
        console.log('👤 User set in context:', userData)
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
    // Limpiar cookie también
    document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
    setToken(null)
    setUser(null)
    router.push('/login')
  }, [router])

  const refreshUser = useCallback(async () => {
    if (token) {
      await fetchUser(token)
    }
  }, [token])

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