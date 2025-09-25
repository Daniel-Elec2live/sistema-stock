'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Users,
  Check,
  X,
  Clock,
  Mail,
  Building,
  Phone,
  MapPin,
  Percent
} from 'lucide-react'
import Link from 'next/link'

interface Customer {
  id: string
  email: string
  name: string
  company_name?: string
  phone?: string
  address?: string
  is_approved: boolean
  created_at: string
  updated_at: string
}

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all')

  useEffect(() => {
    fetchCustomers()
  }, [filter])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const params = filter !== 'all' ? `?status=${filter}` : ''
      const response = await fetch(`/api/customers${params}`)
      const data = await response.json()

      if (data.success) {
        setCustomers(data.customers)
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const approveCustomer = async (customerId: string, approved: boolean) => {
    try {
      const response = await fetch(`/api/customers/${customerId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ approved }),
      })

      if (response.ok) {
        fetchCustomers() // Refresh the list
      }
    } catch (error) {
      console.error('Error updating customer:', error)
    }
  }

  const pendingCustomers = customers.filter(c => !c.is_approved)
  const approvedCustomers = customers.filter(c => c.is_approved)

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
            <p className="text-gray-600">Cargando clientes...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6" />
            Gestión de Clientes
          </h1>
          <p className="text-gray-600 mt-1">
            Administra la aprobación y descuentos de clientes B2B
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Clientes</p>
              <p className="text-2xl font-bold">{customers.length}</p>
            </div>
            <Users className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pendientes</p>
              <p className="text-2xl font-bold text-orange-600">{pendingCustomers.length}</p>
            </div>
            <Clock className="h-8 w-8 text-orange-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Aprobados</p>
              <p className="text-2xl font-bold text-green-600">{approvedCustomers.length}</p>
            </div>
            <Check className="h-8 w-8 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={filter} onValueChange={(value) => setFilter(value as any)}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">Todos ({customers.length})</TabsTrigger>
          <TabsTrigger value="pending">Pendientes ({pendingCustomers.length})</TabsTrigger>
          <TabsTrigger value="approved">Aprobados ({approvedCustomers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value={filter}>
          {customers.length === 0 ? (
            <Card className="p-8">
              <div className="text-center text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">No hay clientes</h3>
                <p>No se encontraron clientes con los filtros seleccionados.</p>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4">
              {customers.map((customer) => (
                <CustomerCard
                  key={customer.id}
                  customer={customer}
                  onApprove={(approved) => approveCustomer(customer.id, approved)}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function CustomerCard({
  customer,
  onApprove
}: {
  customer: Customer
  onApprove: (approved: boolean) => void
}) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <h3 className="text-lg font-semibold">{customer.name}</h3>
            <Badge
              variant={customer.is_approved ? "default" : "secondary"}
              className={customer.is_approved ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}
            >
              {customer.is_approved ? 'Aprobado' : 'Pendiente'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="h-4 w-4" />
              {customer.email}
            </div>

            {customer.company_name && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Building className="h-4 w-4" />
                {customer.company_name}
              </div>
            )}

            {customer.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-4 w-4" />
                {customer.phone}
              </div>
            )}

            {customer.address && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4" />
                {customer.address}
              </div>
            )}
          </div>

          <p className="text-xs text-gray-500">
            Registrado: {new Date(customer.created_at).toLocaleDateString('es-ES')}
          </p>
        </div>

        <div className="flex flex-col gap-2 ml-4">
          {!customer.is_approved ? (
            <>
              <Button
                size="sm"
                onClick={() => onApprove(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-1" />
                Aprobar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onApprove(false)}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <X className="h-4 w-4 mr-1" />
                Rechazar
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onApprove(false)}
                className="text-red-600 border-red-200 hover:bg-red-50"
              >
                <X className="h-4 w-4 mr-1" />
                Revocar
              </Button>
            </>
          )}

          <Link href={`/clientes/${customer.id}/descuentos`}>
            <Button size="sm" variant="outline" className="w-full">
              <Percent className="h-4 w-4 mr-1" />
              Descuentos
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}