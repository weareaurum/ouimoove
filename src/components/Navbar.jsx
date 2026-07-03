import { useState } from 'react'
import styles from './Navbar.module.css'

export function Navbar({
  user, cartCount, isOrganizer,
  onLogin, onSignup, onCart, onTickets,
  onFavorites, onProfile, onOrganizer, onLogout, onLogoClick, onMarket, onCreateEvent, onFeed,
}) {
  const [logoErr, setLogoErr] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const close = (fn) => () => { setMenuOpen(false); fn?.() }

  return (
    <>
      <nav className={styles.nav}>
        <div className={styles.logo} onClick={onLogoClick} style={{ cursor: onLogoClick ? 'pointer' : 'default' }}>
          {!logoErr ? (
            <img
              src="/ouimoove-logo.png"
              alt="OuiMoove"
              style={{ height: '100px', width: 'auto', display: 'block' }}
              onError={() => setLogoErr(true)}
            />
          ) : (
            <span className={styles.logoText}>Oui<span>Moove</span></span>
          )}
        </div>

        {/* Desktop nav */}
        <div className={styles.right}>
          {!user ? (
            <>
              <button className={styles.btnPrimary} onClick={onCreateEvent}>✚ Créer un événement</button>
              <button className={styles.btnGhost} onClick={onLogin}>Connexion</button>
              <button className={styles.btnGhost} onClick={onSignup}>Inscription</button>
            </>
          ) : (
            <>
              <button className={styles.btnPrimary} onClick={onCreateEvent}>✚ <span className={styles.label}>Créer</span></button>
              <button className={styles.btnGhost} onClick={onFavorites}>❤️ <span className={styles.label}>Favoris</span></button>
              <button className={styles.btnGhost} onClick={onCart} style={{ position: 'relative' }}>
                🛒 <span className={styles.label}>Panier</span>
                {cartCount > 0 && <span className={styles.badge}>{cartCount}</span>}
              </button>
              <button className={styles.btnGhost} onClick={onTickets}>🎟️ <span className={styles.label}>Mes Billets</span></button>
              <button className={styles.btnGhost} onClick={onFeed}>📸 <span className={styles.label}>Feed</span></button>
              <button className={styles.btnGhost} onClick={onMarket}>🏪 <span className={styles.label}>Marché</span></button>
              {isOrganizer && (
                <button className={styles.btnPurple} onClick={onOrganizer}>📊 <span className={styles.label}>Dashboard</span></button>
              )}
              <button className={styles.btnGhost} onClick={onProfile}>👤 <span className={styles.label}>{user.name.split(' ')[0]}</span></button>
              <button className={styles.btnGhost} onClick={onLogout}>Sortir</button>
            </>
          )}
        </div>

        {/* Mobile: cart badge + hamburger */}
        <div className={styles.mobileRight}>
          {user && (
            <button className={styles.btnGhost} onClick={onCart} style={{ position: 'relative' }}>
              🛒
              {cartCount > 0 && <span className={styles.badge}>{cartCount}</span>}
            </button>
          )}
          <button className={styles.hamburger} onClick={() => setMenuOpen(v => !v)} aria-label="Menu">
            <span className={menuOpen ? styles.barOpen1 : styles.bar} />
            <span className={menuOpen ? styles.barOpen2 : styles.bar} />
            <span className={menuOpen ? styles.barOpen3 : styles.bar} />
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div className={styles.drawer}>
          {!user ? (
            <>
              <button className={styles.drawerBtn} onClick={close(onCreateEvent)}>✚ Créer un événement</button>
              <button className={styles.drawerBtn} onClick={close(onLogin)}>🔑 Connexion</button>
              <button className={styles.drawerBtn} onClick={close(onSignup)}>📝 Inscription</button>
            </>
          ) : (
            <>
              <button className={styles.drawerBtnPrimary} onClick={close(onCreateEvent)}>✚ Créer un événement</button>
              <button className={styles.drawerBtn} onClick={close(onFavorites)}>❤️ Favoris</button>
              <button className={styles.drawerBtn} onClick={close(onTickets)}>🎟️ Mes Billets</button>
              <button className={styles.drawerBtn} onClick={close(onFeed)}>📸 Feed</button>
              <button className={styles.drawerBtn} onClick={close(onMarket)}>🏪 Marché de revente</button>
              {isOrganizer && (
                <button className={styles.drawerBtnPurple} onClick={close(onOrganizer)}>📊 Dashboard organisateur</button>
              )}
              <button className={styles.drawerBtn} onClick={close(onProfile)}>👤 Mon Profil</button>
              <button className={styles.drawerBtnDanger} onClick={close(onLogout)}>🚪 Se déconnecter</button>
            </>
          )}
        </div>
      )}
    </>
  )
}