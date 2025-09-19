// apps/backoffice/__tests__/api/products.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/products/route'
import { NextRequest } from 'next/server'

// Mock Supabase
const mockInsert = vi.fn()
const mockSelect = vi.fn()
const mockSingle = vi.fn()

vi.mock('@/lib/supabase', () => ({
  createSupabaseClient: () => ({
    from: () => ({
      insert: mockInsert.mockReturnThis(),
      select: mockSelect.mockReturnThis(),
      single: mockSingle
    })
  })
}))

describe('/api/products', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should create a product successfully', async () => {
    const mockProduct = {
      id: '123',
      nombre: 'Test Product',
      unidad: 'kg',
      stock_minimo: 5
    }

    mockSingle.mockResolvedValue({
      data: mockProduct,
      error: null
    })

    const request = new NextRequest('http://localhost:3000/api/products', {
      method: 'POST',
      body: JSON.stringify({
        nombre: 'Test Product',
        unidad: 'kg',
        stock_minimo: 5
      })
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.product).toEqual(mockProduct)
  })

  it('should handle validation errors', async () => {
    const request = new NextRequest('http://localhost:3000/api/products', {
      method: 'POST',
      body: JSON.stringify({
        // Missing required fields
        nombre: ''
      })
    })

    const response = await POST(request)
    expect(response.status).toBe(500)
  })
})