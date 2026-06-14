import { useState } from 'react'
import styles from './Navbar.module.css'

export function Navbar({
  user, cartCount, isOrganizer,
  onLogin, onSignup, onCart, onTickets,
  onFavorites, onProfile, onOrganizer, onLogout, onLogoClick,
}) {
  const [logoErr, setLogoErr] = useState(false)

  return (
    <nav className={styles.nav}>
      <div className={styles.logo} onClick={onLogoClick} style={{ cursor: onLogoClick ? 'pointer' : 'default' }}>
        {!logoErr ? (
          <img
            src="/ouimoove-logo.png"
            alt="OuiMoove"
            style={{ height: '64px', width: 'auto', display: 'block' }}
            onError={() => setLogoErr(true)}
          />
        ) : (
          <span className={styles.logoText}>Oui<span>Moove</span></span>
        )}
      </div>

      <div className={styles.right}>
        {!user ? (
          <>
            <button className={styles.btnGhost} onClick={onLogin}>Connexion</button>
            <button className={styles.btnPrimary} onClick={onSignup}>Inscription</button>
          </>
        ) : (
          <>
            <button className={styles.btnGhost} onClick={onFavorites}>
              ❤️ <span className={styles.label}>Favoris</span>
            </button>
            <button className={styles.btnGhost} onClick={onCart} style={{ position: 'relative' }}>
              🛒 <span className={styles.label}>Panier</span>
              {cartCount > 0 && <span className={styles.badge}>{cartCount}</span>}
            </button>
            <button className={styles.btnGhost} onClick={onTickets}>
              🎟️ <span className={styles.label}>Mes Billets</span>
            </button>
            {isOrganizer && (
              <button className={styles.btnPurple} onClick={onOrganizer}>
                📊 <span className={styles.label}>Dashboard</span>
              </button>
            )}
            <button className={styles.btnGhost} onClick={onProfile}>
              👤 <span className={styles.label}>{user.name.split(' ')[0]}</span>
            </button>
            <button className={styles.btnGhost} onClick={onLogout}>Sortir</button>
          </>
        )}
      </div>
    </nav>
  )
}