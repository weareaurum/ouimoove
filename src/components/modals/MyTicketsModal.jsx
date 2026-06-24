import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
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
      const ticketData = [
        `OuiMoove`,
        `REF:${purchase.id}`,
        purchase.items.map(i => `${i.eventTitle}|${i.ticketName}|x${i.qty}`).join(';'),
        `TOTAL:${purchase.total}FCFA`,
      ].join('\n')

      // Build a canvas with QR + ticket info
      const qrDataUrl = await QRCode.toDataURL(ticketData, {
        width: 300,
        margin: 2,
        color: { dark: '#7c3aed', light: '#ffffff' },
      })

      const canvas = document.createElement('canvas')
      canvas.width = 600
      canvas.height = 820
      const ctx = canvas.getContext('2d')

      // Background
      ctx.fillStyle = '#15151f'
      ctx.fillRect(0, 0, 600, 820)

      // Header bar
      const grad = ctx.createLinearGradient(0, 0, 600, 0)
      grad.addColorStop(0, '#7c3aed')
      grad.addColorStop(1, '#ff6b35')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 600, 8)

      // Logo text
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 28px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('OuiMoove', 300, 56)

      ctx.fillStyle = '#a78bfa'
      ctx.font = '14px Arial'
      ctx.fillText('Billet Électronique', 300, 80)

      // Dashed separator
      ctx.setLineDash([8, 6])
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(40, 100); ctx.lineTo(560, 100); ctx.stroke()
      ctx.setLineDash([])

      // Event info
      const firstItem = purchase.items[0]
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 20px Arial'
      ctx.textAlign = 'center'
      const title = firstItem?.eventTitle || 'Événement'
      ctx.fillText(title.length > 38 ? title.slice(0, 38) + '…' : title, 300, 134)

      ctx.fillStyle = '#a78bfa'
      ctx.font = '13px Arial'
      const ticketNames = purchase.items.map(i => `${i.ticketName} ×${i.qty}`).join(' · ')
      ctx.fillText(ticketNames, 300, 158)

      // QR Code
      const qrImg = new Image()
      await new Promise(resolve => { qrImg.onload = resolve; qrImg.src = qrDataUrl })
      const qrSize = 280
      const qrX = (600 - qrSize) / 2
      // White rounded rect behind QR
      ctx.fillStyle = '#ffffff'
      ctx.beginPath()
      ctx.roundRect(qrX - 12, 176, qrSize + 24, qrSize + 24, 16)
      ctx.fill()
      ctx.drawImage(qrImg, qrX, 188, qrSize, qrSize)

      // Scan label
      ctx.fillStyle = '#6b7280'
      ctx.font = '12px Arial'
      ctx.fillText('Scanner à l\'entrée', 300, 494)

      // Info rows
      const infoY = 524
      const drawInfo = (label, value, y) => {
        ctx.textAlign = 'left'
        ctx.fillStyle = '#6b7280'
        ctx.font = '12px Arial'
        ctx.fillText(label, 60, y)
        ctx.textAlign = 'right'
        ctx.fillStyle = '#e5e7eb'
        ctx.font = '13px Arial'
        ctx.fillText(value, 540, y)
      }

      drawInfo('Référence', purchase.id.slice(0, 8).toUpperCase(), infoY)
      drawInfo('Date d\'achat', new Date(purchase.date).toLocaleDateString('fr-FR'), infoY + 34)
      drawInfo('Méthode', purchase.method || 'Carte', infoY + 68)
      drawInfo('Total', `${purchase.total.toLocaleString('fr-FR')} FCFA`, infoY + 102)

      // Bottom dashed
      ctx.setLineDash([8, 6])
      ctx.strokeStyle = 'rgba(255,255,255,0.12)'
      ctx.beginPath(); ctx.moveTo(40, 714); ctx.lineTo(560, 714); ctx.stroke()
      ctx.setLineDash([])

      ctx.fillStyle = '#4b5563'
      ctx.font = '12px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('Merci pour votre achat sur OuiMoove !', 300, 744)

      ctx.fillStyle = '#374151'
      ctx.font = '11px Arial'
      ctx.fillText('ouimoove.com', 300, 764)

      // Bottom accent bar
      ctx.fillStyle = grad
      ctx.fillRect(0, 812, 600, 8)

      // Download
      canvas.toBlob(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `billet-ouimoove-${purchase.id.slice(0, 8)}.png`
        a.click()
        URL.revokeObjectURL(a.href)
      }, 'image/png')

      toast('Billet téléchargé ✓', 'success')
    } catch {
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
