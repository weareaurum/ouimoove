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
      // ── helpers ──────────────────────────────────────────────
      const rrect = (ctx, x, y, w, h, r) => {
        ctx.beginPath()
        ctx.moveTo(x + r, y)
        ctx.lineTo(x + w - r, y)
        ctx.quadraticCurveTo(x + w, y, x + w, y + r)
        ctx.lineTo(x + w, y + h - r)
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
        ctx.lineTo(x + r, y + h)
        ctx.quadraticCurveTo(x, y + h, x, y + h - r)
        ctx.lineTo(x, y + r)
        ctx.quadraticCurveTo(x, y, x + r, y)
        ctx.closePath()
      }

      const W = 640, H = 980
      const canvas = document.createElement('canvas')
      canvas.width  = W * 2   // retina
      canvas.height = H * 2
      canvas.style.width  = `${W}px`
      canvas.style.height = `${H}px`
      const ctx = canvas.getContext('2d')
      ctx.scale(2, 2)         // draw at 2× for crisp output

      // ── outer card ───────────────────────────────────────────
      ctx.shadowColor = 'rgba(0,0,0,0.6)'
      ctx.shadowBlur  = 0
      rrect(ctx, 0, 0, W, H, 24)
      ctx.fillStyle = '#0d0d1a'
      ctx.fill()
      ctx.shadowBlur = 0

      // ── decorative circle blobs ───────────────────────────────
      const blob = (x, y, r, color) => {
        ctx.save()
        ctx.globalAlpha = 0.18
        ctx.fillStyle = color
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill()
        ctx.restore()
      }
      blob(-40, 80,  180, '#7c3aed')
      blob(W + 20, 200, 160, '#ff6b35')
      blob(W - 60, H - 120, 140, '#7c3aed')
      blob(60, H - 80, 120, '#ff6b35')

      // ── top gradient banner ───────────────────────────────────
      const topGrad = ctx.createLinearGradient(0, 0, W, 0)
      topGrad.addColorStop(0, '#5b21b6')
      topGrad.addColorStop(0.5, '#7c3aed')
      topGrad.addColorStop(1, '#ff6b35')
      rrect(ctx, 0, 0, W, 200, 24)
      ctx.fillStyle = topGrad
      ctx.fill()
      // clip bottom corners of banner to be flat
      ctx.fillRect(0, 180, W, 20)

      // subtle dot-grid pattern on banner
      ctx.save()
      ctx.globalAlpha = 0.08
      ctx.fillStyle = '#fff'
      for (let gx = 16; gx < W; gx += 24)
        for (let gy = 16; gy < 200; gy += 24) {
          ctx.beginPath(); ctx.arc(gx, gy, 1.5, 0, Math.PI * 2); ctx.fill()
        }
      ctx.restore()

      // ── logo ─────────────────────────────────────────────────
      // Oui (white) + Moove (orange)
      ctx.textBaseline = 'middle'
      ctx.font = 'bold 44px Arial'
      ctx.fillStyle = '#ffffff'
      ctx.textAlign  = 'left'
      const logoX = W / 2 - 92
      ctx.fillText('Oui', logoX, 62)
      ctx.fillStyle = '#ff6b35'
      ctx.fillText('Moove', logoX + 74, 62)

      ctx.font      = '13px Arial'
      ctx.fillStyle = 'rgba(255,255,255,0.7)'
      ctx.textAlign = 'center'
      ctx.fillText('BILLET ÉLECTRONIQUE', W / 2, 92)

      // ── event emoji + name ────────────────────────────────────
      const firstItem = purchase.items[0]
      const title     = firstItem?.eventTitle || 'Événement'
      const emoji     = purchase.items[0]?.eventEmoji || '🎟️'

      ctx.font      = '36px Arial'
      ctx.textAlign = 'center'
      ctx.fillText(emoji, W / 2, 140)

      ctx.font      = 'bold 22px Arial'
      ctx.fillStyle = '#ffffff'
      const shortTitle = title.length > 32 ? title.slice(0, 32) + '…' : title
      ctx.fillText(shortTitle, W / 2, 172)

      // ── ticket type badges ────────────────────────────────────
      const badges   = purchase.items.map(i => `${i.ticketName} ×${i.qty}`)
      let bx = W / 2 - (badges.join('  ').length * 4.2)
      ctx.font = 'bold 11px Arial'
      badges.forEach(badge => {
        const tw = ctx.measureText(badge).width + 20
        rrect(ctx, bx, 190, tw, 22, 11)
        ctx.fillStyle = 'rgba(255,255,255,0.18)'
        ctx.fill()
        ctx.fillStyle = '#ffffff'
        ctx.textAlign = 'left'
        ctx.fillText(badge, bx + 10, 201)
        bx += tw + 8
      })

      // ── info grid (dark section) ──────────────────────────────
      const infoTop = 226
      const col1 = 48, col2 = W / 2 + 16
      const drawField = (label, value, x, y) => {
        ctx.font      = '11px Arial'
        ctx.fillStyle = 'rgba(255,255,255,0.4)'
        ctx.textAlign = 'left'
        ctx.fillText(label.toUpperCase(), x, y)
        ctx.font      = 'bold 14px Arial'
        ctx.fillStyle = '#ffffff'
        ctx.fillText(value, x, y + 18)
      }

      const ref   = purchase.id.slice(0, 8).toUpperCase()
      const date  = new Date(purchase.date).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' })
      const meth  = (purchase.method || 'Carte').charAt(0).toUpperCase() + (purchase.method || 'carte').slice(1)
      const total = `${purchase.total.toLocaleString('fr-FR')} FCFA`

      drawField('Référence',   ref,   col1, infoTop)
      drawField('Date d\'achat', date, col2, infoTop)
      drawField('Méthode',     meth,  col1, infoTop + 52)
      drawField('Montant',     total, col2, infoTop + 52)

      // ── tear line ─────────────────────────────────────────────
      const tearY = 330
      // notch circles on each side
      ctx.fillStyle = '#0d0d1a'
      ctx.beginPath(); ctx.arc(0,   tearY, 18, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.arc(W,   tearY, 18, 0, Math.PI * 2); ctx.fill()
      // dashed line
      ctx.save()
      ctx.setLineDash([8, 6])
      ctx.strokeStyle = 'rgba(255,255,255,0.15)'
      ctx.lineWidth   = 1.5
      ctx.beginPath(); ctx.moveTo(22, tearY); ctx.lineTo(W - 22, tearY); ctx.stroke()
      ctx.restore()

      // scissors icon
      ctx.font      = '16px Arial'
      ctx.fillStyle = 'rgba(255,255,255,0.2)'
      ctx.textAlign = 'center'
      ctx.fillText('✂', W / 2, tearY + 6)

      // ── QR section (white card) ───────────────────────────────
      const qrY = tearY + 28
      rrect(ctx, 40, qrY, W - 80, 380, 16)
      ctx.fillStyle = '#ffffff'
      ctx.fill()

      // QR code
      const qrPayload = `OUIMOOVE|${purchase.id}|${title}|${total}`
      const qrDataUrl = await QRCode.toDataURL(qrPayload, {
        width: 220,
        margin: 1,
        color: { dark: '#0d0d1a', light: '#ffffff' },
      })
      const qrImg = new Image()
      await new Promise(res => { qrImg.onload = res; qrImg.src = qrDataUrl })
      const qrSize = 220
      const qrX    = (W - qrSize) / 2
      ctx.drawImage(qrImg, qrX, qrY + 28, qrSize, qrSize)

      // scan label
      ctx.font      = 'bold 12px Arial'
      ctx.fillStyle = '#6b7280'
      ctx.textAlign = 'center'
      ctx.fillText('SCANNER À L\'ENTRÉE', W / 2, qrY + qrSize + 52)

      // ref below qr
      ctx.font      = '11px Arial'
      ctx.fillStyle = '#9ca3af'
      ctx.fillText(`Réf: ${ref}`, W / 2, qrY + qrSize + 70)

      // thin purple line at bottom of white card
      const accentGrad = ctx.createLinearGradient(40, 0, W - 40, 0)
      accentGrad.addColorStop(0, '#7c3aed')
      accentGrad.addColorStop(1, '#ff6b35')
      ctx.fillStyle = accentGrad
      ctx.fillRect(40, qrY + 374, W - 80, 6)

      // ── footer ────────────────────────────────────────────────
      const footY = qrY + 408
      ctx.font      = '12px Arial'
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      ctx.textAlign = 'center'
      ctx.fillText('Merci pour votre achat — ouimoove.com', W / 2, footY)

      // powered by line
      ctx.font      = '10px Arial'
      ctx.fillStyle = 'rgba(255,255,255,0.18)'
      ctx.fillText(`Généré le ${new Date().toLocaleDateString('fr-FR')}`, W / 2, footY + 20)

      // ── download ──────────────────────────────────────────────
      canvas.toBlob(blob => {
        const a = document.createElement('a')
        a.href     = URL.createObjectURL(blob)
        a.download = `billet-ouimoove-${ref}.png`
        a.click()
        URL.revokeObjectURL(a.href)
      }, 'image/png')

      toast('Billet téléchargé ✓', 'success')
    } catch(e) {
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
