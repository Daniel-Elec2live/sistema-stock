'use client'

import { useState, useEffect, createContext, useContext } from 'react'
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Toast {
  id: string
  title: string
  description?: string
  variant?: 'default' | 'destructive' | 'success' | 'warning' | 'info'
  duration?: number
}

interface ToastContextType {
  toast: (toast: Omit<Toast, 'id'>) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = (toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    const newToast = { ...toast, id }

    setToasts(prev => [...prev, newToast])

    // Auto-remove after duration
    const duration = toast.duration ?? 5000
    if (duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, duration)
    }
  }

  const removeToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id))
  }

  // Set the global toast function when provider mounts
  useEffect(() => {
    toastFunction = addToast
    return () => {
      toastFunction = null
    }
  }, [])

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}

// Export a simple toast function for direct use
let toastFunction: ((toast: Omit<Toast, 'id'>) => void) | null = null

export function toast(toastData: Omit<Toast, 'id'>) {
  if (toastFunction) {
    toastFunction(toastData)
  } else {
    console.warn('Toast provider not found. Make sure ToastProvider is in your app.')
  }
}

function ToastContainer({
  toasts,
  onRemove
}: {
  toasts: Toast[]
  onRemove: (id: string) => void
}) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm w-full">
      <AnimatePresence>
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onRemove={() => onRemove(toast.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ToastItem({ 
  toast, 
  onRemove 
}: { 
  toast: Toast
  onRemove: () => void 
}) {
  const getIcon = () => {
    switch (toast.variant) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'destructive':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-500" />
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />
      default:
        return <CheckCircle className="w-5 h-5 text-green-500" />
    }
  }

  const getStyles = () => {
    switch (toast.variant) {
      case 'destructive':
        return 'bg-red-50 border-red-200 text-red-900'
      case 'success':
        return 'bg-green-50 border-green-200 text-green-900'
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-900'
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-900'
      default:
        return 'bg-white border-gray-200 text-gray-900'
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 300, scale: 0.3 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 300, scale: 0.5 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`
        relative flex items-start gap-3 p-4 rounded-lg border shadow-lg
        ${getStyles()}
      `}
    >
      {getIcon()}
      
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm leading-tight">
          {toast.title}
        </h4>
        {toast.description && (
          <p className="text-sm opacity-90 mt-1 leading-snug">
            {toast.description}
          </p>
        )}
      </div>

      <button
        onClick={onRemove}
        className="flex-shrink-0 p-1 rounded-md hover:bg-black/10 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
    </motion.div>
  )
}

// Toast component for direct use (if not using context)
export function Toaster() {
  return null // The ToastProvider handles rendering
}