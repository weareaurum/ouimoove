import { CATEGORIES, CITIES } from '../data/events.js'
import styles from './Hero.module.css'

export function Hero({
  search, setSearch,
  filterCity, setFilterCity,
  filterCategory, setFilterCategory,
  sortBy, setSortBy,
}) {
  return (
    <section className={styles.hero}>
      <h1 className={styles.heading}>
        Découvrez les <em>meilleurs</em><br />événements
      </h1>
      <p className={styles.sub}>
        Concerts, festivals, conférences et plus encore —<br />réservez vos billets en quelques secondes.
      </p>

      {/* Search bar */}
      <div className={styles.searchBar}>
        <span>🔍</span>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Rechercher un événement..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select
          className={styles.searchSelect}
          value={filterCity}
          onChange={e => setFilterCity(e.target.value)}
        >
          <option value="">Toutes les villes</option>
          {CITIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {/* Category pills */}
      <div className={styles.pills}>
        <button
          className={[styles.pill, filterCategory === '' ? styles.active : ''].join(' ')}
          onClick={() => setFilterCategory('')}
        >✨ Tous</button>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={[styles.pill, filterCategory === cat ? styles.active : ''].join(' ')}
            onClick={() => setFilterCategory(cat)}
          >
            {EMOJI[cat]} {cat}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className={styles.sortBar}>
        <span>Trier par :</span>
        <select
          className={styles.sortSelect}
          value={sortBy}
          onChange={e => setSortBy(e.target.value)}
        >
          <option value="date">Date</option>
          <option value="price-asc">Prix croissant</option>
          <option value="price-desc">Prix décroissant</option>
          <option value="name">Nom A–Z</option>
        </select>
      </div>
    </section>
  )
}

const EMOJI = {
  Musique: '🎵',
  Festival: '🎪',
  Sport: '⚽',
  Tech: '💻',
  Culturel: '🎭',
  Gastronomie: '🍽️',
}
