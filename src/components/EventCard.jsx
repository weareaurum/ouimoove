import { formatDate, minPrice, fmtPrice } from '../utils/helpers.js'
import styles from './EventCard.module.css'

export function EventCard({ event, isFav, onOpen, onToggleFav }) {
  const mp = minPrice(event)

  return (
    <article className={styles.card} onClick={() => onOpen(event.id)}>
      <div className={styles.imgWrap}>
        <div className={styles.placeholder}>{event.emoji || '🎉'}</div>
        <span className={styles.badge}>{event.category}</span>
        <button
          className={[styles.favBtn, isFav ? styles.favActive : ''].join(' ')}
          onClick={e => { e.stopPropagation(); onToggleFav(event.id) }}
          aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          {isFav ? '❤️' : '🤍'}
        </button>
      </div>

      <div className={styles.body}>
        <div className={styles.category}>{event.category}</div>
        <h3 className={styles.title}>{event.title}</h3>
        <p className={styles.desc}>{event.desc}</p>
        <div className={styles.meta}>
          <span>📅 {formatDate(event.date)}</span>
          <span>📍 {event.city}</span>
        </div>
        <div className={styles.footer}>
          <div className={styles.price}>
            {fmtPrice(mp)}
            {mp > 0 && <small> / billet</small>}
          </div>
          <button className={styles.viewBtn}>Voir →</button>
        </div>
      </div>
    </article>
  )
}
