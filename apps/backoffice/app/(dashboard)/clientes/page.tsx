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
  rejected_at?: string
  created_at: string
  updated_at: string
}

export default function ClientesPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]) // Para contadores
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all')

  useEffect(() => {
    fetchCustomers()
  }, [filter])

  const fetchCustomers = async () => {
    try {
      setLoading(true)
      const params = filter !== 'all' ? `?status=${filter}` : ''
      // Forzar bypass de cache con timestamp
      const cacheParam = params ? '&' : '?'
      const response = await fetch(`/api/customers${params}${cacheParam}_t=${Date.now()}`, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      })
      const data = await response.json()

      if (data.success) {
        // Guardar todos los clientes para contadores
        setAllCustomers(data.customers)

        let filteredCustomers = data.customers

        // Filtrar en frontend para el estado "rejected"
        if (filter === 'rejected') {
          filteredCustomers = data.customers.filter((c: Customer) => c.rejected_at)
        } else if (filter === 'pending') {
          filteredCustomers = data.customers.filter((c: Customer) => !c.is_approved && !c.rejected_at)
        } else if (filter === 'approved') {
          filteredCustomers = data.customers.filter((c: Customer) => c.is_approved)
        }

        setCustomers(filteredCustomers)
      }
    } catch (error) {
      console.error('Error fetching customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const approveCustomer = async (customerId: string, approved: boolean) => {
    console.log(`🔄 Frontend - ${approved ? 'Approving' : 'Revoking'} customer ${customerId.slice(0, 8)}`)

    try {
      const requestBody = { approved }
      console.log(`📤 Frontend - Sending request:`, { customerId: customerId.slice(0, 8), ...requestBody })

      const response = await fetch(`/api/customers/${customerId}/approve`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      })

      console.log(`📥 Frontend - Response status: ${response.status}`)
      const data = await response.json()
      console.log(`📥 Frontend - Response data for ${customerId.slice(0, 8)}:`, data)

      if (response.ok && data.success) {
        console.log(`✅ Frontend - Successfully ${approved ? 'approved' : 'revoked'} customer ${customerId.slice(0, 8)}`)

        // Refrescar la lista inmediatamente
        fetchCustomers()

        // Verificar persistencia con cache busting
        setTimeout(async () => {
          console.log(`🔄 Frontend - Verifying customer ${customerId.slice(0, 8)} persistence (with cache bypass)...`)
          try {
            const verifyResponse = await fetch(`/api/customers?_verify=${Date.now()}`, {
              headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
              }
            })
            const verifyData = await verifyResponse.json()
            if (verifyData.success) {
              const verifiedCustomer = verifyData.customers.find((c: any) => c.id === customerId)
              if (verifiedCustomer) {
                const actualStatus = verifiedCustomer.is_approved
                console.log(`🔍 Frontend - Full customer verification:`, {
                  customerId: customerId.slice(0, 8),
                  expected: approved,
                  actual: actualStatus,
                  rejectedAt: verifiedCustomer.rejected_at,
                  updatedAt: verifiedCustomer.updated_at
                })

                if (actualStatus === approved) {
                  console.log(`✅ Frontend - Persistence confirmed for ${customerId.slice(0, 8)}: is_approved=${actualStatus}`)
                } else {
                  console.warn(`⚠️ Frontend - Persistence issue for ${customerId.slice(0, 8)}: expected is_approved=${approved}, got ${actualStatus}`)
                  console.log('🔄 Frontend - Refreshing customer list due to persistence issue...')
                  fetchCustomers()
                }
              } else {
                console.error(`❌ Frontend - Customer ${customerId.slice(0, 8)} not found in verification`)
              }
            }
          } catch (error) {
            console.error(`❌ Frontend - Error verifying customer ${customerId.slice(0, 8)}:`, error)
          }
        }, 2000) // Más tiempo para que se complete la transacción

      } else {
        console.error(`❌ Frontend - Error updating customer ${customerId.slice(0, 8)}:`, data.error)
        alert(`Error: ${data.error}`)
      }
    } catch (error) {
      console.error(`❌ Frontend - Network error for customer ${customerId.slice(0, 8)}:`, error)
      alert('Error de conexión. Inténtalo de nuevo.')
    }
  }

  // Usar allCustomers para contadores precisos
  const pendingCustomers = allCustomers.filter(c => !c.is_approved && !c.rejected_at)
  const approvedCustomers = allCustomers.filter(c => c.is_approved)
  const rejectedCustomers = allCustomers.filter(c => c.rejected_at)

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
    <div className="p-4 sm:p-6">
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Clientes</p>
              <p className="text-2xl font-bold">{allCustomers.length}</p>
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

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Rechazados</p>
              <p className="text-2xl font-bold text-red-600">{rejectedCustomers.length}</p>
            </div>
            <X className="h-8 w-8 text-red-500" />
          </div>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={filter} onValueChange={(value) => setFilter(value as any)}>
        <TabsList className="mb-6">
          <TabsTrigger value="all">Todos ({allCustomers.length})</TabsTrigger>
          <TabsTrigger value="pending">Pendientes ({pendingCustomers.length})</TabsTrigger>
          <TabsTrigger value="approved">Aprobados ({approvedCustomers.length})</TabsTrigger>
          <TabsTrigger value="rejected">Rechazados ({rejectedCustomers.length})</TabsTrigger>
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
    <Card className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
            <h3 className="text-lg font-semibold">{customer.name}</h3>
            <Badge
              variant={customer.is_approved ? "default" : customer.rejected_at ? "destructive" : "secondary"}
              className={
                customer.is_approved
                  ? "bg-green-100 text-green-800"
                  : customer.rejected_at
                    ? "bg-red-100 text-red-800"
                    : "bg-orange-100 text-orange-800"
              }
            >
              {customer.is_approved ? 'Aprobado' : customer.rejected_at ? 'Rechazado' : 'Pendiente'}
            </Badge>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:gap-4 mb-4">
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Mail className="h-4 w-4 flex-shrink-0" />
              <span className="break-all">{customer.email}</span>
            </div>

            {customer.company_name && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Building className="h-4 w-4 flex-shrink-0" />
                <span className="break-words">{customer.company_name}</span>
              </div>
            )}

            {customer.phone && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-4 w-4 flex-shrink-0" />
                <span>{customer.phone}</span>
              </div>
            )}

            {customer.address && (
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span className="break-words">{customer.address}</span>
              </div>
            )}
          </div>

          <p className="text-sm sm:text-xs text-gray-500">
            Registrado: {new Date(customer.created_at).toLocaleDateString('es-ES')}
          </p>
        </div>

        <div className="flex flex-row sm:flex-col gap-2 sm:ml-4">
          {customer.is_approved ? (
            // Cliente aprobado - puede ser revocado
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                if (confirm('¿Estás seguro de que quieres revocar la aprobación de este cliente?')) {
                  onApprove(false)
                }
              }}
              className="flex-1 sm:flex-none text-red-600 border-red-200 hover:bg-red-50"
            >
              <X className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Revocar</span>
              <span className="sm:hidden">Revoc.</span>
            </Button>
          ) : customer.rejected_at ? (
            // Cliente rechazado - puede ser reactivado a pendiente
            <Button
              type="button"
              size="sm"
              onClick={() => onApprove(true)}
              className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
            >
              <Check className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Reactivar</span>
              <span className="sm:hidden">React.</span>
            </Button>
          ) : (
            // Cliente pendiente - puede ser aprobado o rechazado
            <>
              <Button
                type="button"
                size="sm"
                onClick={() => onApprove(true)}
                className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700"
              >
                <Check className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Aprobar</span>
                <span className="sm:hidden">Aprov.</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => {
                  if (confirm('¿Estás seguro de que quieres rechazar este cliente?')) {
                    onApprove(false)
                  }
                }}
                className="flex-1 sm:flex-none text-red-600 border-red-200 hover:bg-red-50"
              >
                <X className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Rechazar</span>
                <span className="sm:hidden">Rech.</span>
              </Button>
            </>
          )}

          <Link href={`/clientes/${customer.id}/descuentos`} className="flex-1 sm:flex-none">
            <Button size="sm" variant="outline" className="w-full">
              <Percent className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Descuentos</span>
              <span className="sm:hidden">Desc.</span>
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}