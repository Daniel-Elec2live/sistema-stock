// apps/backoffice/app/(dashboard)/layout.tsx
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header - oculto en móvil ya que está en el Sidebar */}
        <div className="hidden lg:block">
          <Header />
        </div>
        
        <main className="flex-1 overflow-auto pt-16 lg:pt-0 min-h-0">
          {children}
        </main>
      </div>
    </div>
  )
}