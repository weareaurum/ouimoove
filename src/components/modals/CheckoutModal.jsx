import { useState } from 'react'
import { Modal, ModalHeader, ModalBody } from '../Modal.jsx'
import styles from './CheckoutModal.module.css'

const METHODS = [
  { id: 'card',   icon: '💳', label: 'Carte' },
  { id: 'tmoney', icon: '📱', label: 'T-Money' },
  { id: 'flooz',  icon: '🟡', label: 'Flooz' },
]

export function CheckoutModal({ open, cart, cartTotal, onClose, onConfirm }) {
  const [method, setMethod] = useState('card')
  const [phone, setPhone]   = useState('')
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const validate = () => {
    if (method !== 'card') {
      const digits = phone.replace(/[\s+]/g, '')
      if (digits.length < 8) return 'Numéro de téléphone invalide.'
    }
    return null
  }

  const submit = async () => {
    const err = validate()
    if (err) { setError(err); return }
    setError('')
    setLoading(true)
    await onConfirm(method, phone)
    setLoading(false)
  }

  return (
    <Modal open={open} onClose={onClose}>
      <ModalHeader title="💳 Paiement" subtitle="Sécurisé via PayDunya" />
      <ModalBody>
        {/* Order summary */}
        <div className={styles.summary}>
          {cart.map(item => (
            <div key={item.id} className={styles.summaryRow}>
              <span>{item.eventTitle} — {item.ticketName} ×{item.qty}</span>
              <span>{(item.price * item.qty).toLocaleString('fr-FR')} FCFA</span>
            </div>
          ))}
          <div className={[styles.summaryRow, styles.total].join(' ')}>
            <span>TOTAL</span>
            <span>{cartTotal.toLocaleString('fr-FR')} FCFA</span>
          </div>
        </div>

        {/* Payment method selector */}
        <p className={styles.sectionLabel}>Méthode de paiement</p>
        <div className={styles.methods}>
          {METHODS.map(m => (
            <button
              key={m.id}
              className={[styles.method, method === m.id ? styles.selected : ''].join(' ')}
              onClick={() => { setMethod(m.id); setError('') }}
            >
              <span className={styles.methodIcon}>{m.icon}</span>
              {m.label}
            </button>
          ))}
        </div>

        {/* Phone for mobile money */}
        {method !== 'card' && (
          <div className={styles.fields}>
            <div className={styles.group}>
              <label className={styles.label}>Numéro de téléphone</label>
              <input className={styles.input} placeholder="+228 90 00 00 00"
                value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>
        )}

        {error && (
          <p style={{ color: 'var(--danger)', fontSize: '0.82rem', marginBottom: 10 }}>{error}</p>
        )}

        <button className={styles.confirmBtn} onClick={submit} disabled={loading}>
          {loading ? 'Redirection vers PayDunya…' : `Payer avec PayDunya → ${cartTotal.toLocaleString('fr-FR')} FCFA`}
        </button>
      </ModalBody>
    </Modal>
  )
}
