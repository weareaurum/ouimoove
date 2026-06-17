import { describe, it, expect } from 'vitest'

// shapeEvent logic (mirrors useStore.js)
function shapeEvent(event) {
  const d = new Date(event.event_date)
  return {
    id:        event.id,
    title:     event.title,
    category:  event.category || '',
    date:      d.toISOString().slice(0, 10),
    time:      d.toISOString().slice(11, 16),
    location:  event.venue || '',
    city:      event.city  || '',
    desc:      event.description || '',
    emoji:     event.emoji || '🎟️',
    imageUrl:  event.image_url || null,
    isPrivate: event.is_private || false,
    status:    event.status,
    tickets:   (event.ticket_types || []).map((t) => ({
      id:    t.id,
      name:  t.name,
      price: t.price_cfa,
      total: t.quantity_total,
      sold:  t.quantity_sold,
    })),
    organizer: event.organizer_id,
  }
}

const rawEvent = {
  id: 'evt-1',
  title: 'Festival Jazz',
  category: 'Musique',
  event_date: '2025-12-25T12:00:00Z',
  venue: 'Palais des Congrès',
  city: 'Lomé',
  description: 'Un super festival',
  emoji: '🎸',
  image_url: 'https://example.com/img.jpg',
  is_private: false,
  status: 'published',
  organizer_id: 'user-1',
  ticket_types: [
    { id: 'tt-1', name: 'Standard', price_cfa: 5000, quantity_total: 100, quantity_sold: 10 },
    { id: 'tt-2', name: 'VIP',      price_cfa: 15000, quantity_total: 20,  quantity_sold: 5  },
  ],
}

describe('shapeEvent', () => {
  it('maps all basic fields', () => {
    const ev = shapeEvent(rawEvent)
    expect(ev.id).toBe('evt-1')
    expect(ev.title).toBe('Festival Jazz')
    expect(ev.city).toBe('Lomé')
    expect(ev.location).toBe('Palais des Congrès')
    expect(ev.emoji).toBe('🎸')
    expect(ev.isPrivate).toBe(false)
    expect(ev.status).toBe('published')
  })

  it('extracts date and time from event_date', () => {
    const ev = shapeEvent(rawEvent)
    expect(ev.date).toBe('2025-12-25')
    expect(ev.time).toBe('12:00')
  })

  it('maps ticket types correctly', () => {
    const ev = shapeEvent(rawEvent)
    expect(ev.tickets).toHaveLength(2)
    expect(ev.tickets[0]).toEqual({ id: 'tt-1', name: 'Standard', price: 5000, total: 100, sold: 10 })
    expect(ev.tickets[1]).toEqual({ id: 'tt-2', name: 'VIP', price: 15000, total: 20, sold: 5 })
  })

  it('defaults emoji to 🎟️ when missing', () => {
    const ev = shapeEvent({ ...rawEvent, emoji: null })
    expect(ev.emoji).toBe('🎟️')
  })

  it('handles missing ticket_types gracefully', () => {
    const ev = shapeEvent({ ...rawEvent, ticket_types: undefined })
    expect(ev.tickets).toEqual([])
  })

  it('marks private events', () => {
    const ev = shapeEvent({ ...rawEvent, is_private: true })
    expect(ev.isPrivate).toBe(true)
  })
})

describe('ticket availability', () => {
  it('calculates remaining tickets', () => {
    const ev = shapeEvent(rawEvent)
    const remaining = ev.tickets.map(t => t.total - t.sold)
    expect(remaining[0]).toBe(90)
    expect(remaining[1]).toBe(15)
  })

  it('detects sold-out ticket', () => {
    const soldOut = { ...rawEvent, ticket_types: [
      { id: 'tt-1', name: 'Standard', price_cfa: 5000, quantity_total: 50, quantity_sold: 50 },
    ]}
    const ev = shapeEvent(soldOut)
    const isSoldOut = ev.tickets[0].sold >= ev.tickets[0].total
    expect(isSoldOut).toBe(true)
  })
})
