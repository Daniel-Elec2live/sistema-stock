// apps/backoffice/app/(dashboard)/entradas/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { FileUpload } from '@/components/entries/FileUpload'
import { OCRProposal } from '@/components/entries/OCRProposal'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Upload, Plus, FileText, Clock, X, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

interface OCRResult {
  id: string
  status: 'processing' | 'completed' | 'error'
  proveedor?: string
  fecha?: string
  productos?: Array<{
    nombre: string
    cantidad: number
    precio: number
    unidad: string
    caducidad?: string
  }>
  confianza?: number
}

interface ValidationData {
  proveedor?: string
  fecha?: string
  productos?: Array<{
    nombre: string
    cantidad: number
    precio: number
    unidad: string
    caducidad?: string
  }>
}

// Componente Tabs simplificado
interface TabsProps {
  children: React.ReactNode
}

function Tabs({ children }: TabsProps) {
  return (
    <div className="w-full">
      {children}
    </div>
  )
}

interface TabsListProps {
  children: React.ReactNode
  className?: string
}

function TabsList({ children, className }: TabsListProps) {
  return (
    <div className={cn("inline-flex h-9 items-center justify-center rounded-lg bg-gray-100 p-1 text-gray-500", className)}>
      {children}
    </div>
  )
}

interface TabsTriggerProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
}

function TabsTrigger({ children, className, onClick }: TabsTriggerProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        className
      )}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  children: React.ReactNode
  className?: string
}

function TabsContent({ children, className }: TabsContentProps) {
  return (
    <div className={cn("mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2", className)}>
      {children}
    </div>
  )
}

