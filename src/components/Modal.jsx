import { useEffect } from 'react'
import styles from './Modal.module.css'

export function Modal({ open, onClose, children, size = 'md' }) {
  useEffect(() => {
    if (!open) return
    const handler = e => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <div
      className={[styles.overlay, open ? styles.active : ''].join(' ')}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className={[styles.modal, styles[size]].join(' ')}>
        <button className={styles.close} onClick={onClose} aria-label="Fermer">✕</button>
        {children}
      </div>
    </div>
  )
}

export function ModalHeader({ title, subtitle }) {
  return (
    <div className={styles.header}>
      <h2 className={styles.title}>{title}</h2>
      {subtitle && <p className={styles.sub}>{subtitle}</p>}
    </div>
  )
}

export function ModalBody({ children }) {
  return <div className={styles.body}>{children}</div>
}
