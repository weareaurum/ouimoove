export function formatDate(d) {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })
}

export function minPrice(event) {
  return Math.min(...event.tickets.map((t) => t.price))
}

export function fmtPrice(n) {
  if (n === 0) return 'Gratuit'
  return n.toLocaleString('fr-FR') + ' FCFA'
}
