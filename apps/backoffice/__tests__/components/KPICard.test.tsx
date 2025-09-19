// apps/backoffice/__tests__/components/KPICard.test.tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { KPICard } from '@/components/dashboard/KPICard'
import { Package } from 'lucide-react'

describe('KPICard', () => {
  it('renders KPI card with correct data', () => {
    render(
      <KPICard
        title="Test KPI"
        value="123"
        change="+5%"
        trend="up"
        icon={Package}
      />
    )

    expect(screen.getByText('Test KPI')).toBeInTheDocument()
    expect(screen.getByText('123')).toBeInTheDocument()
    expect(screen.getByText('+5%')).toBeInTheDocument()
  })

  it('applies correct variant styles', () => {
    const { container } = render(
      <KPICard
        title="Warning KPI"
        value="5"
        change="-2"
        trend="down"
        icon={Package}
        variant="warning"
      />
    )

    const card = container.querySelector('.border-pan')
    expect(card).toBeInTheDocument()
  })
})