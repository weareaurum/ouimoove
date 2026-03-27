import { useState } from 'react'
import { Modal, ModalHeader, ModalBody } from '../Modal.jsx'
import { CATEGORIES, CITIES } from '../../data/events.js'
import { formatDate } from '../../utils/helpers.js'
import styles from './OrganizerModal.module.css'

const TABS = [
  { id: 'overview',   label: "Vue d'ensemble" },
  { id: 'events',     label: 'Mes Événements' },
  { id: 'create',     label: 'Créer' },
  { id: 'attendees',  label: 'Participants' },
]

// ── Spinner ───────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
      <div style={{ fontSize: '1.5rem', marginBottom: 8, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</div>
      <div style={{ fontSize: '0.85rem' }}>Chargement…</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

// ── Error banner ──────────────────────────────────────────────
function ErrorBanner({ msg, onRetry }) {
  return (
    <div style={{
      background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.3)',
      borderRadius: 12, padding: '14px 16px', marginBottom: 16,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
    }}>
      <span style={{ color: 'var(--danger)', fontSize: '0.85rem' }}>⚠️ {msg}</span>
      {onRetry && (
        <button onClick={onRetry} style={{
          background: 'transparent', border: '1px solid var(--danger)',
          color: 'var(--danger)', borderRadius: 8, padding: '4px 12px',
          cursor: 'pointer', fontSize: '0.78rem',
        }}>Réessayer</button>
      )}
    </div>
  )
}

// ── Overview Tab ──────────────────────────────────────────────
function OverviewTab({ organizerStats, loading, errors, onRefresh }) {
  if (loading.stats) return <Spinner />
  if (errors.stats) return <ErrorBanner msg={errors.stats} onRetry={onRefresh} />

  const s = organizerStats || {}
  const stats = [
    { label: 'Événements publiés', value: s.published_events   ?? 0,                              color: 'var(--orange)'  },
    { label: 'Billets vendus',     value: s.total_tickets_sold ?? 0,                              color: 'var(--purple2)' },
    { label: 'Revenus (FCFA)',     value: (s.total_revenue_cfa ?? 0).toLocaleString('fr-FR'),     color: 'var(--success)' },
    { label: 'Participants uniques', value: s.unique_attendees ?? 0,                              color: 'var(--orange2)' },
  ]

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 24 }}>
        {stats.map((s) => (
          <div key={s.label} style={{
            background: 'var(--bg3)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '16px 14px',
          }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.6rem', color: s.color, lineHeight: 1, marginBottom: 4 }}>
              {s.value}
            </div>
            <div style={{ color: 'var(--muted)', fontSize: '0.76rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Events breakdown table */}
      {s.events_breakdown?.length > 0 && (
        <>
          <p style={{ color: 'var(--muted)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
            Par événement
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {s.events_breakdown.map((e) => (
              <div key={e.event_id} style={{
                background: 'var(--bg3)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '12px 14px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap',
              }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{e.title}</div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: 2 }}>{formatDate(e.event_date.slice(0, 10))}</div>
                </div>
                <div style={{ display: 'flex', gap: 16, flexShrink: 0 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, color: 'var(--purple2)', fontSize: '0.95rem' }}>{e.tickets_sold}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>billets</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, color: 'var(--orange)', fontSize: '0.95rem' }}>{(e.revenue_cfa || 0).toLocaleString('fr-FR')}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>FCFA</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.95rem' }}>{e.attendee_count}</div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.7rem' }}>participants</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {!organizerStats && (
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0' }}>
          Créez votre premier événement depuis l'onglet <b>Créer</b>.
        </p>
      )}
    </div>
  )
}

// ── My Events Tab ─────────────────────────────────────────────
function MyEventsTab({ myEvents, onDelete, loading, errors }) {
  if (loading.orgOrders) return <Spinner />
  if (errors.orgOrders) return <ErrorBanner msg={errors.orgOrders} />
  if (!myEvents.length) return (
    <p style={{ color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0' }}>
      Aucun événement créé. Utilisez l'onglet <b>Créer</b>.
    </p>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {myEvents.map((e) => (
        <div key={e.id} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '14px 16px',
        }}>
          <span style={{
            fontSize: '1.8rem', flexShrink: 0, width: 40, height: 40,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'var(--bg2)', borderRadius: 8,
          }}>{e.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {formatDate(e.date)} · {e.city} · {e.tickets.map((t) => `${t.name}: ${t.sold}/${t.total}`).join(' · ')}
            </div>
          </div>
          <button
            onClick={() => { if (window.confirm('Supprimer cet événement ?')) onDelete(e.id) }}
            style={{
              background: 'transparent', border: '1px solid var(--border)', color: 'var(--danger)',
              borderRadius: 8, width: 34, height: 34, cursor: 'pointer', fontSize: '0.9rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              transition: 'all .2s',
            }}
          >🗑️</button>
        </div>
      ))}
    </div>
  )
}

// ── Create Event Tab ──────────────────────────────────────────
function CreateTab({ onCreate, toast }) {
  const [title,       setTitle]       = useState('')
  const [category,    setCategory]    = useState(CATEGORIES[0])
  const [date,        setDate]        = useState('')
  const [time,        setTime]        = useState('20:00')
  const [location,    setLocation]    = useState('')
  const [city,        setCity]        = useState(CITIES[0])
  const [desc,        setDesc]        = useState('')
  const [emoji,       setEmoji]       = useState('')
  const [ticketTypes, setTicketTypes] = useState([{ name: '', price: '', qty: '100' }])
  const [error,       setError]       = useState('')
  const [loading,     setLoading]     = useState(false)

  const addTicketType    = () => setTicketTypes((tt) => [...tt, { name: '', price: '', qty: '100' }])
  const removeTicketType = (i) => setTicketTypes((tt) => tt.filter((_, idx) => idx !== i))
  const updateTicket     = (i, field, val) => setTicketTypes((tt) => tt.map((t, idx) => idx === i ? { ...t, [field]: val } : t))

  const submit = async () => {
    if (!title.trim() || !date || !location.trim()) {
      setError('Titre, date et lieu sont requis.')
      return
    }
    const tickets = ticketTypes
      .filter((t) => t.name.trim())
      .map((t) => ({ name: t.name.trim(), price: parseInt(t.price) || 0, total: parseInt(t.qty) || 100, sold: 0 }))
    if (!tickets.length) { setError('Ajoutez au moins un type de billet avec un nom.'); return }

    setError('')
    setLoading(true)
    const created = await onCreate({ title: title.trim(), category, date, time, location: location.trim(), city, desc: desc.trim(), emoji: emoji || '🎟️', tickets })
    setLoading(false)

    if (!created) { setError("Impossible de publier l'événement. Réessayez."); return }

    // Reset
    setTitle(''); setDate(''); setLocation(''); setDesc(''); setEmoji('')
    setTicketTypes([{ name: '', price: '', qty: '100' }])
  }

  const inputStyle = {
    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '9px 13px', color: 'var(--text)',
    fontSize: '0.88rem', outline: 'none',
  }
  const labelStyle = { display: 'block', fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 6 }
  const groupStyle = { marginBottom: 14 }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ ...groupStyle, flex: 2 }}>
          <label style={labelStyle}>Titre *</label>
          <input style={inputStyle} placeholder="Ex: Festival de Jazz de Lomé" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div style={{ ...groupStyle, flex: 1 }}>
          <label style={labelStyle}>Emoji</label>
          <input style={inputStyle} placeholder="🎵" maxLength={2} value={emoji} onChange={(e) => setEmoji(e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ ...groupStyle, flex: 1 }}>
          <label style={labelStyle}>Catégorie</label>
          <select style={inputStyle} value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ ...groupStyle, flex: 1 }}>
          <label style={labelStyle}>Ville</label>
          <select style={inputStyle} value={city} onChange={(e) => setCity(e.target.value)}>
            {CITIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ ...groupStyle, flex: 1 }}>
          <label style={labelStyle}>Date *</label>
          <input style={inputStyle} type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div style={{ ...groupStyle, flex: 1 }}>
          <label style={labelStyle}>Heure</label>
          <input style={inputStyle} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </div>
      </div>

      <div style={groupStyle}>
        <label style={labelStyle}>Lieu *</label>
        <input style={inputStyle} placeholder="Palais des Congrès, Lomé" value={location} onChange={(e) => setLocation(e.target.value)} />
      </div>

      <div style={groupStyle}>
        <label style={labelStyle}>Description</label>
        <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} placeholder="Décrivez votre événement…" value={desc} onChange={(e) => setDesc(e.target.value)} />
      </div>

      <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 8, fontWeight: 500 }}>Types de billets</p>
      {ticketTypes.map((t, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <input style={{ ...inputStyle, flex: 2 }} placeholder="Nom (ex: Standard)" value={t.name} onChange={(e) => updateTicket(i, 'name', e.target.value)} />
          <input style={{ ...inputStyle, flex: 1 }} type="number" placeholder="Prix FCFA" value={t.price} onChange={(e) => updateTicket(i, 'price', e.target.value)} />
          <input style={{ ...inputStyle, flex: 1 }} type="number" placeholder="Quantité" value={t.qty} onChange={(e) => updateTicket(i, 'qty', e.target.value)} />
          {ticketTypes.length > 1 && (
            <button onClick={() => removeTicketType(i)} style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--danger)', cursor: 'pointer', flexShrink: 0 }}>✕</button>
          )}
        </div>
      ))}

      <button onClick={addTicketType} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--purple3)', cursor: 'pointer', fontSize: '0.82rem', marginBottom: 16 }}>
        + Ajouter un type
      </button>

      {error && <p style={{ color: 'var(--danger)', fontSize: '0.82rem', marginBottom: 10 }}>{error}</p>}

      <button
        onClick={submit}
        disabled={loading}
        style={{
          width: '100%', background: 'linear-gradient(135deg, var(--purple), var(--purple2))',
          color: '#fff', border: 'none', borderRadius: 12, padding: 12,
          fontSize: '0.95rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1, transition: 'all .2s',
        }}
      >
        {loading ? 'Publication…' : '🚀 Publier l\'événement'}
      </button>
    </div>
  )
}

