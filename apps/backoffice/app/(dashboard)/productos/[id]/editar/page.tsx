// apps/backoffice/app/(dashboard)/productos/[id]/editar/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ProductForm } from '@/components/products/ProductForm'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { ArrowLeft, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { Product } from '@/lib/types'

interface EditProductPageProps {
  params: { id: string }
}

export default function EditProductPage({ params }: EditProductPageProps) {
  const router = useRouter()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await fetch(`/api/products/${params.id}`)
        if (response.ok) {
          const data = await response.json()
          setProduct(data.product)
        } else {
          router.push('/productos')
        }
      } catch (error) {
        console.error('Error fetching product:', error)
        router.push('/productos')
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [params.id, router])

  const handleSubmit = async (data: Partial<Product>) => {
    setIsSubmitting(true)
    try {
      const response = await fetch(`/api/products/${params.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })

      if (response.ok) {
        router.push('/productos')
        // TODO: Mostrar toast de éxito
      } else {
        const error = await response.json()
        console.error('Error updating product:', error)
        // TODO: Mostrar toast de error
      }
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      return
    }

    try {
      const response = await fetch(`/api/products/${params.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/productos')
        // TODO: Mostrar toast de éxito
      } else {
        // TODO: Mostrar toast de error
      }
    } catch (error) {
      console.error('Error deleting product:', error)
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="p-6 max-w-4xl mx-auto text-center">
        <p className="text-gray-600">Producto no encontrado</p>
        <Link href="/productos">
          <Button className="mt-4">Volver a Productos</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/productos">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Editar Producto
            </h1>
            <p className="text-gray-600">
              {product.nombre}
            </p>
          </div>
        </div>
        
        <Button
          variant="outline"
          onClick={handleDelete}
          className="text-red-600 border-red-300 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Eliminar
        </Button>
      </div>

      {/* Form */}
      <Card className="p-6">
        <ProductForm
          initialData={product}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          isEditing={true}
        />
      </Card>
    </div>
  )
}