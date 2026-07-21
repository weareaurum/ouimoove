import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { Modal, ModalHeader, ModalBody } from '../Modal.jsx'
import styles from './MyTicketsModal.module.css'

function TicketCard({ purchase, myListings, toast, onListForResale, onCancelListing }) {
  const [qrDataUrl,  setQrDataUrl]  = useState('')
  const [showResale, setShowResale] = useState(false)
  const [askPrice,   setAskPrice]   = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Generate QR as data URL — no canvas ref issues
  useEffect(() => {
    const payload = `OUIMOOVE|${purchase.id}|${purchase.items[0]?.eventTitle || ''}|${purchase.total}FCFA`
    QRCode.toDataURL(payload, {
      width: 180,
      margin: 1,
      color: { dark: '#1a0a2e', light: '#ffffff' },
    }).then(setQrDataUrl).catch(console.error)
  }, [purchase.id])

  const submitResale = async (item) => {
    const price = parseInt(askPrice)
    if (!price || price <= 0) { toast('Entrez un prix valide.', 'error'); return }
    setSubmitting(true)
    const result = await onListForResale({
      orderItemId:   item.id,
      orderId:       purchase.id,
      eventId:       item.eventId,
      ticketTypeId:  item.ticketTypeId,
      eventTitle:    item.eventTitle,
      eventDate:     null,
      eventCity:     '',
      eventEmoji:    '🎟️',
      eventImageUrl: null,
      ticketName:    item.ticketName,
      quantity:      item.qty,
      originalPrice: item.price,
      askPrice:      price,
    })
    setSubmitting(false)
    if (!result || result.error) {
      toast(result?.error || 'Impossible de mettre en vente.', 'error')
    } else {
      toast('Billet mis en vente ! 🏪', 'success')
      setShowResale(false)
      setAskPrice('')
    }
  }

  const isRefunded = purchase.status === 'refunded'
  const ref        = purchase.id.slice(0, 8).toUpperCase()
  const dateStr    = new Date(purchase.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })

  return (
    <div className={styles.ticket} style={{ opacity: isRefunded ? 0.55 : 1 }}>

      {/* ── Top branded header ── */}
      <div className={styles.ticketHeader}>
        <div className={styles.headerLeft}>
          <span className={styles.brandOui}>Oui</span><span className={styles.brandMoove}>Moove</span>
          <span className={styles.headerTag}>Billet électronique</span>
        </div>
        <div className={styles.statusBadge} style={{
          background: isRefunded ? 'rgba(239,68,68,.15)' : 'rgba(34,197,94,.12)',
          color:      isRefunded ? 'var(--danger)'       : 'var(--success)',
          border:     isRefunded ? '1px solid rgba(239,68,68,.3)' : '1px solid rgba(34,197,94,.3)',
        }}>
          {isRefunded ? '↩ Remboursé' : '✓ Confirmé'}
        </div>
      </div>

      {/* ── Event name ── */}
      <div className={styles.eventName}>
        {purchase.items[0]?.eventTitle || 'Événement'}
      </div>

      {/* ── Ticket types ── */}
      <div className={styles.tagRow}>
        {purchase.items.map((item, i) => (
          <span key={i} className={styles.tag}>
            {item.ticketName} ×{item.qty}
          </span>
        ))}
      </div>

      {/* ── Tear line ── */}
      <div className={styles.tearLine}>
        <div className={styles.notchLeft} />
        <div className={styles.dashes} />
        <span className={styles.scissors}>✂</span>
        <div className={styles.dashes} />
        <div className={styles.notchRight} />
      </div>

      {/* ── QR section ── */}
      <div className={styles.qrSection}>
        <div className={styles.qrWrap}>
          {qrDataUrl && <img src={qrDataUrl} alt="QR Code" width={160} height={160} style={{ display: 'block', borderRadius: 8 }} />}
        </div>
        <div className={styles.qrMeta}>
          <div className={styles.qrLabel}>Scanner à l'entrée</div>
          <div className={styles.qrRef}>Réf · {ref}</div>
          <div className={styles.qrDate}>Acheté le {dateStr}</div>
          <div className={styles.qrTotal}>{purchase.total.toLocaleString('fr-FR')} FCFA</div>
        </div>
      </div>

      {/* ── Items detail ── */}
      <div className={styles.itemsList}>
        {purchase.items.map((item, i) => {
          const listing = myListings?.find(l => l.order_item_id === item.id && l.status === 'active')
          return (
            <div key={i}>
              <div className={styles.itemRow}>
                <span style={{ textDecoration: item.resold ? 'line-through' : 'none', color: item.resold ? 'var(--muted)' : undefined }}>
                  {item.ticketName}
                  {item.resold && <span style={{ color: 'var(--danger)', fontSize: '0.72rem', marginLeft: 6 }}>Revendu</span>}
                </span>
                <span>×{item.qty} · {(item.price * item.qty).toLocaleString('fr-FR')} FCFA</span>
              </div>

              {!isRefunded && !item.resold && !item.checkedIn && !item.isResale && onListForResale && (
                <div style={{ marginTop: 4, marginBottom: 4 }}>
                  {listing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(244,154,14,.08)', border: '1px solid rgba(244,154,14,.3)', borderRadius: 8, padding: '6px 10px' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--orange)', flex: 1 }}>
                        🏷️ En vente à {listing.ask_price_cfa.toLocaleString('fr-FR')} FCFA
                      </span>
                      <button onClick={() => onCancelListing(listing.id)} style={{ background: 'transparent', border: '1px solid rgba(239,68,68,.4)', color: 'var(--danger)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: '0.72rem' }}>
                        Retirer
                      </button>
                    </div>
                  ) : showResale === item.id ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        autoFocus type="number" min="1"
                        placeholder={`Prix (min ${item.price.toLocaleString('fr-FR')} FCFA)`}
                        value={askPrice} onChange={e => setAskPrice(e.target.value)}
                        style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px', color: 'var(--text)', fontSize: '0.82rem', outline: 'none' }}
                      />
                      <button onClick={() => submitResale(item)} disabled={submitting} style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}>
                        {submitting ? '…' : 'Vendre'}
                      </button>
                      <button onClick={() => { setShowResale(false); setAskPrice('') }} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', fontSize: '0.78rem' }}>
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button onClick={() => { setShowResale(item.id); setAskPrice(String(item.price)) }} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: '0.75rem' }}>
                      🏷️ Revendre
                    </button>
                  )}
                </div>
              )}

              {item.checkedIn && (
                <div style={{ fontSize: '0.72rem', color: 'var(--success)', marginTop: 2 }}>✓ Validé à l'entrée</div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function MyTicketsModal({ open, purchases, myListings, onClose, toast, onListForResale, onCancelListing }) {
  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader title="🎟️ Mes Billets" />
      <ModalBody>
        {purchases.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>🎟️</div>
            <p>Aucun billet pour le moment</p>
            <p className={styles.emptySub}>Parcourez les événements et réservez !</p>
          </div>
        ) : (
          purchases.map(p => (
            <TicketCard
              key={p.id}
              purchase={p}
              myListings={myListings}
              toast={toast}
              onListForResale={onListForResale}
              onCancelListing={onCancelListing}
            />
          ))
        )}
      </ModalBody>
    </Modal>
  )
}
