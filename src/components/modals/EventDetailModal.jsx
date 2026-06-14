import { useState, useEffect } from 'react'
import { Modal, ModalBody } from '../Modal.jsx'
import { formatDate, fmtPrice } from '../../utils/helpers.js'
import styles from './EventDetailModal.module.css'

export function EventDetailModal({ open, event, onClose, onAddToCart }) {
  const [selections, setSelections] = useState({})

  useEffect(() => { if (open) setSelections({}) }, [open])

  if (!event) return null

  const changeQty = (idx, delta) => {
    const key = `${event.id}_${idx}`
    const avail = event.tickets[idx].total - event.tickets[idx].sold
    const cur = selections[key] ?? 0
    const next = Math.max(0, Math.min(cur + delta, avail))
    setSelections(s => ({ ...s, [key]: next }))
  }

  const total = event.tickets.reduce((sum, t, i) => {
    const qty = selections[`${event.id}_${i}`] ?? 0
    return sum + qty * t.price
  }, 0)

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalBody>
        {event.imageUrl ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            className={styles.coverImg}
            onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex' }}
          />
        ) : null}
        <div className={styles.imgPlaceholder} style={event.imageUrl ? { display: 'none' } : {}}>{event.emoji || '🎉'}</div>

        <div className={styles.categoryBadge}>{event.category}</div>
        <h2 className={styles.title}>{event.title}</h2>
        <p className={styles.desc}>{event.desc}</p>

        <div className={styles.meta}>
          <span>📅 <b>{formatDate(event.date)}</b> à {event.time}</span>
          <span>📍 {event.location}, {event.city}</span>
        </div>

        <h3 className={styles.sectionTitle}>Billets disponibles</h3>

        {event.tickets.map((t, i) => {
          const avail = t.total - t.sold
          const qty = selections[`${event.id}_${i}`] ?? 0
          return (
            <div key={i} className={styles.ticketRow}>
              <div className={styles.ticketInfo}>
                <div className={styles.ticketName}>{t.name}</div>
                <div className={styles.ticketPrice}>{fmtPrice(t.price)}</div>
                <div className={styles.ticketLeft}>{avail} restants</div>
              </div>
              <div className={styles.qtyCtrl}>
                <button className={styles.qtyBtn} onClick={() => changeQty(i, -1)}>−</button>
                <span className={styles.qtyVal}>{qty}</span>
                <button className={styles.qtyBtn} onClick={() => changeQty(i, +1)} disabled={qty >= avail}>+</button>
              </div>
            </div>
          )
        })}

        <div className={styles.totalRow}>
          <span className={styles.totalLabel}>Total estimé</span>
          <span className={styles.totalVal}>{total.toLocaleString('fr-FR')} FCFA</span>
        </div>

        <button className={styles.addBtn} onClick={() => onAddToCart(selections)}>
          Ajouter au panier 🛒
        </button>
      </ModalBody>
    </Modal>
  )
}
