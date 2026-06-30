import styles from './Footer.module.css'

export function Footer({ onHowItWorks, onFaq, onContact, onTerms, onMarket, onCreateEvent }) {
  const year = new Date().getFullYear()
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brandCol}>
          <div className={styles.logo}>
            <span className={styles.logoO}>Oui</span><span className={styles.logoM}>moove</span>
          </div>
          <p className={styles.tagline}>
            La billetterie des événements d’Afrique de l’Ouest.
            Concerts, festivals, sport et plus encore.
          </p>
        </div>

        <div className={styles.linksCol}>
          <h4 className={styles.colTitle}>Découvrir</h4>
          <button className={styles.link} onClick={onMarket}>Marché de revente</button>
          <button className={styles.link} onClick={onCreateEvent}>Organiser un événement</button>
          <button className={styles.link} onClick={onHowItWorks}>Comment ça marche</button>
        </div>

        <div className={styles.linksCol}>
          <h4 className={styles.colTitle}>Aide</h4>
          <button className={styles.link} onClick={onFaq}>FAQ</button>
          <button className={styles.link} onClick={onContact}>Nous contacter</button>
          <a className={styles.link} href="mailto:contact@ouimoove.com">contact@ouimoove.com</a>
        </div>

        <div className={styles.linksCol}>
          <h4 className={styles.colTitle}>Légal</h4>
          <button className={styles.link} onClick={onTerms}>Conditions d’utilisation</button>
          <button className={styles.link} onClick={onTerms}>Confidentialité</button>
        </div>
      </div>

      <div className={styles.bottom}>
        <span>© {year} OuiMoove™. Tous droits réservés.</span>
        <span className={styles.madeIn}>Fait avec ❤️ en Afrique de l’Ouest</span>
      </div>
    </footer>
  )
}
