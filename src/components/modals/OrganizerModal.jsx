import { useState } from 'react'
import { Modal, ModalHeader, ModalBody } from '../Modal.jsx'
import { CATEGORIES, CITIES } from '../../data/events.js'
import { formatDate } from '../../utils/helpers.js'

const BASE_TABS = [
  { id: 'overview',   label: "Vue d'ensemble" },
  { id: 'analytics',  label: '📈 Analytique' },
  { id: 'events',     label: 'Mes Événements' },
  { id: 'create',     label: 'Créer' },
  { id: 'attendees',  label: 'Participants' },
]
const ADMIN_TAB = { id: 'admin', label: '🔑 Admin' }

function Spinner() {
  return (
    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>
      <div style={{ fontSize: '1.5rem', marginBottom: 8, animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</div>
      <div style={{ fontSize: '0.85rem' }}>Chargement…</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

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
    { label: 'Événements publiés',  value: s.published_events   ?? 0,                          color: 'var(--orange)'  },
    { label: 'Billets vendus',      value: s.total_tickets_sold ?? 0,                          color: 'var(--purple2)' },
    { label: 'Revenus (FCFA)',      value: (s.total_revenue_cfa ?? 0).toLocaleString('fr-FR'), color: 'var(--success)' },
    { label: 'Participants uniques',value: s.unique_attendees   ?? 0,                          color: 'var(--orange2)' },
  ]

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12, marginBottom: 24 }}>
        {stats.map((s) => (
          <div key={s.label} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 14px' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.6rem', color: s.color, lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.76rem' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {s.events_breakdown?.length > 0 && (
        <>
          <p style={{ color: 'var(--muted)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Par événement</p>
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

// ── Analytics Tab ─────────────────────────────────────────────
function AnalyticsTab({ organizerStats, myEvents, loading, errors, onRefresh }) {
  if (loading.stats) return <Spinner />
  if (errors.stats) return <ErrorBanner msg={errors.stats} onRetry={onRefresh} />

  const s = organizerStats || {}
  const breakdown = s.events_breakdown || []

  const maxRevenue = Math.max(...breakdown.map(e => e.revenue_cfa || 0), 1)
  const maxTickets = Math.max(...breakdown.map(e => e.tickets_sold || 0), 1)

  // Capacity per event from myEvents
  const capacity = (eventId) => {
    const ev = myEvents.find(e => e.id === eventId)
    return ev ? ev.tickets.reduce((s, t) => s + t.total, 0) : 0
  }

  const barStyle = (pct, color) => ({
    height: 8, borderRadius: 99, background: `linear-gradient(90deg, ${color}, ${color}88)`,
    width: `${Math.max(2, pct)}%`, transition: 'width .5s ease',
  })

  if (!breakdown.length) {
    return <p style={{ color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0' }}>Aucune donnée. Créez un événement et vendez des billets.</p>
  }

  return (
    <div>
      {/* Revenue chart */}
      <p style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Revenus par événement (FCFA)</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {[...breakdown].sort((a, b) => (b.revenue_cfa || 0) - (a.revenue_cfa || 0)).map(e => (
          <div key={e.event_id}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{e.title}</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--success)', fontWeight: 700, flexShrink: 0 }}>{(e.revenue_cfa || 0).toLocaleString('fr-FR')} FCFA</span>
            </div>
            <div style={{ background: 'var(--bg3)', borderRadius: 99, height: 8, overflow: 'hidden' }}>
              <div style={barStyle(((e.revenue_cfa || 0) / maxRevenue) * 100, 'var(--success)')} />
            </div>
          </div>
        ))}
      </div>

      {/* Tickets sold chart */}
      <p style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Billets vendus vs capacité</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
        {breakdown.map(e => {
          const cap = capacity(e.event_id)
          const sold = e.tickets_sold || 0
          const pct = cap > 0 ? Math.round((sold / cap) * 100) : 0
          return (
            <div key={e.event_id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{e.title}</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--muted)', flexShrink: 0 }}>{sold}{cap > 0 ? ` / ${cap}` : ''} · <b style={{ color: pct > 80 ? 'var(--danger)' : pct > 50 ? 'var(--orange)' : 'var(--success)' }}>{pct}%</b></span>
              </div>
              <div style={{ background: 'var(--bg3)', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                <div style={barStyle(Math.min(pct, 100), pct > 80 ? 'var(--danger)' : pct > 50 ? 'var(--orange)' : 'var(--purple2)')} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Category breakdown */}
      {(() => {
        const byCategory = {}
        breakdown.forEach(e => {
          const ev = myEvents.find(ev => ev.id === e.event_id)
          const cat = ev?.category || 'Autre'
          byCategory[cat] = (byCategory[cat] || 0) + (e.revenue_cfa || 0)
        })
        const cats = Object.entries(byCategory).sort((a, b) => b[1] - a[1])
        if (!cats.length) return null
        const maxCat = Math.max(...cats.map(c => c[1]), 1)
        return (
          <>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 }}>Revenus par catégorie</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {cats.map(([cat, rev]) => (
                <div key={cat}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600 }}>{cat}</span>
                    <span style={{ fontSize: '0.82rem', color: 'var(--orange)', fontWeight: 700 }}>{rev.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                  <div style={{ background: 'var(--bg3)', borderRadius: 99, height: 8, overflow: 'hidden' }}>
                    <div style={barStyle((rev / maxCat) * 100, 'var(--orange)')} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )
      })()}
    </div>
  )
}

// ── Shared form styles ─────────────────────────────────────────
const inputStyle = {
  width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
  borderRadius: 10, padding: '9px 13px', color: 'var(--text)',
  fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box',
}
const labelStyle = { display: 'block', fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 6 }
const groupStyle = { marginBottom: 14 }

// ── Event Form (shared by Create and Edit) ────────────────────
function EventForm({ initial, submitLabel, onSubmit, onCancel, onUploadImage, toast }) {
  const [title,       setTitle]       = useState(initial?.title       || '')
  const [category,    setCategory]    = useState(initial?.category    || CATEGORIES[0])
  const [date,        setDate]        = useState(initial?.date        || '')
  const [time,        setTime]        = useState(initial?.time        || '20:00')
  const [location,    setLocation]    = useState(initial?.location    || '')
  const [city,        setCity]        = useState(initial?.city        || CITIES[0])
  const [desc,        setDesc]        = useState(initial?.desc        || '')
  const [emoji,       setEmoji]       = useState(initial?.emoji       || '')
  const [imageUrl,    setImageUrl]    = useState(initial?.imageUrl    || '')
  const [ticketTypes, setTicketTypes] = useState(
    initial?.tickets?.length
      ? initial.tickets.map(t => ({ name: t.name, price: String(t.price), qty: String(t.total) }))
      : [{ name: '', price: '', qty: '100' }]
  )
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const addTicketType    = () => setTicketTypes(tt => [...tt, { name: '', price: '', qty: '100' }])
  const removeTicketType = (i) => setTicketTypes(tt => tt.filter((_, idx) => idx !== i))
  const updateTicket     = (i, field, val) => setTicketTypes(tt => tt.map((t, idx) => idx === i ? { ...t, [field]: val } : t))

  const submit = async () => {
    if (!title.trim() || !date || !location.trim()) { setError('Titre, date et lieu sont requis.'); return }
    const tickets = ticketTypes
      .filter(t => t.name.trim())
      .map(t => ({ name: t.name.trim(), price: parseInt(t.price) || 0, total: parseInt(t.qty) || 100, sold: 0 }))
    if (!tickets.length) { setError('Ajoutez au moins un type de billet avec un nom.'); return }
    setError(''); setLoading(true)
    await onSubmit({ title: title.trim(), category, date, time, location: location.trim(), city, desc: desc.trim(), emoji: emoji || '🎟️', imageUrl: imageUrl.trim() || null, tickets })
    setLoading(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ ...groupStyle, flex: 2 }}>
          <label style={labelStyle}>Titre *</label>
          <input style={inputStyle} placeholder="Ex: Festival de Jazz de Lomé" value={title} onChange={e => setTitle(e.target.value)} />
        </div>
        <div style={{ ...groupStyle, flex: 1 }}>
          <label style={labelStyle}>Emoji</label>
          <input style={inputStyle} placeholder="🎵" maxLength={2} value={emoji} onChange={e => setEmoji(e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ ...groupStyle, flex: 1 }}>
          <label style={labelStyle}>Catégorie</label>
          <select style={inputStyle} value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div style={{ ...groupStyle, flex: 1 }}>
          <label style={labelStyle}>Ville</label>
          <select style={inputStyle} value={city} onChange={e => setCity(e.target.value)}>
            {CITIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12 }}>
        <div style={{ ...groupStyle, flex: 1 }}>
          <label style={labelStyle}>Date *</label>
          <input style={inputStyle} type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div style={{ ...groupStyle, flex: 1 }}>
          <label style={labelStyle}>Heure</label>
          <input style={inputStyle} type="time" value={time} onChange={e => setTime(e.target.value)} />
        </div>
      </div>

      <div style={groupStyle}>
        <label style={labelStyle}>Lieu *</label>
        <input style={inputStyle} placeholder="Palais des Congrès, Lomé" value={location} onChange={e => setLocation(e.target.value)} />
      </div>

      <div style={groupStyle}>
        <label style={labelStyle}>Description</label>
        <textarea style={{ ...inputStyle, resize: 'vertical' }} rows={3} placeholder="Décrivez votre événement…" value={desc} onChange={e => setDesc(e.target.value)} />
      </div>

      <div style={groupStyle}>
        <label style={labelStyle}>Image de couverture</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input style={{ ...inputStyle, flex: 1 }} type="url" placeholder="https://example.com/image.jpg" value={imageUrl} onChange={e => setImageUrl(e.target.value)} />
          {onUploadImage && (
            <label style={{ flexShrink: 0, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 14px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--muted)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 6 }}>
              📁 Fichier
              <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async (e) => {
                const file = e.target.files?.[0]
                if (!file) return
                toast?.('Téléchargement…', 'info')
                const url = await onUploadImage(file)
                if (url) { setImageUrl(url); toast?.('Image téléchargée ✓', 'success') }
                else toast?.('Erreur lors du téléchargement', 'error')
              }} />
            </label>
          )}
        </div>
        {imageUrl && (
          <img src={imageUrl} alt="Aperçu"
            style={{ marginTop: 8, width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }}
            onError={e => { e.currentTarget.style.display = 'none' }} />
        )}
      </div>

      <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 8, fontWeight: 500 }}>Types de billets</p>
      {ticketTypes.map((t, i) => (
        <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
          <input style={{ ...inputStyle, flex: 2 }} placeholder="Nom (ex: Standard)" value={t.name} onChange={e => updateTicket(i, 'name', e.target.value)} />
          <input style={{ ...inputStyle, flex: 1 }} placeholder="Prix FCFA" type="number" min="0" value={t.price} onChange={e => updateTicket(i, 'price', e.target.value)} />
          <input style={{ ...inputStyle, flex: 1 }} placeholder="Qté" type="number" min="1" value={t.qty} onChange={e => updateTicket(i, 'qty', e.target.value)} />
          {ticketTypes.length > 1 && (
            <button onClick={() => removeTicketType(i)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--danger)', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontSize: '0.85rem', flexShrink: 0 }}>✕</button>
          )}
        </div>
      ))}
      <button onClick={addTicketType} style={{ background: 'transparent', border: '1px dashed var(--border)', color: 'var(--muted)', borderRadius: 10, width: '100%', padding: '7px 0', cursor: 'pointer', fontSize: '0.82rem', marginBottom: 18 }}>
        + Ajouter un type de billet
      </button>

      {error && <p style={{ color: 'var(--danger)', fontSize: '0.82rem', marginBottom: 12 }}>{error}</p>}

      <div style={{ display: 'flex', gap: 10 }}>
        {onCancel && (
          <button onClick={onCancel} style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 10, padding: '10px 0', fontSize: '0.88rem', cursor: 'pointer' }}>
            Annuler
          </button>
        )}
        <button
          onClick={submit} disabled={loading}
          style={{ flex: 2, background: 'linear-gradient(135deg, var(--orange), var(--orange2))', color: '#fff', border: 'none', borderRadius: 10, padding: '10px 0', fontSize: '0.88rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'En cours…' : submitLabel}
        </button>
      </div>
    </div>
  )
}

// ── My Events Tab ─────────────────────────────────────────────
function MyEventsTab({ myEvents, onDelete, onEdit, loading, errors }) {
  if (loading.orgOrders) return <Spinner />
  if (errors.orgOrders) return <ErrorBanner msg={errors.orgOrders} />
  if (!myEvents.length) return (
    <p style={{ color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0' }}>
      Aucun événement créé. Utilisez l'onglet <b>Créer</b>.
    </p>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {myEvents.map(e => (
        <div key={e.id} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: 12, padding: '14px 16px',
        }}>
          <span style={{ fontSize: '1.8rem', flexShrink: 0, width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg2)', borderRadius: 8 }}>{e.emoji}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.title}</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {formatDate(e.date)} · {e.city} · {e.tickets.map(t => `${t.name}: ${t.sold}/${t.total}`).join(' · ')}
            </div>
          </div>
          <button
            onClick={() => onEdit(e)}
            style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .2s' }}
          >✏️</button>
          <button
            onClick={() => { if (window.confirm('Supprimer cet événement ?')) onDelete(e.id) }}
            style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--danger)', borderRadius: 8, width: 34, height: 34, cursor: 'pointer', fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .2s' }}
          >🗑️</button>
        </div>
      ))}
    </div>
  )
}

// ── Attendees Tab ─────────────────────────────────────────────
function AttendeesTab({ myEvents, organizerOrders, onCheckin, onRefund, loading, errors, onRefresh }) {
  const [selectedId, setSelectedId] = useState(myEvents[0]?.id ?? '')
  const [search, setSearch] = useState('')

  const attendees = organizerOrders.filter(p => p.items.some(i => i.eventId === selectedId))
  const filtered = search.trim()
    ? attendees.filter(p => p.userName.toLowerCase().includes(search.toLowerCase()) || p.userEmail.toLowerCase().includes(search.toLowerCase()))
    : attendees

  const checkedCount = filtered.filter(p => p.items.filter(i => i.eventId === selectedId).every(i => i.checkedIn)).length

  if (loading.orgOrders) return <Spinner />

  return (
    <div>
      <div style={{ display: 'flex', gap: 12, marginBottom: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 2, minWidth: 160 }}>
          <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 6 }}>Événement</label>
          <select style={inputStyle} value={selectedId} onChange={e => setSelectedId(e.target.value)}>
            {myEvents.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
            {!myEvents.length && <option value="">Aucun événement</option>}
          </select>
        </div>
        <div style={{ flex: 2, minWidth: 160 }}>
          <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 6 }}>Rechercher</label>
          <input style={inputStyle} placeholder="Nom ou email…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {filtered.length > 0 && (
        <div style={{ display: 'flex', gap: 16, marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}><b style={{ color: 'var(--text)' }}>{filtered.length}</b> participant{filtered.length !== 1 ? 's' : ''}</span>
          <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}><b style={{ color: 'var(--success)' }}>{checkedCount}</b> validé{checkedCount !== 1 ? 's' : ''}</span>
          <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}><b style={{ color: 'var(--orange)' }}>{filtered.length - checkedCount}</b> en attente</span>
        </div>
      )}

      {errors.orgOrders && <ErrorBanner msg={errors.orgOrders} onRetry={onRefresh} />}

      {!filtered.length ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0' }}>
          {search ? 'Aucun résultat.' : 'Aucun participant pour cet événement.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filtered.map(p => {
            const eventItems  = p.items.filter(i => i.eventId === selectedId)
            const isCheckedIn = eventItems.length > 0 && eventItems.every(i => i.checkedIn)
            const checkedInAt = eventItems.find(i => i.checkedInAt)?.checkedInAt
            const isRefunded  = p.status === 'refunded'

            return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0', borderBottom: '1px solid var(--border)',
                opacity: isRefunded ? 0.55 : 1,
              }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: isRefunded ? 'var(--bg3)' : 'linear-gradient(135deg, var(--purple), var(--orange))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem' }}>
                  {(p.userName || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.userName || 'Anonyme'} {isRefunded && <span style={{ color: 'var(--danger)', fontSize: '0.72rem', fontWeight: 400 }}>· remboursé</span>}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.userEmail && <span>{p.userEmail} · </span>}
                    {eventItems.map(i => `${i.ticketName}×${i.qty}`).join(', ')}
                  </div>
                  {isCheckedIn && checkedInAt && (
                    <div style={{ color: 'var(--success)', fontSize: '0.7rem', marginTop: 1 }}>
                      Validé le {new Date(checkedInAt).toLocaleString('fr-FR')}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {!isRefunded && (
                    <button
                      onClick={() => onCheckin(p.id, selectedId)}
                      style={{ padding: '5px 10px', borderRadius: 8, border: isCheckedIn ? '1px solid rgba(34,197,94,.4)' : '1px solid var(--border)', background: isCheckedIn ? 'rgba(34,197,94,.12)' : 'transparent', color: isCheckedIn ? 'var(--success)' : 'var(--muted)', cursor: 'pointer', fontSize: '0.75rem', transition: 'all .2s' }}
                    >
                      {isCheckedIn ? '✓ Validé' : 'Check-in'}
                    </button>
                  )}
                  {!isRefunded && (
                    <button
                      onClick={() => { if (window.confirm(`Rembourser la commande de ${p.userName} ?`)) onRefund(p.id) }}
                      style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.08)', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.75rem', transition: 'all .2s' }}
                    >
                      ↩ Rembourser
                    </button>
                  )}
                  {isRefunded && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--danger)', padding: '5px 10px' }}>Remboursé</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Admin Tab ─────────────────────────────────────────────────
