import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { jsPDF } from 'jspdf'
import { Modal, ModalHeader, ModalBody } from '../Modal.jsx'
import styles from './MyTicketsModal.module.css'

function TicketCard({ purchase, myListings, toast, onListForResale, onCancelListing }) {
  const qrRef      = useRef(null)
  const qrRendered = useRef(false)
  const [showResale, setShowResale] = useState(false)
  const [askPrice,   setAskPrice]   = useState('')
  const [submitting, setSubmitting] = useState(false)

  const generateQR = async () => {
    if (qrRendered.current) {
      qrRef.current.innerHTML = ''
      qrRendered.current = false
      return
    }
    try {
      const url = await QRCode.toDataURL('OUIMOOVE-' + purchase.id, {
        width: 140,
        color: { dark: '#7c3aed', light: '#15151f' },
      })
      const img = document.createElement('img')
      img.src = url
      img.style.borderRadius = '10px'
      img.style.display = 'block'
      qrRef.current.appendChild(img)
      qrRendered.current = true
    } catch {
      toast('Erreur QR Code', 'error')
    }
  }

  const downloadTicket = async () => {
    try {
      const firstItem = purchase.items[0]
      const title  = firstItem?.eventTitle || 'Événement'
      const ref    = purchase.id.slice(0, 8).toUpperCase()
      const date   = new Date(purchase.date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
      const meth   = (purchase.method || 'Carte').charAt(0).toUpperCase() + (purchase.method || 'carte').slice(1)
      const total  = `${purchase.total.toLocaleString('fr-FR')} FCFA`

      // QR code as data URL
      const qrDataUrl = await QRCode.toDataURL(
        `OUIMOOVE|${purchase.id}|${title}|${total}`,
        { width: 200, margin: 1, color: { dark: '#0d0d1a', light: '#ffffff' } }
      )

      // A5 portrait (148 × 210 mm)
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' })
      const W = 148, H = 210

      // ── dark background ───────────────────────────────────────
      doc.setFillColor(13, 13, 26)
      doc.rect(0, 0, W, H, 'F')

      // ── purple header band ────────────────────────────────────
      doc.setFillColor(92, 33, 182)
      doc.rect(0, 0, W, 52, 'F')
      // orange right slice
      doc.setFillColor(255, 107, 53)
      doc.rect(W * 0.55, 0, W * 0.45, 52, 'F')
      // blend middle — purple strip on top of orange to fake gradient
      doc.setFillColor(124, 58, 237)
      doc.rect(W * 0.3, 0, W * 0.4, 52, 'F')

      // ── logo text ─────────────────────────────────────────────
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(26)
      doc.setTextColor(255, 255, 255)
      doc.text('Oui', W / 2 - 14, 22, { align: 'right' })
      doc.setTextColor(255, 107, 53)
      doc.text('Moove', W / 2 - 12, 22, { align: 'left' })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(200, 180, 255)
      doc.text('BILLET ÉLECTRONIQUE', W / 2, 31, { align: 'center' })

      // ── event title ───────────────────────────────────────────
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(13)
      doc.setTextColor(255, 255, 255)
      const shortTitle = title.length > 38 ? title.slice(0, 38) + '...' : title
      doc.text(shortTitle, W / 2, 44, { align: 'center' })

      // ── ticket type tags ──────────────────────────────────────
      doc.setFontSize(8)
      const tags = purchase.items.map(i => `${i.ticketName} x${i.qty}`)
      const tagStr = tags.join('   •   ')
      doc.setTextColor(200, 180, 255)
      doc.text(tagStr, W / 2, 51, { align: 'center' })

      // ── info grid ─────────────────────────────────────────────
      const infoY = 60
      const drawField = (label, value, x, y) => {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(7)
        doc.setTextColor(120, 100, 160)
        doc.text(label.toUpperCase(), x, y)
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(9)
        doc.setTextColor(255, 255, 255)
        doc.text(value, x, y + 5)
      }

      drawField('Référence',    ref,   14,        infoY)
      drawField("Date d'achat", date,  W / 2 + 4, infoY)
      drawField('Méthode',      meth,  14,        infoY + 16)
      drawField('Montant total', total, W / 2 + 4, infoY + 16)

      // ── dashed tear line ──────────────────────────────────────
      const tearY = 88
      doc.setDrawColor(80, 60, 120)
      doc.setLineWidth(0.3)
      doc.setLineDashPattern([2, 1.5], 0)
      doc.line(14, tearY, W - 14, tearY)
      doc.setLineDashPattern([], 0)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(80, 60, 120)
      doc.text('✂  détachez ici', W / 2, tearY + 3, { align: 'center' })

      // ── white QR card ─────────────────────────────────────────
      const cardY = tearY + 8
      const cardH = 100
      doc.setFillColor(255, 255, 255)
      doc.roundedRect(10, cardY, W - 20, cardH, 4, 4, 'F')

      // QR code image
      const qrSize = 56
      const qrX    = (W - qrSize) / 2
      doc.addImage(qrDataUrl, 'PNG', qrX, cardY + 8, qrSize, qrSize)

      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7)
      doc.setTextColor(100, 100, 120)
      doc.text('SCANNER À L\'ENTRÉE', W / 2, cardY + qrSize + 14, { align: 'center' })

      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(150, 150, 170)
      doc.text(`Réf: ${ref}`, W / 2, cardY + qrSize + 20, { align: 'center' })

      // accent line at bottom of card
      doc.setFillColor(124, 58, 237)
      doc.rect(10, cardY + cardH - 3, (W - 20) / 2, 3, 'F')
      doc.setFillColor(255, 107, 53)
      doc.rect(10 + (W - 20) / 2, cardY + cardH - 3, (W - 20) / 2, 3, 'F')

      // ── items list ────────────────────────────────────────────
      let iy = cardY + cardH + 10
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.5)
      doc.setTextColor(160, 140, 200)
      doc.text('DÉTAIL DES BILLETS', 14, iy)
      iy += 6

      purchase.items.forEach(item => {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(8)
        doc.setTextColor(220, 220, 240)
        doc.text(`• ${item.eventTitle} — ${item.ticketName} ×${item.qty}`, 14, iy)
        doc.setTextColor(255, 107, 53)
        doc.text(`${(item.price * item.qty).toLocaleString('fr-FR')} FCFA`, W - 14, iy, { align: 'right' })
        iy += 6
      })

      // total line
      doc.setDrawColor(60, 40, 90)
      doc.setLineWidth(0.3)
      doc.line(14, iy, W - 14, iy)
      iy += 5
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(255, 255, 255)
      doc.text('TOTAL', 14, iy)
      doc.setTextColor(255, 107, 53)
      doc.text(total, W - 14, iy, { align: 'right' })

      // ── footer ────────────────────────────────────────────────
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.5)
      doc.setTextColor(60, 50, 90)
      doc.text('Merci pour votre achat sur OuiMoove !   •   ouimoove.com', W / 2, H - 6, { align: 'center' })
      doc.text(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, W / 2, H - 2, { align: 'center' })

      doc.save(`billet-ouimoove-${ref}.pdf`)
      toast('Billet téléchargé ✓', 'success')
    } catch (e) {
      console.error(e)
      toast('Erreur lors du téléchargement', 'error')
    }
  }

  const submitResale = async (item) => {
    const price = parseInt(askPrice)
    if (!price || price <= 0) { toast('Entrez un prix valide.', 'error'); return }
    setSubmitting(true)
    const result = await onListForResale({
      orderItemId:    item.id,
      orderId:        purchase.id,
      eventId:        item.eventId,
      ticketTypeId:   item.ticketTypeId,
      eventTitle:     item.eventTitle,
      eventDate:      null,
      eventCity:      '',
      eventEmoji:     '🎟️',
      eventImageUrl:  null,
      ticketName:     item.ticketName,
      quantity:       item.qty,
      originalPrice:  item.price,
      askPrice:       price,
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

  return (
    <div className={styles.ticket} style={{ opacity: isRefunded ? 0.6 : 1 }}>
      <div className={styles.ticketHeader}>
        <div>
          <div className={styles.eventName}>{purchase.items[0]?.eventTitle}</div>
          <div className={styles.purchaseDate}>
            Acheté le {new Date(purchase.date).toLocaleDateString('fr-FR')}
            {purchase.items[0]?.isResale && (
              <span style={{ marginLeft: 6, color: 'var(--orange)', fontSize: '0.72rem', fontWeight: 700 }}>· Revente</span>
            )}
          </div>
        </div>
        <div className={styles.statusBadge} style={{ background: isRefunded ? 'rgba(239,68,68,.15)' : undefined, color: isRefunded ? 'var(--danger)' : undefined }}>
          {isRefunded ? '↩ Remboursé' : '✓ Confirmé'}
        </div>
      </div>

      <div className={styles.itemsList}>
        {purchase.items.map((item, i) => {
          const listing = myListings?.find(l => l.order_item_id === item.id && l.status === 'active')
          return (
            <div key={i}>
              <div className={styles.itemRow}>
                <span style={{ textDecoration: item.resold ? 'line-through' : 'none', color: item.resold ? 'var(--muted)' : undefined }}>
                  {item.eventTitle} — {item.ticketName}
                  {item.resold && <span style={{ color: 'var(--danger)', fontSize: '0.72rem', marginLeft: 6 }}>Revendu</span>}
                </span>
                <span>×{item.qty} · {(item.price * item.qty).toLocaleString('fr-FR')} FCFA</span>
              </div>

              {/* Resale controls per item */}
              {!isRefunded && !item.resold && !item.checkedIn && !item.isResale && onListForResale && (
                <div style={{ marginLeft: 0, marginTop: 6, marginBottom: 4 }}>
                  {listing ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,107,53,.08)', border: '1px solid rgba(255,107,53,.3)', borderRadius: 8, padding: '6px 10px' }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--orange)', flex: 1 }}>
                        🏷️ En vente à {listing.ask_price_cfa.toLocaleString('fr-FR')} FCFA
                      </span>
                      <button
                        onClick={() => onCancelListing(listing.id)}
                        style={{ background: 'transparent', border: '1px solid rgba(239,68,68,.4)', color: 'var(--danger)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: '0.72rem' }}
                      >
                        Retirer
                      </button>
                    </div>
                  ) : showResale === item.id ? (
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <input
                        autoFocus
                        type="number"
                        min="1"
                        placeholder={`Prix (min ${item.price.toLocaleString('fr-FR')} FCFA)`}
                        value={askPrice}
                        onChange={e => setAskPrice(e.target.value)}
                        style={{ flex: 1, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 10px', color: 'var(--text)', fontSize: '0.82rem', outline: 'none' }}
                      />
                      <button
                        onClick={() => submitResale(item)}
                        disabled={submitting}
                        style={{ background: 'var(--orange)', color: '#fff', border: 'none', borderRadius: 8, padding: '5px 12px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700 }}
                      >
                        {submitting ? '…' : 'Vendre'}
                      </button>
                      <button
                        onClick={() => { setShowResale(false); setAskPrice('') }}
                        style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 8, padding: '5px 8px', cursor: 'pointer', fontSize: '0.78rem' }}
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setShowResale(item.id); setAskPrice(String(item.price)) }}
                      style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      🏷️ Revendre
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className={styles.ticketTotal}>
        {purchase.total.toLocaleString('fr-FR')} FCFA
      </div>

      <div ref={qrRef} className={styles.qrContainer} />

      {!isRefunded && (
        <div className={styles.actions}>
          <button className={styles.actionBtn} onClick={generateQR}>
            📱 QR Code
          </button>
          <button className={[styles.actionBtn, styles.actionBtnPurple].join(' ')} onClick={downloadTicket}>
            ⬇️ Télécharger
          </button>
        </div>
      )}
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
