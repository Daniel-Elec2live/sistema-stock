'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from '@/components/ui/toast'
import { 
  Eye, 
  EyeOff, 
  UserPlus, 
  Mail, 
  Lock, 
  User, 
  Building, 
  Phone, 
  MapPin 
} from 'lucide-react'

export function RegisterForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    company_name: '',
    phone: '',
    address: ''
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const { register } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validaciones básicas
    if (!formData.email || !formData.password || !formData.name) {
      toast({
        title: "Error",
        description: "Por favor completa todos los campos obligatorios",
        variant: "destructive"
      })
      return
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive"
      })
      return
    }

    if (formData.password.length < 6) {
      toast({
        title: "Error",
        description: "La contraseña debe tener al menos 6 caracteres",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    
    try {
      const result = await register(formData)
      
      if (result.success) {
        toast({
          title: "¡Registro exitoso!",
          description: "Tu cuenta ha sido creada. Te contactaremos pronto para activar tu acceso.",
        })
        router.push('/login?registered=true')
      } else {
        toast({
          title: "Error en el registro",
          description: result.error || "No se pudo crear la cuenta",
          variant: "destructive"
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error de conexión. Intenta de nuevo.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        
        {/* Header */}
        <div className="text-center">
          <div className="w-56 h-16 bg-tomate rounded-full flex items-center justify-center mx-auto mb-8">
            <span className="text-white font-bold text-3xl">La Traviata</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">
            Crear cuenta B2B
          </h2>
          <p className="mt-2 text-gray-600">
            Regístrate para acceder a nuestra tienda profesional
          </p>
        </div>

        {/* Formulario */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="pl-10"
                  placeholder="tu@empresa.com"
                  value={formData.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Nombre */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre completo *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  autoComplete="name"
                  required
                  className="pl-10"
                  placeholder="Juan Pérez"
                  value={formData.name}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Empresa */}
            <div>
              <label htmlFor="company_name" className="block text-sm font-medium text-gray-700 mb-1">
                Nombre de la empresa
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Building className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="company_name"
                  name="company_name"
                  type="text"
                  autoComplete="organization"
                  className="pl-10"
                  placeholder="Restaurante El Buen Sabor"
                  value={formData.company_name}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Teléfono */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  className="pl-10"
                  placeholder="+34 666 123 456"
                  value={formData.phone}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Dirección */}
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                Dirección
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="address"
                  name="address"
                  type="text"
                  autoComplete="address-line1"
                  className="pl-10"
                  placeholder="Calle Principal 123, Madrid"
                  value={formData.address}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Contraseña */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="pl-10 pr-10"
                  placeholder="Mínimo 6 caracteres"
                  value={formData.password}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar contraseña *
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  required
                  className="pl-10 pr-10"
                  placeholder="Repite tu contraseña"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Términos y condiciones */}
          <div className="flex items-center">
            <input
              id="terms"
              name="terms"
              type="checkbox"
              required
              className="h-4 w-4 text-[var(--color-tomate)] focus:ring-[var(--color-tomate)] border-gray-300 rounded"
            />
            <label htmlFor="terms" className="ml-2 block text-sm text-gray-700">
              Acepto los{' '}
              <Link href="/terminos" className="text-[var(--color-tomate)] hover:text-[var(--color-tomate)]/80">
                términos y condiciones
              </Link>
              {' '}y la{' '}
              <Link href="/privacidad" className="text-[var(--color-tomate)] hover:text-[var(--color-tomate)]/80">
                política de privacidad
              </Link>
            </label>
          </div>

          {/* Botón de envío */}
          <Button
            type="submit"
            disabled={loading}
            className="w-full btn-primary relative"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Creando cuenta...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                Crear cuenta
              </>
            )}
          </Button>

          {/* Link a login */}
          <div className="text-center">
            <p className="text-sm text-gray-600">
              ¿Ya tienes cuenta?{' '}
              <Link href="/login" className="text-[var(--color-tomate)] hover:text-[var(--color-tomate)]/80 font-medium">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </form>

        {/* Footer informativo */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <h3 className="text-sm font-semibold text-blue-900 mb-2">Proceso de aprobación</h3>
          <ul className="text-xs text-blue-800 space-y-1">
            <li>• Revisaremos tu solicitud en 24-48 horas</li>
            <li>• Te contactaremos para verificar tu información</li>
            <li>• Una vez aprobado, podrás realizar pedidos</li>
            <li>• Los campos marcados con * son obligatorios</li>
          </ul>
        </div>
      </div>
    </div>
  )
}