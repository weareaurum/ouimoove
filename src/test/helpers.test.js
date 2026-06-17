import { describe, it, expect } from 'vitest'
import { formatDate, minPrice, fmtPrice } from '../utils/helpers.js'

describe('formatDate', () => {
  it('formats a date string in French', () => {
    expect(formatDate('2025-12-25')).toBe('25 décembre 2025')
  })
  it('handles single-digit day', () => {
    expect(formatDate('2025-01-05')).toBe('05 janvier 2025')
  })
})

describe('fmtPrice', () => {
  it('returns Gratuit for 0', () => {
    expect(fmtPrice(0)).toBe('Gratuit')
  })
  it('formats non-zero price with FCFA', () => {
    expect(fmtPrice(5000)).toContain('FCFA')
    expect(fmtPrice(5000)).toContain('5')
  })
})

describe('minPrice', () => {
  it('returns the lowest ticket price', () => {
    const event = { tickets: [{ price: 5000 }, { price: 2000 }, { price: 8000 }] }
    expect(minPrice(event)).toBe(2000)
  })
  it('returns 0 for free tickets', () => {
    const event = { tickets: [{ price: 0 }, { price: 3000 }] }
    expect(minPrice(event)).toBe(0)
  })
  it('handles single ticket', () => {
    const event = { tickets: [{ price: 1500 }] }
    expect(minPrice(event)).toBe(1500)
  })
})
