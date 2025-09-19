// apps/backoffice/app/(dashboard)/productos/nuevo/page.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ProductForm } from '@/components/products/ProductForm'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Product } from '@/lib/types'

export default function NuevoProductoPage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (data: Partial<Product>) => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        router.push('/productos')
        // TODO: Mostrar toast de éxito
      } else {
        const error = await response.json()
        console.error('Error creating product:', error)
        // TODO: Mostrar toast de error
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-4 lg:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <Link href="/productos">
          <Button variant="ghost" size="sm" className="w-full sm:w-auto h-11 lg:h-9">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">
            Nuevo Producto
          </h1>
          <p className="text-gray-600 text-sm lg:text-base">
            Añade un nuevo producto al catálogo
          </p>
        </div>
      </div>

      {/* Form */}
      <Card className="p-4 lg:p-6">
        <ProductForm 
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </Card>
    </div>
  )
}