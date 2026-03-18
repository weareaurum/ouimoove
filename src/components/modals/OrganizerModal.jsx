import { useState } from 'react'
import { Modal, ModalHeader, ModalBody } from '../Modal.jsx'
import { CATEGORIES, CITIES } from '../../data/events.js'
import { formatDate } from '../../utils/helpers.js'
import styles from './OrganizerModal.module.css'

const TABS = [
  { id: 'overview',   label: 'Vue d\'ensemble' },
  { id: 'events',     label: 'Mes Événements' },
  { id: 'create',     label: 'Créer' },
  { id: 'attendees',  label: 'Participants' },
]

/* ── Overview Tab ── */
function OverviewTab({ myEvents, purchases }) {
  const myEventIds = new Set(myEvents.map(e => e.id))
  const myPurchases = purchases.filter(p => p.items.some(i => myEventIds.has(i.eventId)))
  const totalTickets = myPurchases.reduce((s, p) => s + p.items.reduce((ss, i) => ss + i.qty, 0), 0)
  const totalRevenue = myPurchases.reduce((s, p) => s + p.total, 0)
  const uniqueAttendees = new Set(myPurchases.map(p => p.userId)).size

  const stats = [
    { label: 'Événements',    value: myEvents.length,               color: 'var(--orange)' },
    { label: 'Billets vendus', value: totalTickets,                  color: 'var(--purple2)' },
    { label: 'Revenus (FCFA)', value: totalRevenue.toLocaleString(), color: 'var(--success)' },
    { label: 'Participants',  value: uniqueAttendees,               color: 'var(--orange2)' },
  ]

  return (
    <div>
      <div className={styles.statsGrid}>
        {stats.map(s => (
          <div key={s.label} className={styles.statCard}>
            <div className={styles.statVal} style={{ color: s.color }}>{s.value}</div>
            <div className={styles.statLabel}>{s.label}</div>
          </div>
        ))}
      </div>
      {myEvents.length === 0 && (
        <p className={styles.hint}>Créez votre premier événement depuis l'onglet <b>Créer</b>.</p>
      )}
    </div>
  )
}

/* ── My Events Tab ── */
function MyEventsTab({ myEvents, onDelete }) {
  if (myEvents.length === 0) {
    return <p className={styles.hint}>Aucun événement créé. Utilisez l'onglet Créer.</p>
  }
  return (
    <div className={styles.eventList}>
      {myEvents.map(e => (
        <div key={e.id} className={styles.eventRow}>
          <div className={styles.eventRowLeft}>
            <span className={styles.eventRowEmoji}>{e.emoji}</span>
            <div>
              <div className={styles.eventRowTitle}>{e.title}</div>
              <div className={styles.eventRowMeta}>
                {formatDate(e.date)} · {e.city} · {e.tickets.map(t => `${t.name}: ${t.sold}/${t.total}`).join(' · ')}
              </div>
            </div>
          </div>
          <button
            className={styles.deleteBtn}
            onClick={() => { if (window.confirm('Supprimer cet événement ?')) onDelete(e.id) }}
          >
            🗑️
          </button>
        </div>
      ))}
    </div>
  )
}

