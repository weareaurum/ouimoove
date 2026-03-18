import { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalBody } from '../Modal.jsx'
import styles from './ProfileModal.module.css'

export function ProfileModal({ open, user, onClose, onSave, onLogout }) {
  const [name, setName]   = useState('')
  const [email, setEmail] = useState('')
  const [pwd, setPwd]     = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      setName(user.name)
      setEmail(user.email)
      setPwd('')
      setError('')
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

        <button className={styles.logoutBtn} onClick={onLogout}>
          Se déconnecter
        </button>
      </ModalBody>
    </Modal>
  )
}