// ── Attendees Tab — shows real names + emails ─────────────────
function AttendeesTab({ myEvents, organizerOrders, onCheckin, loading, errors, onRefresh }) {
  const [selectedId, setSelectedId] = useState(myEvents[0]?.id ?? '')
  const [search, setSearch] = useState('')

  const attendees = organizerOrders.filter((p) =>
    p.items.some((i) => i.eventId === selectedId)
  )

  const filtered = search.trim()
    ? attendees.filter((p) =>
        p.userName.toLowerCase().includes(search.toLowerCase()) ||
        p.userEmail.toLowerCase().includes(search.toLowerCase())
      )
    : attendees

  const checkedCount = filtered.filter((p) =>
    p.items.filter((i) => i.eventId === selectedId).every((i) => i.checkedIn)
  ).length

  if (loading.orgOrders) return <Spinner />

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 2, minWidth: 160 }}>
          <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 6 }}>Événement</label>
          <select
            style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 13px', color: 'var(--text)', fontSize: '0.88rem', outline: 'none' }}
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {myEvents.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            {!myEvents.length && <option value="">Aucun événement</option>}
          </select>
        </div>
        <div style={{ flex: 2, minWidth: 160 }}>
          <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 6 }}>Rechercher</label>
          <input
            style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 13px', color: 'var(--text)', fontSize: '0.88rem', outline: 'none' }}
            placeholder="Nom ou email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Stats bar */}
      {filtered.length > 0 && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
            <b style={{ color: 'var(--text)' }}>{filtered.length}</b> participant{filtered.length !== 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
            <b style={{ color: 'var(--success)' }}>{checkedCount}</b> validé{checkedCount !== 1 ? 's' : ''}
          </span>
          <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>
            <b style={{ color: 'var(--orange)' }}>{filtered.length - checkedCount}</b> en attente
          </span>
        </div>
      )}

      {errors.orgOrders && <ErrorBanner msg={errors.orgOrders} onRetry={onRefresh} />}

      {!filtered.length ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0' }}>
          {search ? 'Aucun résultat.' : 'Aucun participant pour cet événement.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filtered.map((p) => {
            const eventItems   = p.items.filter((i) => i.eventId === selectedId)
            const isCheckedIn  = eventItems.length > 0 && eventItems.every((i) => i.checkedIn)
            const checkedInAt  = eventItems.find((i) => i.checkedInAt)?.checkedInAt

            return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0', borderBottom: '1px solid var(--border)',
              }}>
                {/* Avatar */}
                <div style={{
                  width: 38, height: 38, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--purple), var(--orange))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '0.9rem',
                }}>
                  {(p.userName || '?')[0].toUpperCase()}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.userName || 'Anonyme'}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.userEmail && <span>{p.userEmail} · </span>}
                    {eventItems.map((i) => `${i.ticketName}×${i.qty}`).join(', ')}
                  </div>
                  {isCheckedIn && checkedInAt && (
                    <div style={{ color: 'var(--success)', fontSize: '0.7rem', marginTop: 1 }}>
                      Validé le {new Date(checkedInAt).toLocaleString('fr-FR')}
                    </div>
                  )}
                </div>

                {/* Check-in button */}
                <button
                  onClick={() => onCheckin(p.id, selectedId)}
                  style={{
                    padding: '5px 14px', borderRadius: 8, flexShrink: 0,
                    border: isCheckedIn ? '1px solid rgba(34,197,94,.4)' : '1px solid var(--border)',
                    background: isCheckedIn ? 'rgba(34,197,94,.12)' : 'transparent',
                    color: isCheckedIn ? 'var(--success)' : 'var(--muted)',
                    cursor: 'pointer', fontSize: '0.78rem', transition: 'all .2s',
                  }}
                >
                  {isCheckedIn ? '✓ Validé' : 'Check-in'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Main Modal ────────────────────────────────────────────────
export function OrganizerModal({
  open, user, myEvents, purchases, organizerOrders, organizerStats,
  onClose, onCreate, onDelete, onCheckin, onRefresh,
  loading = {}, errors = {},
  toast,
}) {
  const [tab, setTab] = useState('overview')

  if (!user) return null

  // Use organizerOrders if provided (has real attendee data), fallback to purchases
  const attendeeOrders = organizerOrders || purchases || []

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader
        title="📊 Espace Organisateur"
        subtitle={`Bonjour, ${user.name.split(' ')[0]} !`}
      />
      <ModalBody>
        {/* Tab bar */}
        <div style={{
          display: 'flex', gap: 4, background: 'var(--bg3)',
          borderRadius: 12, padding: 4, marginBottom: 22, flexWrap: 'wrap',
        }}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                flex: 1, minWidth: 80, padding: '8px 10px', borderRadius: 8, border: 'none',
                background: tab === t.id ? 'var(--bg2)' : 'transparent',
                color: tab === t.id ? 'var(--text)' : 'var(--muted)',
                cursor: 'pointer', fontSize: '0.82rem', transition: 'all .2s',
                boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,.3)' : 'none',
                whiteSpace: 'nowrap',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'overview' && (
          <OverviewTab
            organizerStats={organizerStats}
            loading={loading} errors={errors}
            onRefresh={onRefresh}
          />
        )}
        {tab === 'events' && (
          <MyEventsTab
            myEvents={myEvents} onDelete={onDelete}
            loading={loading} errors={errors}
          />
        )}
        {tab === 'create' && (
          <CreateTab onCreate={onCreate} toast={toast} />
        )}
        {tab === 'attendees' && (
          <AttendeesTab
            myEvents={myEvents}
            organizerOrders={attendeeOrders}
            onCheckin={onCheckin}
            loading={loading} errors={errors}
            onRefresh={onRefresh}
          />
        )}
      </ModalBody>
    </Modal>
  )
}
