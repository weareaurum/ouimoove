import { useState } from 'react'
import { Modal, ModalHeader, ModalBody } from '../Modal.jsx'
import styles from './CheckoutModal.module.css'

const METHODS = [
  { id: 'card',   icon: '💳', label: 'Carte' },
  { id: 'tmoney', icon: '📱', label: 'T-Money' },
  { id: 'flooz',  icon: '🟡', label: 'Flooz' },
]

function formatCardNumber(val) {
  return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

export function CheckoutModal({ open, cart, cartTotal, onClose, onConfirm }) {
  const [method, setMethod] = useState('card')
  const [card,   setCard]   = useState('')
  const [exp,    setExp]    = useState('')
  const [cvv,    setCvv]    = useState('')
  const [phone,  setPhone]  = useState('')
  const [error,  setError]  = useState('')
  const [loading, setLoading] = useState(false)

  const validate = () => {
    if (method === 'card') {
      if (card.replace(/\s/g, '').length < 16) return 'Numéro de carte invalide.'
      if (exp.length < 5) return "Date d'expiration invalide."
      if (cvv.length < 3) return 'CVV invalide.'
    } else {
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
      <ModalHeader title="💳 Paiement" subtitle="Paiement sécurisé" />
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

        {/* Card fields */}
        {method === 'card' && (
          <div className={styles.fields}>
            <div className={styles.group}>
              <label className={styles.label}>Numéro de carte</label>
              <input className={styles.input} placeholder="4242 4242 4242 4242"
                value={card} onChange={e => setCard(formatCardNumber(e.target.value))} />
            </div>
            <div className={styles.row}>
              <div className={styles.group}>
                <label className={styles.label}>Expiration</label>
                <input className={styles.input} placeholder="MM/AA" maxLength={5}
                  value={exp} onChange={e => setExp(e.target.value)} />
              </div>
              <div className={styles.group}>
                <label className={styles.label}>CVV</label>
                <input className={styles.input} placeholder="123" maxLength={3}
                  value={cvv} onChange={e => setCvv(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Mobile money fields */}
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
          {loading ? 'Traitement en cours…' : `Confirmer le paiement — ${cartTotal.toLocaleString('fr-FR')} FCFA`}
        </button>
      </ModalBody>
    </Modal>
  )
}
