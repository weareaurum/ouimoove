import { describe, it, expect } from 'vitest'

// Payment mode logic
const PAYMENT_MODE = 'paydunya'

function getCheckoutUrl(token, mode) {
  return `https://app.paydunya.com/${mode === 'live' ? '' : 'sandbox-'}checkout/invoice/${token}`
}

function shouldUsePaydunya(mode, total) {
  return mode === 'paydunya' && total > 0
}

describe('payment mode routing', () => {
  it('routes to PayDunya when mode=paydunya and total>0', () => {
    expect(shouldUsePaydunya('paydunya', 5000)).toBe(true)
  })

  it('skips PayDunya for free tickets (total=0)', () => {
    expect(shouldUsePaydunya('paydunya', 0)).toBe(false)
  })

  it('skips PayDunya in simulation mode', () => {
    expect(shouldUsePaydunya('simulation', 5000)).toBe(false)
  })
})

describe('PayDunya checkout URL', () => {
  it('builds sandbox URL correctly', () => {
    const url = getCheckoutUrl('abc123', 'sandbox')
    expect(url).toBe('https://app.paydunya.com/sandbox-checkout/invoice/abc123')
  })

  it('builds live URL correctly', () => {
    const url = getCheckoutUrl('abc123', 'live')
    expect(url).toBe('https://app.paydunya.com/checkout/invoice/abc123')
  })

  it('includes the token in the URL', () => {
    const token = 'tok_xyz_9999'
    const url = getCheckoutUrl(token, 'sandbox')
    expect(url).toContain(token)
  })
})

describe('free ticket flow', () => {
  it('total is 0 when all tickets are free', () => {
    const cart = [
      { price: 0, qty: 2 },
      { price: 0, qty: 1 },
    ]
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0)
    expect(total).toBe(0)
  })

  it('total is 0 after 100% discount', () => {
    const raw = 5000
    const discount = 5000
    const total = Math.max(0, raw - discount)
    expect(total).toBe(0)
    expect(shouldUsePaydunya('paydunya', total)).toBe(false)
  })
})
