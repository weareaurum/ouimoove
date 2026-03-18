import { useState } from 'react'
import { Modal, ModalHeader, ModalBody } from '../Modal.jsx'
import styles from './AuthModal.module.css'

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.29-8.16 2.29-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
)

function LoginForm({ onLogin, onGoogle, onSwitch }) {
  const [email, setEmail] = useState('')
  const [pwd, setPwd] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    const err = await onLogin(email, pwd)
    setLoading(false)
    if (err) setError(err)
  }

  return (
    <>
      <button className={styles.googleBtn} onClick={onGoogle}>
        <GoogleIcon /> Continuer avec Google
      </button>
      <div className={styles.divider}><span>ou par email</span></div>

      <div className={styles.group}>
        <label className={styles.label}>Email</label>
        <input className={styles.input} type="email" placeholder="vous@email.com"
          value={email} onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()} />
      </div>
      <div className={styles.group}>
        <label className={styles.label}>Mot de passe</label>
        <input className={styles.input} type="password" placeholder="••••••••"
          value={pwd} onChange={e => setPwd(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()} />
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <button className={styles.submitBtn} onClick={submit} disabled={loading}>
        {loading ? 'Connexion…' : 'Se connecter'}
      </button>

      <p className={styles.switchTxt}>
        Pas encore de compte ?{' '}
        <span className={styles.link} onClick={() => onSwitch('signup')}>S'inscrire</span>
      </p>
    </>
  )
}

function SignupForm({ onSignup, onGoogle, onSwitch }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [pwd, setPwd] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async () => {
    setLoading(true)
    const err = await onSignup(name, email, pwd)
    setLoading(false)
    if (err) setError(err)
  }

  return (
    <>
      <button className={styles.googleBtn} onClick={onGoogle}>
        <GoogleIcon /> Continuer avec Google
      </button>
      <div className={styles.divider}><span>ou par email</span></div>

      <div className={styles.group}>
        <label className={styles.label}>Nom complet</label>
        <input className={styles.input} type="text" placeholder="Amina Traoré"
          value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className={styles.group}>
        <label className={styles.label}>Email</label>
        <input className={styles.input} type="email" placeholder="vous@email.com"
          value={email} onChange={e => setEmail(e.target.value)} />
      </div>
      <div className={styles.group}>
        <label className={styles.label}>Mot de passe</label>
        <input className={styles.input} type="password" placeholder="min. 6 caractères"
          value={pwd} onChange={e => setPwd(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()} />
      </div>

      {error && <p className={styles.error}>{error}</p>}

      <button className={styles.submitBtn} onClick={submit} disabled={loading}>
        {loading ? 'Création…' : 'Créer le compte'}
      </button>

      <p className={styles.switchTxt}>
        Déjà un compte ?{' '}
        <span className={styles.link} onClick={() => onSwitch('login')}>Se connecter</span>
      </p>
    </>
  )
}

export function AuthModal({ mode, onClose, onSwitch, onLogin, onSignup, onGoogle }) {
  const isLogin = mode === 'login'
  const isSignup = mode === 'signup'

  return (
    <Modal open={isLogin || isSignup} onClose={onClose}>
      <ModalHeader
        title={isLogin ? 'Connexion' : 'Créer un compte'}
        subtitle={isLogin ? 'Content de vous revoir !' : 'Rejoignez la communauté OuiMoove'}
      />
      <ModalBody>
        {isLogin && <LoginForm onLogin={onLogin} onGoogle={onGoogle} onSwitch={onSwitch} />}
        {isSignup && <SignupForm onSignup={onSignup} onGoogle={onGoogle} onSwitch={onSwitch} />}
      </ModalBody>
    </Modal>
  )
}
