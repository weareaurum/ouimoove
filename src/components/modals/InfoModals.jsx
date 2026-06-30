import { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalBody } from '../Modal.jsx'

/* ════════════════════════════════════════════════════════════
   Shared bits
   ════════════════════════════════════════════════════════════ */
const card = {
  background: 'var(--bg3)',
  border: '1px solid var(--border)',
  borderRadius: 14,
  padding: '16px 18px',
}
const primaryBtn = {
  background: 'linear-gradient(135deg, var(--orange), #d97f0a)',
  color: '#fff', border: 'none', borderRadius: 12,
  padding: '12px 22px', fontWeight: 700, fontSize: '0.95rem',
  cursor: 'pointer', fontFamily: 'var(--font-body)',
  boxShadow: '0 4px 18px rgba(245,166,35,.32)',
}
const ghostBtn = {
  background: 'transparent', color: 'var(--muted)',
  border: '1px solid var(--border)', borderRadius: 12,
  padding: '12px 18px', fontWeight: 600, fontSize: '0.92rem',
  cursor: 'pointer', fontFamily: 'var(--font-body)',
}

/* ════════════════════════════════════════════════════════════
   Onboarding — explains the concept to new users
   ════════════════════════════════════════════════════════════ */
const STEPS = [
  {
    emoji: '🎉',
    title: 'Bienvenue sur OuiMoove',
    text: "La billetterie des événements d'Afrique de l'Ouest. Concerts, festivals, sport, conférences, gastronomie — tout est ici, en quelques clics.",
  },
  {
    emoji: '🔎',
    title: 'Trouvez votre événement',
    text: 'Parcourez les événements près de chez vous. Filtrez par ville et par catégorie, triez par date ou par prix, et ajoutez vos coups de cœur en favoris.',
  },
  {
    emoji: '🎟️',
    title: 'Réservez en quelques secondes',
    text: 'Choisissez vos billets et payez en toute sécurité par Tmoney (Mixx), Flooz (Moov Money) ou carte bancaire. Jusqu’à 10 billets par commande.',
  },
  {
    emoji: '📲',
    title: 'Votre billet, c’est votre QR code',
    text: 'Retrouvez vos billets dans « Mes Billets ». Présentez le QR code à l’entrée : l’organisateur le scanne et vous entrez. Aucun papier nécessaire.',
  },
  {
    emoji: '🏪',
    title: 'Revendez en toute sécurité',
    text: 'Un empêchement ? Mettez vos billets en revente sur le Marché OuiMoove. Vous organisez ? Publiez votre événement gratuitement et suivez vos ventes en direct.',
  },
]

