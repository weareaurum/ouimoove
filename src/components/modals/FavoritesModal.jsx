import { Modal, ModalHeader, ModalBody } from '../Modal.jsx'
import { formatDate } from '../../utils/helpers.js'
import styles from './FavoritesModal.module.css'

export function FavoritesModal({ open, events, favorites, onClose, onOpenEvent, onToggleFav }) {
  const favEvents = events.filter(e => favorites.includes(e.id))

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader title="❤️ Favoris" subtitle={favEvents.length ? `${favEvents.length} événement${favEvents.length > 1 ? 's' : ''} sauvegardé${favEvents.length > 1 ? 's' : ''}` : undefined} />
      <ModalBody>
        {favEvents.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>❤️</div>
            <p>Aucun favori pour le moment</p>
            <p className={styles.emptySub}>Cliquez sur 🤍 sur un événement pour le sauvegarder</p>
          </div>
        ) : (
          <div className={styles.list}>
            {favEvents.map(e => (
              <div key={e.id} className={styles.row}>
                <div className={styles.emoji}>{e.emoji || '🎉'}</div>
                <div className={styles.info}>
                  <div className={styles.title}>{e.title}</div>
                  <div className={styles.meta}>
                    <span>📅 {formatDate(e.date)}</span>
                    <span>📍 {e.city}</span>
                    <span className={styles.cat}>{e.category}</span>
                  </div>
                </div>
                <div className={styles.actions}>
                  <button
                    className={styles.viewBtn}
                    onClick={() => { onClose(); onOpenEvent(e.id) }}
                  >
                    Voir
                  </button>
                  <button
                    className={styles.removeBtn}
                    onClick={() => onToggleFav(e.id)}
                    aria-label="Retirer des favoris"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ModalBody>
    </Modal>
  )
}