function AdminTab({ applications, onPromote, onReject, onRefresh }) {
  const [busy, setBusy] = useState({})

  const act = async (id, fn) => {
    setBusy(b => ({ ...b, [id]: true }))
    await fn()
    setBusy(b => ({ ...b, [id]: false }))
  }

  if (!applications?.length) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>Aucune demande en attente.</p>
          <button onClick={onRefresh} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 12px', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.78rem' }}>↻ Actualiser</button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <p style={{ color: 'var(--muted)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
          {applications.length} demande{applications.length > 1 ? 's' : ''} en attente
        </p>
        <button onClick={onRefresh} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 12px', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.78rem' }}>↻ Actualiser</button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {applications.map(a => (
          <div key={a.id} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px' }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{a.userName}</div>
                <div style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: 2 }}>{a.userEmail}</div>
                <div style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: 2 }}>{new Date(a.date).toLocaleDateString('fr-FR')}</div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button disabled={busy[a.id]} onClick={() => act(a.id, () => onReject(a.id))} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(239,68,68,.4)', background: 'rgba(239,68,68,.1)', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.78rem', opacity: busy[a.id] ? 0.5 : 1 }}>Refuser</button>
                <button disabled={busy[a.id]} onClick={() => act(a.id, () => onPromote(a.userId, a.id))} style={{ padding: '5px 12px', borderRadius: 8, border: '1px solid rgba(34,197,94,.4)', background: 'rgba(34,197,94,.12)', color: 'var(--success)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, opacity: busy[a.id] ? 0.5 : 1 }}>
                  {busy[a.id] ? '…' : '✓ Approuver'}
                </button>
              </div>
            </div>
            {a.reason && (
              <p style={{ marginTop: 10, fontSize: '0.82rem', color: 'var(--text)', background: 'var(--bg2)', borderRadius: 8, padding: '8px 12px', lineHeight: 1.5 }}>"{a.reason}"</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main Modal ────────────────────────────────────────────────
export function OrganizerModal({
  open, user, isAdmin, myEvents, purchases, organizerOrders, organizerStats,
  applications,
  onClose, onCreate, onUpdate, onDelete, onCheckin, onRefund, onRefresh,
  onPromote, onReject, onLoadApplications, onUploadImage,
  loading = {}, errors = {},
  toast,
}) {
  const [tab, setTab] = useState('overview')
  const [editingEvent, setEditingEvent] = useState(null)

  if (!user) return null

  const tabs = isAdmin ? [...BASE_TABS, ADMIN_TAB] : BASE_TABS
  const attendeeOrders = organizerOrders || purchases || []

  const handleEdit = (event) => {
    setEditingEvent(event)
    setTab('events')
  }

  return (
    <Modal open={open} onClose={onClose} size="lg">
      <ModalHeader
        title="📊 Espace Organisateur"
        subtitle={`Bonjour, ${user.name.split(' ')[0]} !`}
      />
      <ModalBody>
        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg3)', borderRadius: 12, padding: 4, marginBottom: 22, flexWrap: 'wrap' }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); if (t.id !== 'events') setEditingEvent(null) }}
              style={{ flex: 1, minWidth: 70, padding: '8px 10px', borderRadius: 8, border: 'none', background: tab === t.id ? 'var(--bg2)' : 'transparent', color: tab === t.id ? 'var(--text)' : 'var(--muted)', cursor: 'pointer', fontSize: '0.78rem', transition: 'all .2s', boxShadow: tab === t.id ? '0 1px 4px rgba(0,0,0,.3)' : 'none', whiteSpace: 'nowrap' }}
            >
              {t.label}
              {t.id === 'admin' && applications?.length > 0 && (
                <span style={{ marginLeft: 5, background: 'var(--orange)', color: '#fff', borderRadius: 99, padding: '0 6px', fontSize: '0.7rem', fontWeight: 700 }}>{applications.length}</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'overview' && <OverviewTab organizerStats={organizerStats} loading={loading} errors={errors} onRefresh={onRefresh} />}

        {tab === 'analytics' && <AnalyticsTab organizerStats={organizerStats} myEvents={myEvents} loading={loading} errors={errors} onRefresh={onRefresh} />}

        {tab === 'events' && !editingEvent && (
          <MyEventsTab myEvents={myEvents} onDelete={onDelete} onEdit={handleEdit} loading={loading} errors={errors} />
        )}

        {tab === 'events' && editingEvent && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <button onClick={() => setEditingEvent(null)} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: '0.8rem' }}>← Retour</button>
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>Modifier : {editingEvent.title}</span>
            </div>
            <EventForm
              initial={editingEvent}
              onUploadImage={onUploadImage}
              submitLabel="💾 Sauvegarder les modifications"
              onSubmit={async (data) => {
                const ok = await onUpdate(editingEvent.id, data)
                if (ok) { setEditingEvent(null); toast?.('Événement mis à jour ✓', 'success') }
                else toast?.("Impossible de mettre à jour l'événement", 'error')
              }}
              onCancel={() => setEditingEvent(null)}
              toast={toast}
            />
          </div>
        )}

        {tab === 'create' && (
          <EventForm
            onUploadImage={onUploadImage}
            submitLabel="🚀 Publier l'événement"
            onSubmit={async (data) => {
              const created = await onCreate(data)
              if (created) toast?.('Événement publié ! 🎉', 'success')
              else toast?.("Impossible de publier l'événement", 'error')
            }}
            toast={toast}
          />
        )}

        {tab === 'attendees' && (
          <AttendeesTab
            myEvents={myEvents}
            organizerOrders={attendeeOrders}
            onCheckin={onCheckin}
            onRefund={onRefund}
            loading={loading} errors={errors}
            onRefresh={onRefresh}
          />
        )}

        {tab === 'admin' && isAdmin && (
          <AdminTab
            applications={applications || []}
            onPromote={onPromote}
            onReject={onReject}
            onRefresh={onLoadApplications}
          />
        )}
      </ModalBody>
    </Modal>
  )
}
