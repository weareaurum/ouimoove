import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'
import { Modal, ModalHeader, ModalBody } from '../Modal.jsx'
import styles from './MyTicketsModal.module.css'

function TicketCard({ purchase, toast }) {
  const qrRef = useRef(null)
  const qrRendered = useRef(false)

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
    } catch (e) {
      toast('Erreur QR Code', 'error')
    }
  }

  const downloadTicket = () => {
    const lines = [
      'OuiMoove — Billet Électronique',
      '================================',
      '',
      `Référence   : ${purchase.id}`,
      `Acheteur    : ${purchase.userName}`,
      `Date achat  : ${new Date(purchase.date).toLocaleDateString('fr-FR')}`,
      `Méthode     : ${purchase.method}`,
      '',
      'Billets :',
      ...purchase.items.map(i => `  • ${i.eventTitle} — ${i.ticketName} ×${i.qty} = ${(i.price * i.qty).toLocaleString('fr-FR')} FCFA`),
      '',
      `TOTAL : ${purchase.total.toLocaleString('fr-FR')} FCFA`,
      '',
      'Merci pour votre achat sur OuiMoove !',
    ]
    const blob = new Blob([lines.join('\n')], { type: 'text/plain' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `billet-${purchase.id}.txt`
    a.click()
    URL.revokeObjectURL(a.href)
    toast('Billet téléchargé ✓', 'success')
  }

  return (
    <div className={styles.ticket}>
      <div className={styles.ticketHeader}>
        <div>
          <div className={styles.eventName}>{purchase.items[0]?.eventTitle}</div>
          <div className={styles.purchaseDate}>
            Acheté le {new Date(purchase.date).toLocaleDateString('fr-FR')}
          </div>
        </div>
        <div className={styles.statusBadge}>✓ Confirmé</div>
      </div>

      <div className={styles.itemsList}>
        {purchase.items.map((item, i) => (
          <div key={i} className={styles.itemRow}>
            <span>{item.eventTitle} — {item.ticketName}</span>
            <span>×{item.qty} · {(item.price * item.qty).toLocaleString('fr-FR')} FCFA</span>
          </div>
        ))}
      </div>

      <div className={styles.ticketTotal}>
        {purchase.total.toLocaleString('fr-FR')} FCFA
      </div>

      <div ref={qrRef} className={styles.qrContainer} />

      <div className={styles.actions}>
        <button className={styles.actionBtn} onClick={generateQR}>
          📱 QR Code
        </button>
        <button className={[styles.actionBtn, styles.actionBtnPurple].join(' ')} onClick={downloadTicket}>
          ⬇️ Télécharger
        </button>
      </div>
    </div>
  )
}

export function MyTicketsModal({ open, purchases, onClose, toast }) {
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
            <TicketCard key={p.id} purchase={p} toast={toast} />
          ))
        )}
      </ModalBody>
    </Modal>
  )
}
