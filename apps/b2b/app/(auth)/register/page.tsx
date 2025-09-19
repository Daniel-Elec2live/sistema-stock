'use client'

import { Suspense } from 'react'
import { RegisterForm } from '@/components/auth/RegisterForm'

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[var(--color-tomate)]"></div>
      </div>
    }>
      <RegisterForm />
    </Suspense>
  )
}