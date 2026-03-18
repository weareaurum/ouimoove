export function formatDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

export function minPrice(event) {
  return Math.min(...event.tickets.map(t => t.price))
}

export function fmtPrice(n) {
  return n === 0 ? 'Gratuit' : n.toLocaleString('fr-FR') + ' FCFA'
}

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now()
}
