import { useState } from 'react'
import { Modal, ModalHeader, ModalBody } from '../Modal.jsx'

export function DeleteAccountModal({ open, onClose, onConfirm, toast }) {
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)

  const canConfirm = confirmText.trim().toUpperCase() === 'SUPPRIMER'

  const close = () => { setConfirmText(''); onClose() }

  const submit = async () => {
    if (!canConfirm) return
    setLoading(true)
    const result = await onConfirm()
    setLoading(false)
    if (result?.ok) {
      toast?.('Compte supprimé. Au revoir 👋', 'info')
      close()
    } else {
      toast?.(result?.error || "Impossible de supprimer le compte.", 'error')
    }
  }

  return (
    <Modal open={open} onClose={close}>
      <ModalHeader title="⚠️ Supprimer mon compte" subtitle="Cette action est irréversible" />
      <ModalBody>
        <div style={{
          background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.3)',
          borderRadius: 12, padding: '14px 16px', marginBottom: 16, fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.6,
        }}>
          <p style={{ marginBottom: 8, fontWeight: 700 }}>Ceci va définitivement :</p>
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--muted)' }}>
            <li>Supprimer votre profil, vos favoris et vos publications du Feed</li>
            <li>Annuler vos annonces de revente actives</li>
            <li>Fermer définitivement votre accès au compte</li>
          </ul>
          <p style={{ marginTop: 8, color: 'var(--muted)' }}>
            Vos commandes passées sont conservées de façon anonymisée pour nos obligations comptables — les organisateurs ne verront plus votre nom.
          </p>
          <p style={{ marginTop: 8, color: 'var(--danger)', fontWeight: 600 }}>
            Si vous organisez des événements à venir avec des billets déjà vendus, contactez-nous avant de supprimer votre compte.
          </p>
        </div>

        <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 8 }}>
          Tapez <b>SUPPRIMER</b> pour confirmer :
        </label>
        <input
          value={confirmText}
          onChange={e => setConfirmText(e.target.value)}
          style={{
            width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10,
            padding: '10px 14px', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', marginBottom: 16, boxSizing: 'border-box',
          }}
          placeholder="SUPPRIMER"
        />

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={close} disabled={loading} style={{
            flex: 1, background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)',
            borderRadius: 10, padding: '11px 0', fontSize: '0.9rem', cursor: 'pointer',
          }}>Annuler</button>
          <button onClick={submit} disabled={!canConfirm || loading} style={{
            flex: 2, background: 'var(--danger)', color: '#fff', border: 'none', borderRadius: 10,
            padding: '11px 0', fontSize: '0.9rem', fontWeight: 700,
            cursor: canConfirm && !loading ? 'pointer' : 'not-allowed', opacity: canConfirm ? 1 : 0.5,
          }}>{loading ? 'Suppression…' : 'Supprimer définitivement'}</button>
        </div>
      </ModalBody>
    </Modal>
  )
}