export default function EntradasPage() {
  const [activeTab, setActiveTab] = useState('ocr')
  const [ocrResult, setOCRResult] = useState<OCRResult | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true)
    try {
      // 1. Subir archivo a Supabase Storage
      const formData = new FormData()
      formData.append('file', file)
      
      const uploadResponse = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      })
      
      if (!uploadResponse.ok) {
        throw new Error('Error al subir archivo')
      }
      
      const { fileUrl } = await uploadResponse.json()
      
      // 2. Enviar al servicio OCR
      const ocrResponse = await fetch('/api/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo: 'ocr',
          documento_url: fileUrl,
          archivo_nombre: file.name
        })
      })
      
      if (!ocrResponse.ok) {
        throw new Error('Error al procesar OCR')
      }
      
      const result = await ocrResponse.json()
      setOCRResult(result)
      
    } catch (error) {
      console.error('Error:', error)
      setOCRResult({
        id: 'error',
        status: 'error'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleOCRValidation = async (validatedData: ValidationData) => {
    try {
      console.log('[ENTRADAS OCR] Validando entrada:', { id: ocrResult?.id, validatedData })

      const response = await fetch('/api/entries', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: ocrResult?.id,
          ...validatedData,
          estado: 'validated' // Corregido de 'validada' a 'validated'
        })
      })

      if (response.ok) {
        const result = await response.json()
        console.log('[ENTRADAS OCR] ✅ Validación exitosa:', result)
        // Resetear formulario y mostrar success
        setOCRResult(null)
        alert('✅ Entrada validada y stock actualizado correctamente')
      } else {
        const error = await response.json()
        console.error('[ENTRADAS OCR] ❌ Error en validación:', error)
        alert(`❌ Error: ${error.error || 'Error desconocido'}`)
      }
    } catch (error) {
      console.error('[ENTRADAS OCR] ❌ Error validando entrada:', error)
      alert('❌ Error al validar entrada')
    }
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Registro de Entradas
          </h1>
          <p className="text-gray-600">
            Procesa albaranes automáticamente o registra manualmente
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/entradas/manual">
            <Button variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Entrada Manual
            </Button>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <Tabs>
        <TabsList className="grid w-full grid-cols-2 lg:w-auto">
          <TabsTrigger 
            className={cn(
              "flex items-center gap-2",
              activeTab === 'ocr' ? "bg-white text-gray-900 shadow-sm" : ""
            )}
            onClick={() => setActiveTab('ocr')}
          >
            <Upload className="w-4 h-4" />
            Subir Albarán
          </TabsTrigger>
          <TabsTrigger 
            className={cn(
              "flex items-center gap-2",
              activeTab === 'historial' ? "bg-white text-gray-900 shadow-sm" : ""
            )}
            onClick={() => setActiveTab('historial')}
          >
            <FileText className="w-4 h-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        {activeTab === 'ocr' && (
          <TabsContent className="space-y-6">
            {!ocrResult && !isProcessing && (
              <Card className="p-8">
                <div className="text-center">
                  <FileUpload onFileUpload={handleFileUpload} />
                  <div className="mt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Sube tu albarán o factura
                    </h3>
                    <p className="text-gray-600 max-w-md mx-auto">
                      Formatos soportados: JPG, PNG, PDF. 
                      El OCR extraerá automáticamente proveedor, productos, cantidades y precios.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {isProcessing && (
              <Card className="p-8">
                <div className="text-center">
                  <div className="animate-spin w-8 h-8 border-2 border-[#a21813] border-t-transparent rounded-full mx-auto mb-4"></div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Procesando documento...
                  </h3>
                  <p className="text-gray-600">
                    El OCR está extrayendo los datos. Esto puede tardar unos segundos.
                  </p>
                </div>
              </Card>
            )}

            {ocrResult && ocrResult.status === 'completed' && (
              <OCRProposal 
                data={ocrResult} 
                onValidate={handleOCRValidation}
                onCancel={() => setOCRResult(null)}
              />
            )}

            {ocrResult && ocrResult.status === 'error' && (
              <Card className="p-8 border-red-200 bg-red-50">
                <div className="text-center">
                  <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-red-600 text-xl">⚠️</span>
                  </div>
                  <h3 className="text-lg font-medium text-red-900 mb-2">
                    Error al procesar documento
                  </h3>
                  <p className="text-red-700 mb-4">
                    No se pudo extraer información del archivo. 
                    Prueba con otro documento o usa entrada manual.
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button 
                      variant="outline" 
                      onClick={() => setOCRResult(null)}
                    >
                      Intentar de nuevo
                    </Button>
                    <Link href="/entradas/manual">
                      <Button>
                        Entrada Manual
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>
        )}

        {activeTab === 'historial' && (
          <TabsContent>
            <HistorialEntradas />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

// Componente de historial de entradas
function HistorialEntradas() {
  const [entradas, setEntradas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEntrada, setSelectedEntrada] = useState<any | null>(null)

  useEffect(() => {
    const fetchEntradas = async () => {
      try {
        const response = await fetch('/api/entries?limit=10&order=desc')
        if (response.ok) {
          const data = await response.json()
          setEntradas(data.entries || [])
        }
      } catch (error) {
        console.error('Error fetching entries:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchEntradas()
  }, [])

  if (loading) {
    return (
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Entradas Recientes
        </h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center gap-3 p-4">
                <div className="w-8 h-8 bg-gray-200 rounded"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-48"></div>
                </div>
                <div className="w-16 h-6 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        Entradas Recientes
      </h3>
      
      <div className="space-y-3">
        {entradas.map((entrada) => {
          const productosCount = entrada.productos?.length || 0
          const total = entrada.productos?.reduce((sum: number, p: any) => 
            sum + (p.cantidad * p.precio), 0) || 0
          
          return (
            <div
              key={entrada.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              onClick={() => setSelectedEntrada(entrada)}
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded">
                  {entrada.tipo === 'ocr' ? (
                    <FileText className="w-4 h-4 text-gray-600" />
                  ) : (
                    <Plus className="w-4 h-4 text-gray-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {entrada.proveedor_text || entrada.proveedor || 'Sin proveedor'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {productosCount} productos • {entrada.fecha_factura ? new Date(entrada.fecha_factura).toLocaleDateString('es-ES') : new Date(entrada.created_at).toLocaleDateString('es-ES')}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="font-medium text-gray-900">
                  €{total.toFixed(2)}
                </p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  entrada.estado === 'completed' || entrada.estado === 'completada' ? 'bg-green-100 text-green-800' :
                  entrada.estado === 'validated' || entrada.estado === 'validada' ? 'bg-blue-100 text-blue-800' :
                  entrada.estado === 'processing' || entrada.estado === 'procesando' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {entrada.estado}
                </span>
              </div>
            </div>
          )
        })}

        {/* Modal de detalles */}
        {selectedEntrada && (
          <EntradaDetalleModal
            entrada={selectedEntrada}
            onClose={() => setSelectedEntrada(null)}
          />
        )}
      </div>
      
      {entradas.length === 0 && !loading && (
        <div className="text-center py-8 text-gray-500">
          <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No hay entradas registradas</p>
        </div>
      )}
    </Card>
  )
}

// Modal de detalles de entrada
interface EntradaDetalleModalProps {
  entrada: any
  onClose: () => void
}

function EntradaDetalleModal({ entrada, onClose }: EntradaDetalleModalProps) {
  const productosCount = entrada.productos?.length || 0
  const total = entrada.productos?.reduce((sum: number, p: any) =>
    sum + (p.cantidad * p.precio), 0) || 0

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              Detalles de Entrada
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {entrada.tipo === 'ocr' ? 'Entrada OCR' : 'Entrada Manual'} • {new Date(entrada.created_at).toLocaleString('es-ES')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Información general */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Proveedor</label>
              <p className="mt-1 text-gray-900">
                {entrada.proveedor_text || entrada.proveedor || 'Sin proveedor'}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Fecha Factura</label>
              <p className="mt-1 text-gray-900">
                {entrada.fecha_factura
                  ? new Date(entrada.fecha_factura).toLocaleDateString('es-ES')
                  : 'No especificada'
                }
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Estado</label>
              <p className="mt-1">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  entrada.estado === 'completed' || entrada.estado === 'completada' ? 'bg-green-100 text-green-800' :
                  entrada.estado === 'validated' || entrada.estado === 'validada' ? 'bg-blue-100 text-blue-800' :
                  entrada.estado === 'processing' || entrada.estado === 'procesando' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {entrada.estado}
                </span>
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Total Productos</label>
              <p className="mt-1 text-gray-900">{productosCount}</p>
            </div>
          </div>

          {/* Documento */}
          {entrada.documento_url && (
            <div>
              <label className="text-sm font-medium text-gray-700">Documento Original</label>
              <a
                href={entrada.documento_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-2 text-[#a21813] hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Ver documento
              </a>
            </div>
          )}

          {/* Productos */}
          <div>
            <label className="text-sm font-medium text-gray-700 mb-3 block">
              Productos ({productosCount})
            </label>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Producto
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Precio Unit.
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Subtotal
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      Caducidad
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {entrada.productos?.map((producto: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {producto.nombre}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {producto.cantidad} {producto.unidad}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        €{producto.precio.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                        €{(producto.cantidad * producto.precio).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {producto.caducidad
                          ? new Date(producto.caducidad).toLocaleDateString('es-ES')
                          : '-'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">
                      Total:
                    </td>
                    <td className="px-4 py-3 text-sm font-bold text-gray-900 text-right">
                      €{total.toFixed(2)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Metadata adicional */}
          {entrada.metadata && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Información Adicional
              </label>
              <div className="bg-gray-50 rounded-lg p-4">
                <pre className="text-xs text-gray-700 overflow-x-auto">
                  {JSON.stringify(entrada.metadata, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t bg-gray-50">
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  )
}