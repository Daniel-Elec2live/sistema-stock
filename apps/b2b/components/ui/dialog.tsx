'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { Button } from './button'

interface DialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}

interface DialogContentProps {
  className?: string
  children: React.ReactNode
}

interface DialogHeaderProps {
  children: React.ReactNode
  className?: string
}

interface DialogTitleProps {
  children: React.ReactNode
  className?: string
}

interface DialogDescriptionProps {
  children: React.ReactNode
  className?: string
}

interface DialogFooterProps {
  children: React.ReactNode
  className?: string
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }

    if (open) {
      document.addEventListener('keydown', handleEscape)
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = 'unset'
    }
  }, [open, onOpenChange])

  // Handle backdrop click
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onOpenChange(false)
    }
  }

  if (typeof window === 'undefined') {
    return null
  }

  return createPortal(
    <AnimatePresence>
      {open && (
        <div
          ref={dialogRef}
          className="fixed inset-0 z-50 flex items-center justify-center"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
            onClick={handleBackdropClick}
          />
          
          {/* Dialog content container */}
          <div className="relative z-10 w-full max-w-lg mx-4">
            {children}
          </div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export function DialogContent({ className = '', children }: DialogContentProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, y: 20 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className={`
        relative bg-white rounded-lg shadow-xl p-6 w-full max-h-[85vh] overflow-y-auto
        ${className}
      `}
    >
      {children}
    </motion.div>
  )
}

export function DialogHeader({ children, className = '' }: DialogHeaderProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  )
}

export function DialogTitle({ children, className = '' }: DialogTitleProps) {
  return (
    <h2 className={`text-lg font-semibold text-gray-900 ${className}`}>
      {children}
    </h2>
  )
}

export function DialogDescription({ children, className = '' }: DialogDescriptionProps) {
  return (
    <p className={`text-sm text-gray-600 mt-1 ${className}`}>
      {children}
    </p>
  )
}

export function DialogFooter({ children, className = '' }: DialogFooterProps) {
  return (
    <div className={`flex flex-col sm:flex-row gap-2 justify-end mt-6 ${className}`}>
      {children}
    </div>
  )
}

// Close button component
export function DialogClose({ 
  onClose, 
  className = '' 
}: { 
  onClose: () => void
  className?: string 
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClose}
      className={`absolute top-4 right-4 p-2 ${className}`}
    >
      <X className="w-4 h-4" />
    </Button>
  )
}

// Trigger component (optional, for cleaner API)
export function DialogTrigger({ 
  children, 
  onClick 
}: { 
  children: React.ReactNode
  onClick: () => void 
}) {
  return (
    <div onClick={onClick} className="cursor-pointer">
      {children}
    </div>
  )
}