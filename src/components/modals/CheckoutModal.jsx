import { useState } from 'react'
import { Modal, ModalHeader, ModalBody } from '../Modal.jsx'
import styles from './CheckoutModal.module.css'

const METHODS = [
  { id: 'card',   icon: '💳', label: 'Carte' },
  { id: 'tmoney', icon: '📱', label: 'T-Money' },
  { id: 'flooz',  icon: '🟡', label: 'Flooz' },
]

const PROMO_CODES = {
  'WELCOME20':  { pct: 20, label: '20% de réduction' },
  'OUIMOOVE10': { pct: 10, label: '10% de réduction' },
  'VIP50':      { pct: 50, label: '50% de réduction' },
  'TOGO2025':   { pct: 15, label: '15% de réduction' },
}

function formatCardNumber(val) {
  return val.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

export function CheckoutModal({ open, cart, cartTotal, onClose, onConfirm }) {
  const [method,  setMethod]  = useState('card')
  const [card,    setCard]    = useState('')
  const [exp,     setExp]     = useState('')
  const [cvv,     setCvv]     = useState('')
  const [phone,   setPhone]   = useState('')
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const [promoInput,    setPromoInput]    = useState('')
  const [promoApplied,  setPromoApplied]  = useState(null)
  const [promoError,    setPromoError]    = useState('')

  const discountAmount = promoApplied ? Math.round(cartTotal * promoApplied.pct / 100) : 0
  const finalTotal     = Math.max(0, cartTotal - discountAmount)

  const applyPromo = () => {
    const code = promoInput.trim().toUpperCase()
    if (!code) { setPromoError('Entrez un code promo.'); return }
    const promo = PROMO_CODES[code]
    if (!promo) { setPromoError('Code invalide ou expiré.'); setPromoApplied(null); return }
    setPromoApplied(promo)
    setPromoError('')
  }

  const removePromo = () => { setPromoApplied(null); setPromoInput(''); setPromoError('') }

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
    await onConfirm(method, phone, discountAmount)
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
          {promoApplied && (
            <div className={styles.summaryRow} style={{ color: 'var(--success)', fontSize: '0.82rem' }}>
              <span>🎟️ Code promo ({promoApplied.label})</span>
              <span>−{discountAmount.toLocaleString('fr-FR')} FCFA</span>
            </div>
          )}
          <div className={[styles.summaryRow, styles.total].join(' ')}>
            <span>TOTAL</span>
            <span>{finalTotal.toLocaleString('fr-FR')} FCFA</span>
          </div>
        </div>

        {/* Promo code */}
        <div style={{ marginBottom: 18 }}>
          <p className={styles.sectionLabel}>Code promo</p>
          {!promoApplied ? (
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                className={styles.input}
                placeholder="Ex: WELCOME20"
                value={promoInput}
                onChange={e => { setPromoInput(e.target.value.toUpperCase()); setPromoError('') }}
                onKeyDown={e => e.key === 'Enter' && applyPromo()}
                style={{ flex: 1, textTransform: 'uppercase', letterSpacing: '0.05em' }}
              />
              <button
                onClick={applyPromo}
                style={{ background: 'var(--bg3)', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 10, padding: '0 16px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, whiteSpace: 'nowrap' }}
              >
                Appliquer
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.3)', borderRadius: 10, padding: '10px 14px' }}>
              <span style={{ color: 'var(--success)', fontSize: '0.85rem', fontWeight: 600 }}>✓ {promoInput} — {promoApplied.label}</span>
              <button onClick={removePromo} style={{ background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.82rem' }}>✕ Retirer</button>
            </div>
          )}
          {promoError && <p style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: 6 }}>{promoError}</p>}
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
          {loading ? 'Traitement en cours…' : `Confirmer le paiement — ${finalTotal.toLocaleString('fr-FR')} FCFA`}
        </button>
      </ModalBody>
    </Modal>
  )
}