export function OnboardingModal({ open, onClose }) {
  const [step, setStep] = useState(0)
  const isLast = step === STEPS.length - 1
  const s = STEPS[step]

  const finish = () => { setStep(0); onClose() }

  return (
    <Modal open={open} onClose={finish}>
      <ModalBody>
        <div style={{ textAlign: 'center', padding: '8px 4px 4px' }}>
          <div style={{
            fontSize: '3.4rem', lineHeight: 1, marginBottom: 18,
            filter: 'drop-shadow(0 6px 16px rgba(142,45,110,.25))',
          }}>{s.emoji}</div>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontWeight: 800,
            fontSize: '1.5rem', marginBottom: 12, color: 'var(--text)',
          }}>{s.title}</h2>
          <p style={{
            color: 'var(--muted)', fontSize: '0.97rem', lineHeight: 1.6,
            maxWidth: 420, margin: '0 auto 22px',
          }}>{s.text}</p>

          {/* progress dots */}
          <div style={{ display: 'flex', gap: 7, justifyContent: 'center', marginBottom: 24 }}>
            {STEPS.map((_, i) => (
              <span key={i} onClick={() => setStep(i)} style={{
                width: i === step ? 22 : 8, height: 8, borderRadius: 99,
                background: i === step ? 'var(--purple)' : 'var(--border)',
                cursor: 'pointer', transition: 'all .25s',
              }} />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            {step > 0 && (
              <button style={ghostBtn} onClick={() => setStep(step - 1)}>← Précédent</button>
            )}
            {isLast ? (
              <button style={primaryBtn} onClick={finish}>C’est parti 🚀</button>
            ) : (
              <button style={primaryBtn} onClick={() => setStep(step + 1)}>Suivant →</button>
            )}
          </div>

          {!isLast && (
            <button onClick={finish} style={{
              background: 'none', border: 'none', color: 'var(--muted)',
              fontSize: '0.82rem', cursor: 'pointer', marginTop: 16,
              textDecoration: 'underline', fontFamily: 'var(--font-body)',
            }}>Passer l’introduction</button>
          )}
        </div>
      </ModalBody>
    </Modal>
  )
}

/* ════════════════════════════════════════════════════════════
   FAQ — accordion
   ════════════════════════════════════════════════════════════ */
const FAQS = [
  {
    q: 'Comment acheter un billet ?',
    a: 'Ouvrez un événement, sélectionnez le type et la quantité de billets, puis cliquez sur « Réserver ». Vous payez ensuite par Tmoney, Flooz ou carte bancaire. Vos billets apparaissent immédiatement dans « Mes Billets ».',
  },
  {
    q: 'Quels moyens de paiement acceptez-vous ?',
    a: 'Tmoney (Mixx by Yas), Flooz (Moov Money) et les cartes bancaires Visa / Mastercard. Le paiement mobile est instantané et sécurisé.',
  },
  {
    q: 'Où se trouvent mes billets après l’achat ?',
    a: 'Dans le menu « Mes Billets ». Chaque billet affiche un QR code que vous présentez à l’entrée de l’événement. Pas besoin de l’imprimer — votre téléphone suffit.',
  },
  {
    q: 'Comment se passe l’entrée à l’événement ?',
    a: 'L’organisateur scanne le QR code de votre billet à l’entrée. Une fois validé, le billet est marqué comme utilisé. Pour une commande de plusieurs billets, l’organisateur peut valider les entrées une par une.',
  },
  {
    q: 'Puis-je revendre un billet que je ne peux plus utiliser ?',
    a: 'Oui. Dans « Mes Billets », cliquez sur « Revendre » et fixez votre prix. Votre billet est alors proposé sur le Marché de revente OuiMoove à d’autres utilisateurs.',
  },
  {
    q: 'Combien de billets puis-je acheter ?',
    a: 'Jusqu’à 10 billets par commande, afin de garantir un accès équitable pour tous.',
  },
  {
    q: 'Comment organiser et publier mon propre événement ?',
    a: 'Cliquez sur « Créer un événement ». Votre compte passe en mode organisateur : vous publiez gratuitement, définissez vos types de billets, suivez vos ventes en temps réel et scannez les entrées le jour J.',
  },
  {
    q: 'Puis-je être remboursé ?',
    a: 'Les remboursements dépendent de la politique de chaque organisateur. En cas d’annulation d’un événement, contactez-nous via le formulaire de contact et nous traiterons votre demande.',
  },
]

function FaqItem({ q, a, open, onToggle }) {
  return (
    <div style={{ ...card, padding: 0, marginBottom: 10, overflow: 'hidden' }}>
      <button onClick={onToggle} style={{
        width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12, padding: '14px 16px', background: 'transparent', border: 'none',
        cursor: 'pointer', textAlign: 'left', fontFamily: 'var(--font-body)',
        fontSize: '0.95rem', fontWeight: 600, color: 'var(--text)',
      }}>
        <span>{q}</span>
        <span style={{
          color: 'var(--purple)', fontSize: '1.3rem', lineHeight: 1, flexShrink: 0,
          transform: open ? 'rotate(45deg)' : 'none', transition: 'transform .2s',
        }}>＋</span>
      </button>
      {open && (
        <p style={{
          padding: '0 16px 16px', color: 'var(--muted)',
          fontSize: '0.9rem', lineHeight: 1.6,
        }}>{a}</p>
      )}
    </div>
  )
}

export function FaqModal({ open, onClose, onContact }) {
  const [openIdx, setOpenIdx] = useState(0)
  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader title="❓ Questions fréquentes" subtitle="Tout ce qu’il faut savoir sur OuiMoove" />
      <ModalBody>
        {FAQS.map((f, i) => (
          <FaqItem key={i} q={f.q} a={f.a} open={openIdx === i} onToggle={() => setOpenIdx(openIdx === i ? -1 : i)} />
        ))}
        <div style={{ ...card, textAlign: 'center', marginTop: 16 }}>
          <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: 12 }}>
            Vous ne trouvez pas votre réponse ?
          </p>
          <button style={primaryBtn} onClick={onContact}>Nous contacter</button>
        </div>
      </ModalBody>
    </Modal>
  )
}

/* ════════════════════════════════════════════════════════════
   Contact form
   ════════════════════════════════════════════════════════════ */
const fieldLabel = { display: 'block', fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 6 }
const fieldInput = {
  width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
  borderRadius: 10, padding: '10px 14px', color: 'var(--text)',
  fontFamily: 'var(--font-body)', fontSize: '0.9rem', outline: 'none',
}

