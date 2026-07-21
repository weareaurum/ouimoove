import { useState } from 'react'
import { Modal, ModalHeader, ModalBody } from '../Modal.jsx'
import styles from './CheckoutModal.module.css'

const TmoneyLogo = () => (
  <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="44" height="44" rx="10" fill="#1A3F8F"/>
    <text x="22" y="22" textAnchor="middle" dominantBaseline="middle" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="13" fill="#FFD700" letterSpacing="-0.5">mixx</text>
    <circle cx="34" cy="34" r="8" fill="#FFD700"/>
    <text x="34" y="34" textAnchor="middle" dominantBaseline="middle" fontFamily="Arial" fontWeight="900" fontSize="6" fill="#1A3F8F">TG</text>
  </svg>
)

const FloozLogo = () => (
  <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="44" height="44" rx="10" fill="#F26522"/>
    <text x="22" y="17" textAnchor="middle" dominantBaseline="middle" fontFamily="Arial" fontWeight="700" fontSize="7" fill="white">MOOV Money</text>
    <text x="22" y="30" textAnchor="middle" dominantBaseline="middle" fontFamily="Arial Black, Arial" fontWeight="900" fontSize="13" fill="#1A6FBF">FLOOZ</text>
  </svg>
)

const CardIcon = () => (
  <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect width="44" height="44" rx="10" fill="rgba(90,31,71,0.15)" stroke="rgba(90,31,71,0.3)" strokeWidth="1"/>
    <rect x="8" y="14" width="28" height="18" rx="3" stroke="#5a1f47" strokeWidth="1.5" fill="none"/>
    <rect x="8" y="19" width="28" height="4" fill="#5a1f47" opacity="0.4"/>
    <rect x="10" y="26" width="8" height="2" rx="1" fill="#5a1f47"/>
    <rect x="20" y="26" width="6" height="2" rx="1" fill="#5a1f47" opacity="0.5"/>
  </svg>
)

const METHODS = [
  { id: 'card',   Logo: CardIcon,   label: 'Carte bancaire' },
  { id: 'tmoney', Logo: TmoneyLogo, label: 'Tmoney' },
  { id: 'flooz',  Logo: FloozLogo,  label: 'Flooz' },
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

  const submitFree = async () => {
    setLoading(true)
    await onConfirm('free', '', discountAmount)
    setLoading(false)
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

        {/* Free ticket — no payment needed */}
        {finalTotal === 0 ? (
          <>
            <div style={{ textAlign: 'center', padding: '18px 0', color: 'var(--success)', fontSize: '0.92rem', fontWeight: 600 }}>
              🎉 Billet(s) gratuit(s) — aucun paiement requis
            </div>
            <button className={styles.confirmBtn} onClick={submitFree} disabled={loading}>
              {loading ? 'Traitement en cours…' : 'Confirmer gratuitement'}
            </button>
          </>
        ) : (
          <>
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
                  <span className={styles.methodIcon}><m.Logo /></span>
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
          </>
        )}
      </ModalBody>
    </Modal>
  )
}
