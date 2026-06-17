import { describe, it, expect } from 'vitest'

// Pure cart logic extracted for testing
function addToCart(cart, event, selections) {
  const items = Object.entries(selections)
    .filter(([, qty]) => qty > 0)
    .map(([key, qty]) => {
      const [, tidx] = key.split('_')
      const t = event.tickets[+tidx]
      return {
        id:           'c' + tidx,
        eventId:      event.id,
        eventTitle:   event.title,
        ticketName:   t.name,
        ticketTypeId: t.id,
        price:        t.price,
        qty,
      }
    })
  if (!items.length) return { ok: false, cart }
  return { ok: true, cart: [...cart, ...items] }
}

const mockEvent = {
  id: 'evt-1',
  title: 'Festival Test',
  tickets: [
    { id: 'tt-1', name: 'Standard', price: 5000, total: 100, sold: 0 },
    { id: 'tt-2', name: 'VIP',      price: 15000, total: 20, sold: 0 },
  ],
}

describe('cart — addToCart', () => {
  it('adds selected tickets to empty cart', () => {
    const { ok, cart } = addToCart([], mockEvent, { ticket_0: 2 })
    expect(ok).toBe(true)
    expect(cart).toHaveLength(1)
    expect(cart[0].qty).toBe(2)
    expect(cart[0].ticketName).toBe('Standard')
    expect(cart[0].price).toBe(5000)
  })

  it('rejects empty selection', () => {
    const { ok, cart } = addToCart([], mockEvent, { ticket_0: 0, ticket_1: 0 })
    expect(ok).toBe(false)
    expect(cart).toHaveLength(0)
  })

  it('adds multiple ticket types', () => {
    const { ok, cart } = addToCart([], mockEvent, { ticket_0: 1, ticket_1: 2 })
    expect(ok).toBe(true)
    expect(cart).toHaveLength(2)
    expect(cart.find(i => i.ticketName === 'VIP').qty).toBe(2)
  })

  it('appends to existing cart', () => {
    const existing = [{ id: 'c0', eventId: 'other', qty: 1 }]
    const { cart } = addToCart(existing, mockEvent, { ticket_0: 1 })
    expect(cart).toHaveLength(2)
  })
})

describe('cart — totals', () => {
  const cart = [
    { price: 5000, qty: 2 },
    { price: 15000, qty: 1 },
  ]

  it('computes cart total correctly', () => {
    const total = cart.reduce((s, i) => s + i.price * i.qty, 0)
    expect(total).toBe(25000)
  })

  it('computes cart count correctly', () => {
    const count = cart.reduce((s, i) => s + i.qty, 0)
    expect(count).toBe(3)
  })

  it('applies discount correctly', () => {
    const raw = cart.reduce((s, i) => s + i.price * i.qty, 0)
    const discountAmount = 5000
    const total = Math.max(0, raw - discountAmount)
    expect(total).toBe(20000)
  })

  it('discount cannot make total negative', () => {
    const raw = 3000
    const total = Math.max(0, raw - 9999)
    expect(total).toBe(0)
  })
})