export function ContactModal({ open, onClose, onSubmit, user, toast }) {
  const [name, setName]       = useState('')
  const [email, setEmail]     = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]       = useState(false)

  // prefill from logged-in user when the modal opens
  useEffect(() => {
    if (open && user) {
      setName(n => n || user.name || '')
      setEmail(e => e || user.email || '')
    }
  }, [open, user])

  const reset = () => { setSubject(''); setMessage(''); setSent(false) }

  const submit = async () => {
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast?.('Veuillez remplir tous les champs requis.', 'error'); return
    }
    setLoading(true)
    const res = await onSubmit({ name, email, subject, message })
    setLoading(false)
    if (res?.ok) { setSent(true) }
    else { toast?.(res?.error || "Impossible d'envoyer le message.", 'error') }
  }

  const close = () => { reset(); onClose() }

  return (
    <Modal open={open} onClose={close}>
      <ModalHeader title="✉️ Contactez-nous" subtitle="Une question, un souci ? Écrivez-nous." />
      <ModalBody>
        {sent ? (
          <div style={{ textAlign: 'center', padding: '24px 8px' }}>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.2rem', marginBottom: 8 }}>
              Message envoyé !
            </h3>
            <p style={{ color: 'var(--muted)', fontSize: '0.92rem', lineHeight: 1.6, maxWidth: 360, margin: '0 auto 20px' }}>
              Merci de nous avoir écrit. Notre équipe vous répondra par email dans les plus brefs délais.
            </p>
            <button style={primaryBtn} onClick={close}>Fermer</button>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={fieldLabel}>Nom complet *</label>
              <input style={fieldInput} value={name} onChange={e => setName(e.target.value)} placeholder="Votre nom" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={fieldLabel}>Email *</label>
              <input style={fieldInput} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@email.com" />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={fieldLabel}>Sujet</label>
              <input style={fieldInput} value={subject} onChange={e => setSubject(e.target.value)} placeholder="Objet de votre message" />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={fieldLabel}>Message *</label>
              <textarea style={{ ...fieldInput, minHeight: 120, resize: 'vertical' }} value={message} onChange={e => setMessage(e.target.value)} placeholder="Comment pouvons-nous vous aider ?" />
            </div>
            <button style={{ ...primaryBtn, width: '100%', opacity: loading ? 0.6 : 1 }} onClick={submit} disabled={loading}>
              {loading ? 'Envoi…' : 'Envoyer le message'}
            </button>
            <p style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem', marginTop: 14 }}>
              Ou écrivez-nous directement à{' '}
              <a href="mailto:contact@ouimoove.com" style={{ color: 'var(--purple3)', fontWeight: 600 }}>contact@ouimoove.com</a>
            </p>
          </>
        )}
      </ModalBody>
    </Modal>
  )
}

/* ════════════════════════════════════════════════════════════
   Terms & conditions — shared body reused by the signup form
   ════════════════════════════════════════════════════════════ */
export const TERMS_SECTIONS = [
  ['1. Acceptation des conditions',
    "En créant un compte ou en utilisant OuiMoove, vous acceptez les présentes conditions générales d’utilisation. Si vous n’êtes pas d’accord, merci de ne pas utiliser la plateforme."],
  ['2. Votre compte',
    "Vous êtes responsable de l’exactitude des informations de votre compte et de la confidentialité de vos identifiants. Vous devez avoir l’âge légal pour acheter des billets."],
  ['3. Billets et paiements',
    "OuiMoove met en relation les organisateurs et le public. Les billets sont payés via nos partenaires de paiement (Tmoney, Flooz, carte bancaire). Un maximum de 10 billets par commande s’applique. Votre billet électronique (QR code) doit être présenté à l’entrée."],
  ['4. Revente entre utilisateurs',
    "Le Marché de revente permet de revendre un billet que vous ne pouvez plus utiliser. Le prix est fixé par le vendeur. OuiMoove n’est pas responsable des transactions entre utilisateurs au-delà de la sécurisation du transfert du billet."],
  ['5. Remboursements',
    "Les conditions de remboursement relèvent de chaque organisateur. En cas d’annulation d’un événement, OuiMoove facilite le traitement des demandes mais n’est pas l’organisateur de l’événement."],
  ['6. Organisateurs',
    "Les organisateurs sont seuls responsables de la tenue de leurs événements, des informations publiées et du respect de la réglementation applicable. OuiMoove fournit uniquement les outils de billetterie."],
  ['7. Données personnelles',
    "Nous collectons les données strictement nécessaires à la fourniture du service (compte, commandes, paiements). Vos données ne sont pas vendues à des tiers. Vous pouvez demander leur suppression via le formulaire de contact."],
  ['8. Responsabilité',
    "OuiMoove s’efforce d’assurer un service fiable mais ne peut être tenu responsable des annulations, reports ou désagréments liés aux événements eux-mêmes."],
  ['9. Contact',
    "Pour toute question relative à ces conditions, contactez-nous à contact@ouimoove.com."],
]

export function TermsBody() {
  return (
    <div>
      {TERMS_SECTIONS.map(([h, p], i) => (
        <div key={i} style={{ marginBottom: 16 }}>
          <h4 style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)', marginBottom: 5 }}>{h}</h4>
          <p style={{ color: 'var(--muted)', fontSize: '0.88rem', lineHeight: 1.6 }}>{p}</p>
        </div>
      ))}
    </div>
  )
}

export function TermsModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader title="📜 Conditions d’utilisation" subtitle="Dernière mise à jour : 2026" />
      <ModalBody>
        <TermsBody />
      </ModalBody>
    </Modal>
  )
}
