// apps/backoffice/__tests__/utils.test.ts
import { describe, it, expect } from 'vitest'
import { formatCurrency, formatDate, getStockStatus, calculateDaysUntilExpiry } from '@/lib/utils'

describe('Utils', () => {
  describe('formatCurrency', () => {
    it('should format currency correctly', () => {
      expect(formatCurrency(123.45)).toBe('123,45 €')
      expect(formatCurrency(1000)).toBe('1.000,00 €')
      expect(formatCurrency(0)).toBe('0,00 €')
    })
  })

  describe('formatDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2025-08-22')
      expect(formatDate(date)).toBe('22/8/2025')
    })
  })

  describe('getStockStatus', () => {
    it('should return correct stock status', () => {
      expect(getStockStatus(0, 5)).toBe('critical')
      expect(getStockStatus(3, 5)).toBe('low')
      expect(getStockStatus(10, 5)).toBe('ok')
    })
  })

  describe('calculateDaysUntilExpiry', () => {
    it('should calculate days until expiry correctly', () => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowString = tomorrow.toISOString().split('T')[0]
      
      expect(calculateDaysUntilExpiry(tomorrowString)).toBe(1)
    })
  })
})