/* ── Create Event Tab ── */
function CreateTab({ onCreate, toast }) {
  const [title, setTitle]       = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [date, setDate]         = useState('')
  const [time, setTime]         = useState('20:00')
  const [location, setLocation] = useState('')
  const [city, setCity]         = useState(CITIES[0])
  const [desc, setDesc]         = useState('')
  const [emoji, setEmoji]       = useState('')
  const [ticketTypes, setTicketTypes] = useState([{ name: '', price: '', qty: '100' }])
  const [error, setError]       = useState('')

  const addTicketType = () =>
    setTicketTypes(tt => [...tt, { name: '', price: '', qty: '100' }])

  const removeTicketType = (i) =>
    setTicketTypes(tt => tt.filter((_, idx) => idx !== i))

  const updateTicket = (i, field, val) =>
    setTicketTypes(tt => tt.map((t, idx) => idx === i ? { ...t, [field]: val } : t))

  const submit = () => {
    if (!title.trim() || !date || !location.trim()) {
      setError('Titre, date et lieu sont requis.')
      return
    }
    const tickets = ticketTypes
      .filter(t => t.name.trim())
      .map(t => ({ name: t.name.trim(), price: parseInt(t.price) || 0, total: parseInt(t.qty) || 100, sold: 0 }))
    if (!tickets.length) {
      setError('Ajoutez au moins un type de billet avec un nom.')
      return
    }
    setError('')
    onCreate({ title: title.trim(), category, date, time, location: location.trim(), city, desc: desc.trim(), emoji: emoji || '🎉', tickets })
    // reset
    setTitle(''); setDate(''); setLocation(''); setDesc(''); setEmoji('')
    setTicketTypes([{ name: '', price: '', qty: '100' }])
    toast('Événement publié ! 🎉', 'success')
  }

  return (
    <div>
      <div className={styles.formRow}>
        <div className={styles.group} style={{ flex: 2 }}>
          <label className={styles.label}>Titre *</label>
          <input className={styles.input} placeholder="Ex: Festival de Jazz de Lomé"
            value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div className={styles.group} style={{ flex: 1 }}>
          <label className={styles.label}>Emoji</label>
          <input className={styles.input} placeholder="🎵" maxLength={2}
            value={emoji} onChange={e => setEmoji(e.target.value)} />
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.group} style={{ flex: 1 }}>
          <label className={styles.label}>Catégorie</label>
          <select className={styles.input} value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className={styles.group} style={{ flex: 1 }}>
          <label className={styles.label}>Ville</label>
          <select className={styles.input} value={city} onChange={e => setCity(e.target.value)}>
            {CITIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className={styles.formRow}>
        <div className={styles.group} style={{ flex: 1 }}>
          <label className={styles.label}>Date *</label>
          <input className={styles.input} type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div className={styles.group} style={{ flex: 1 }}>
          <label className={styles.label}>Heure</label>
          <input className={styles.input} type="time" value={time} onChange={e => setTime(e.target.value)} />
        </div>
      </div>

      <div className={styles.group}>
        <label className={styles.label}>Lieu *</label>
        <input className={styles.input} placeholder="Palais des Congrès, Lomé"
          value={location} onChange={e => setLocation(e.target.value)} />
      </div>

      <div className={styles.group}>
        <label className={styles.label}>Description</label>
        <textarea className={styles.input} rows={3} placeholder="Décrivez votre événement…"
          value={desc} onChange={e => setDesc(e.target.value)} style={{ resize: 'vertical' }} />
      </div>

      <div className={styles.sectionLabel}>Types de billets</div>
      {ticketTypes.map((t, i) => (
        <div key={i} className={styles.ticketTypeRow}>
          <input className={styles.input} placeholder="Nom (ex: Standard)"
            value={t.name} onChange={e => updateTicket(i, 'name', e.target.value)}
            style={{ flex: 2 }} />
          <input className={styles.input} type="number" placeholder="Prix FCFA"
            value={t.price} onChange={e => updateTicket(i, 'price', e.target.value)}
            style={{ flex: 1 }} />
          <input className={styles.input} type="number" placeholder="Quantité"
            value={t.qty} onChange={e => updateTicket(i, 'qty', e.target.value)}
            style={{ flex: 1 }} />
          {ticketTypes.length > 1 && (
            <button className={styles.removeTtBtn} onClick={() => removeTicketType(i)}>✕</button>
          )}
        </div>
      ))}
      <button className={styles.addTtBtn} onClick={addTicketType}>+ Ajouter un type</button>

      {error && <p className={styles.error}>{error}</p>}

      <button className={styles.publishBtn} onClick={submit}>
        🚀 Publier l'événement
      </button>
    </div>
  )
}

/* ── Attendees Tab ── */
function AttendeesTab({ myEvents, purchases, onCheckin }) {
  const [selectedId, setSelectedId] = useState(myEvents[0]?.id ?? '')

  const attendees = purchases.filter(p =>
    p.items.some(i => i.eventId === selectedId)
  )

  return (
    <div>
      <div className={styles.group}>
        <label className={styles.label}>Sélectionner un événement</label>
        <select className={styles.input} value={selectedId} onChange={e => setSelectedId(e.target.value)}>
          {myEvents.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
          {myEvents.length === 0 && <option value="">Aucun événement</option>}
        </select>
      </div>

      {attendees.length === 0 ? (
        <p className={styles.hint}>Aucun participant pour cet événement.</p>
      ) : (
        <div className={styles.attendeeList}>
          {attendees.map(p => (
            <div key={p.id} className={styles.attendeeRow}>
              <div className={styles.attendeeAvatar}>
                {p.userName[0].toUpperCase()}
              </div>
              <div className={styles.attendeeInfo}>
                <div className={styles.attendeeName}>{p.userName}</div>
                <div className={styles.attendeeTickets}>
                  {p.items.filter(i => i.eventId === selectedId).map(i => `${i.ticketName}×${i.qty}`).join(', ')}
                </div>
              </div>
              <button
                className={[styles.checkinBtn, p.checkedIn ? styles.checkedIn : ''].join(' ')}
                onClick={() => onCheckin(p.id)}
              >
                {p.checkedIn ? '✓ Validé' : 'Check-in'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Main Modal ── */
export function OrganizerModal({ open, user, myEvents, purchases, onClose, onCreate, onDelete, onCheckin, toast }) {
  const [tab, setTab] = useState('overview')

  if (!user) return null

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader title="📊 Espace Organisateur" subtitle={`Bonjour, ${user.name.split(' ')[0]} !`} />
      <ModalBody>
        {/* Tab bar */}
        <div className={styles.tabBar}>
          {TABS.map(t => (
            <button
              key={t.id}
              className={[styles.tab, tab === t.id ? styles.tabActive : ''].join(' ')}
              onClick={() => setTab(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview'  && <OverviewTab myEvents={myEvents} purchases={purchases} />}
        {tab === 'events'    && <MyEventsTab myEvents={myEvents} onDelete={onDelete} />}
        {tab === 'create'    && <CreateTab onCreate={onCreate} toast={toast} />}
        {tab === 'attendees' && <AttendeesTab myEvents={myEvents} purchases={purchases} onCheckin={onCheckin} />}
      </ModalBody>
    </Modal>
  )
}
