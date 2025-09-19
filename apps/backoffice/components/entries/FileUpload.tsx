// apps/backoffice/components/entries/FileUpload.tsx
'use client'

import { useCallback, useState } from 'react'
import { Upload, FileText, Image, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FileUploadProps {
  onFileUpload: (file: File) => void
  acceptedTypes?: string[]
  maxSize?: number // MB
}

export function FileUpload({ 
  onFileUpload, 
  acceptedTypes = ['image/jpeg', 'image/png', 'application/pdf'],
  maxSize = 10 
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    const validFile = files.find(file => 
      acceptedTypes.includes(file.type) && 
      file.size <= maxSize * 1024 * 1024
    )
    
    if (validFile) {
      setSelectedFile(validFile)
    }
  }, [acceptedTypes, maxSize])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && acceptedTypes.includes(file.type) && file.size <= maxSize * 1024 * 1024) {
      setSelectedFile(file)
    }
  }

  const handleUpload = () => {
    if (selectedFile) {
      onFileUpload(selectedFile)
      setSelectedFile(null)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const getFileIcon = (type: string) => {
    if (type.startsWith('image/')) return Image
    if (type === 'application/pdf') return FileText
    return FileText
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      {!selectedFile ? (
        <div
          className={`
            border-2 border-dashed rounded-lg p-8 text-center transition-colors
            ${isDragOver 
              ? 'border-tomate bg-red-50' 
              : 'border-gray-300 hover:border-gray-400'
            }
          `}
          onDrop={handleDrop}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragOver(true)
          }}
          onDragLeave={() => setIsDragOver(false)}
        >
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">
            Arrastra tu documento aquí
          </p>
          <p className="text-gray-600 mb-4">
            o haz clic para seleccionar
          </p>
          
          <label>
            <Button variant="outline" className="cursor-pointer">
              Seleccionar archivo
            </Button>
            <input
              type="file"
              className="hidden"
              accept={acceptedTypes.join(',')}
              onChange={handleFileInput}
            />
          </label>
          
          <p className="text-xs text-gray-500 mt-4">
            JPG, PNG, PDF • Máximo {maxSize}MB
          </p>
        </div>
      ) : (
        <div className="border rounded-lg p-6 bg-gray-50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white rounded-lg border">
              {(() => {
                const Icon = getFileIcon(selectedFile.type)
                return <Icon className="w-6 h-6 text-gray-600" />
              })()}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">
                {selectedFile.name}
              </p>
              <p className="text-sm text-gray-600">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedFile(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          <div className="flex gap-2 mt-4">
            <Button onClick={handleUpload} className="flex-1">
              Procesar con OCR
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setSelectedFile(null)}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}