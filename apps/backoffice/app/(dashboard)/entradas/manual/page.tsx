'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EntryForm } from '@/components/entries/EntryForm'
import { Button } from '@/components/ui/button'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface EntryFormData {
  proveedor: string
  fecha: string
  productos: Array<{
    nombre: string
    cantidad: number
    precio: number
    unidad: string
    caducidad?: string
  }>
}

export default function ManualEntryPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const router = useRouter()

  const handleSubmit = async (data: EntryFormData) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'manual',
          ...data,
          estado: 'completada'
        })
      })

      if (!response.ok) {
        throw new Error('Error al guardar entrada')
      }

      // Redirigir al listado de entradas
      router.push('/entradas?success=entrada-creada')
    } catch (error) {
      console.error('Error:', error)
      // TODO: Mostrar toast de error
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/entradas">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Nueva Entrada Manual
          </h1>
          <p className="text-gray-600">
            Registra productos manualmente especificando cantidades y precios
          </p>
        </div>
      </div>

      {/* Form */}
      <EntryForm 
        onSubmit={handleSubmit}
        initialData={{
          fecha: new Date().toISOString().split('T')[0]
        }}
      />

      {isSubmitting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="animate-spin w-5 h-5 border-2 border-[#a21813] border-t-transparent rounded-full"></div>
              <p>Guardando entrada...</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}