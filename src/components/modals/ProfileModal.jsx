import { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalBody } from '../Modal.jsx'
import styles from './ProfileModal.module.css'

export function ProfileModal({ open, user, isOrganizer, onClose, onSave, onLogout, onApply, onSubscribePush, onUnsubscribePush }) {
  const [name, setName]         = useState('')
  const [email, setEmail]       = useState('')
  const [pwd, setPwd]           = useState('')
  const [error, setError]       = useState('')
  const [applyReason, setApplyReason] = useState('')
  const [applyStatus, setApplyStatus] = useState(null)
  const [applyMsg, setApplyMsg] = useState('')
  const [pushState, setPushState] = useState('unknown') // 'unknown'|'granted'|'denied'|'loading'

  useEffect(() => {
    if ('Notification' in window) setPushState(Notification.permission)
  }, [open])

  useEffect(() => {
    if (user) {
      setName(user.name)
      setEmail(user.email)
      setPwd('')
      setError('')
      setApplyReason('')
      setApplyStatus(null)
      setApplyMsg('')
    }
  }, [user, open])

  if (!user) return null

  const initials = user.name
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const save = () => {
    if (!name.trim() || !email.trim()) {
      setError('Le nom et l\'email sont requis.')
      return
    }
    setError('')
    onSave(name.trim(), email.trim(), pwd || undefined)
  }

  const submitApply = async () => {
    if (!applyReason.trim()) { setApplyMsg('Expliquez brièvement votre projet.'); setApplyStatus('error'); return }
    setApplyStatus('loading')
    const result = await onApply(applyReason.trim())
    if (result?.ok) {
      setApplyStatus('ok')
      setApplyMsg('Demande envoyée ! Nous reviendrons vers vous.')
    } else {
      setApplyStatus('error')
      setApplyMsg(result?.error || 'Erreur lors de l\'envoi.')
    }
  }

  return (
    <Modal open={open} onClose={onClose}>
      <ModalHeader title="👤 Mon Profil" />
      <ModalBody>
        <div className={styles.avatarWrap}>
          <div className={styles.avatar}>{initials}</div>
          {user.isGoogle && <div className={styles.googleTag}>via Google</div>}
        </div>

        <div className={styles.group}>
          <label className={styles.label}>Nom complet</label>
          <input className={styles.input} value={name}
            onChange={e => setName(e.target.value)} placeholder="Votre nom" />
        </div>

        <div className={styles.group}>
          <label className={styles.label}>Email</label>
          <input className={styles.input} type="email" value={email}
            onChange={e => setEmail(e.target.value)} placeholder="vous@email.com" />
        </div>

        <div className={styles.group}>
          <label className={styles.label}>Nouveau mot de passe <span className={styles.optional}>(laisser vide pour ne pas changer)</span></label>
          <input className={styles.input} type="password" value={pwd}
            onChange={e => setPwd(e.target.value)} placeholder="••••••••" />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button className={styles.saveBtn} onClick={save}>
          Sauvegarder les modifications
        </button>

        {!isOrganizer && onApply && (
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <p style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 6 }}>🎤 Devenir organisateur</p>
            <p style={{ color: 'var(--muted)', fontSize: '0.78rem', marginBottom: 10 }}>
              Vous souhaitez créer et gérer vos propres événements ? Soumettez une demande.
            </p>
            {applyStatus === 'ok' ? (
              <p style={{ color: 'var(--success)', fontSize: '0.82rem' }}>✓ {applyMsg}</p>
            ) : (
              <>
                <textarea
                  style={{
                    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
                    borderRadius: 10, padding: '9px 13px', color: 'var(--text)', fontSize: '0.85rem',
                    outline: 'none', resize: 'vertical', boxSizing: 'border-box',
                  }}
                  rows={3}
                  placeholder="Décrivez votre projet (type d'événements, ville, fréquence…)"
                  value={applyReason}
                  onChange={(e) => setApplyReason(e.target.value)}
                />
                {applyStatus === 'error' && (
                  <p style={{ color: 'var(--danger)', fontSize: '0.78rem', marginTop: 4 }}>{applyMsg}</p>
                )}
                <button
                  onClick={submitApply}
                  disabled={applyStatus === 'loading'}
                  style={{
                    marginTop: 8, width: '100%', background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
                    color: '#fff', border: 'none', borderRadius: 10, padding: '10px 0',
                    fontSize: '0.88rem', fontWeight: 600, cursor: applyStatus === 'loading' ? 'not-allowed' : 'pointer',
                    opacity: applyStatus === 'loading' ? 0.7 : 1,
                  }}
                >
                  {applyStatus === 'loading' ? 'Envoi…' : 'Envoyer la demande'}
                </button>
              </>
            )}
          </div>
        )}

        {/* Push notifications toggle */}
        {'Notification' in window && pushState !== 'denied' && (
          <div style={{ marginTop: 20, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
            <p style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 6 }}>🔔 Notifications push</p>
            <p style={{ color: 'var(--muted)', fontSize: '0.78rem', marginBottom: 10 }}>
              {pushState === 'granted'
                ? 'Vous recevez des notifications pour vos achats et événements.'
                : 'Activez les notifications pour recevoir vos confirmations de billets.'}
            </p>
            <button
              disabled={pushState === 'loading'}
              onClick={async () => {
                if (pushState === 'granted') {
                  setPushState('loading')
                  await onUnsubscribePush?.()
                  setPushState('default')
                } else {
                  setPushState('loading')
                  const ok = await onSubscribePush?.()
                  setPushState(ok ? 'granted' : (Notification.permission === 'denied' ? 'denied' : 'default'))
                }
              }}
              style={{
                width: '100%', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 0',
                fontSize: '0.85rem', fontWeight: 600, cursor: pushState === 'loading' ? 'not-allowed' : 'pointer',
                background: pushState === 'granted' ? 'rgba(239,68,68,.1)' : 'linear-gradient(135deg,var(--purple),var(--purple2))',
                color: pushState === 'granted' ? 'var(--danger)' : '#fff',
                opacity: pushState === 'loading' ? 0.6 : 1,
              }}
            >
              {pushState === 'loading' ? '…' : pushState === 'granted' ? '🔕 Désactiver les notifications' : '🔔 Activer les notifications'}
            </button>
          </div>
        )}

        <button className={styles.logoutBtn} onClick={onLogout}>
          Se déconnecter
        </button>
      </ModalBody>
    </Modal>
  )
}
