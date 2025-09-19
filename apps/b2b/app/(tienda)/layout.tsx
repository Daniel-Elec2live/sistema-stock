import { Suspense } from 'react'
import { Header } from '@/components/layout/Header'
import { CartSidebar } from '@/components/tienda/CartSidebar'
import { AuthGuard } from '@/components/auth/AuthGuard'

export default function TiendaLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <AuthGuard requireApproval>
      <div className="min-h-screen bg-white">
        <Header />
        
        <main className="pt-16">
          <Suspense fallback={
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-tomate"></div>
            </div>
          }>
            {children}
          </Suspense>
        </main>
        
        {/* Carrito lateral */}
        <CartSidebar />
      </div>
    </AuthGuard>
  )
}