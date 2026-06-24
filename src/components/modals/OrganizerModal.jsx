import { useState, useEffect } from 'react'
import { Modal, ModalHeader, ModalBody } from '../Modal.jsx'
import { QRScanner } from '../QRScanner.jsx'
import { CATEGORIES, CITIES } from '../../data/events.js'
import { formatDate } from '../../utils/helpers.js'

const OTHER_CITY = '__other__'

const BASE_TABS = [
  { id: 'overview',     label: "Vue d'ensemble" },
  { id: 'analytics',   label: '📈 Analytique' },
  { id: 'events',      label: 'Mes Événements' },
  { id: 'create',      label: 'Créer' },
  { id: 'attendees',   label: 'Participants' },
  { id: 'invitations', label: '🔒 Invitations' },
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
function EventForm({ initial, submitLabel, onSubmit, onCancel, onUploadImage, onRequestCity, cities, toast }) {
  const allCities = cities?.length ? cities : CITIES

  const [title,       setTitle]       = useState(initial?.title       || '')
  const [category,    setCategory]    = useState(initial?.category    || CATEGORIES[0])
  const [date,        setDate]        = useState(initial?.date        || '')
  const [time,        setTime]        = useState(initial?.time        || '20:00')
  const [location,    setLocation]    = useState(initial?.location    || '')
  const initCity = initial?.city && allCities.includes(initial.city) ? initial.city : (initial?.city ? OTHER_CITY : allCities[0])
  const [citySelect,  setCitySelect]  = useState(initCity)
  const [customCity,  setCustomCity]  = useState(initial?.city && !allCities.includes(initial.city) ? initial.city : '')
  const [cityReqSent, setCityReqSent] = useState(false)
  const city = citySelect === OTHER_CITY ? customCity.trim() : citySelect
  const [desc,        setDesc]        = useState(initial?.desc        || '')
  const [emoji,       setEmoji]       = useState(initial?.emoji       || '')
  const [imageUrl,    setImageUrl]    = useState(initial?.imageUrl    || '')
  const [isPrivate,   setIsPrivate]   = useState(initial?.isPrivate   || false)
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
    if (!city) { setError('Veuillez entrer le nom de la ville.'); return }
    const tickets = ticketTypes
      .filter(t => t.name.trim())
      .map(t => ({ name: t.name.trim(), price: parseInt(t.price) || 0, total: parseInt(t.qty) || 100, sold: 0 }))
    if (!tickets.length) { setError('Ajoutez au moins un type de billet avec un nom.'); return }
    setError(''); setLoading(true)
    await onSubmit({ title: title.trim(), category, date, time, location: location.trim(), city, desc: desc.trim(), emoji: emoji || '🎟️', imageUrl: imageUrl.trim() || null, isPrivate, tickets })
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
          <select style={inputStyle} value={citySelect} onChange={e => { setCitySelect(e.target.value); setCityReqSent(false) }}>
            {allCities.map(c => <option key={c} value={c}>{c}</option>)}
            <option value={OTHER_CITY}>Autre ville…</option>
          </select>
          {citySelect === OTHER_CITY && (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  style={{ ...inputStyle, flex: 1 }}
                  placeholder="Nom de la ville"
                  value={customCity}
                  onChange={e => { setCustomCity(e.target.value); setCityReqSent(false) }}
                />
                <button
                  type="button"
                  disabled={!customCity.trim() || cityReqSent}
                  onClick={async () => {
                    const result = await onRequestCity?.(customCity)
                    if (result?.ok) { setCityReqSent(true); toast?.('Demande envoyée ! Les admins l\'examineront.', 'success') }
                    else toast?.(result?.error || 'Erreur lors de la demande', 'error')
                  }}
                  style={{ flexShrink: 0, padding: '0 14px', borderRadius: 10, border: 'none', background: cityReqSent ? 'rgba(34,197,94,.2)' : 'linear-gradient(135deg,var(--purple),var(--purple2))', color: cityReqSent ? 'var(--success)' : '#fff', fontSize: '0.82rem', fontWeight: 600, cursor: (!customCity.trim() || cityReqSent) ? 'not-allowed' : 'pointer', opacity: (!customCity.trim() || cityReqSent) ? 0.6 : 1 }}
                >
                  {cityReqSent ? '✓ Demandé' : 'Demander'}
                </button>
              </div>
              <p style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: 5 }}>
                Votre événement sera publié. Les admins ajouteront la ville à la liste.
              </p>
            </div>
          )}
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

      {/* Private toggle */}
      <div
        onClick={() => setIsPrivate(v => !v)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: isPrivate ? 'rgba(124,58,237,.12)' : 'var(--bg3)', border: `1px solid ${isPrivate ? 'var(--purple)' : 'var(--border)'}`, borderRadius: 10, padding: '12px 14px', marginBottom: 14, cursor: 'pointer', transition: 'all .2s', userSelect: 'none' }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: isPrivate ? 'var(--purple3)' : 'var(--text)' }}>🔒 Événement privé</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginTop: 2 }}>
            {isPrivate ? 'Visible uniquement par les personnes invitées' : 'Visible par tous les utilisateurs'}
          </div>
        </div>
        <div style={{ width: 44, height: 24, borderRadius: 99, background: isPrivate ? 'var(--purple)' : 'var(--bg2)', border: '1px solid var(--border)', position: 'relative', transition: 'background .2s', flexShrink: 0 }}>
          <div style={{ position: 'absolute', top: 2, left: isPrivate ? 22 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .2s', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
        </div>
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

// ── Check-in confirm dialog ────────────────────────────────────
function CheckinDialog({ order, eventId, onConfirm, onClose }) {
  const items    = order.items.filter(i => !eventId || i.eventId === eventId)
  const item     = items[0]
  const remaining = item ? item.qty - (item.checkedInCount || 0) : 0
  const [count, setCount] = useState(remaining > 0 ? 1 : 0)
  const [busy,  setBusy]  = useState(false)
  const [done,  setDone]  = useState(null)

  const confirm = async () => {
    setBusy(true)
    const result = await onConfirm(item.id, count)
    setBusy(false)
    if (result.ok) setDone(result)
    else setDone({ error: result.error })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 10000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: 'var(--bg2)', borderRadius: '24px 24px 0 0',
        padding: '28px 24px 40px', width: '100%', maxWidth: 480,
        border: '1px solid var(--border)', borderBottom: 'none',
      }}>
        {done ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            {done.error ? (
              <>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>❌</div>
                <div style={{ color: 'var(--danger)', fontWeight: 700 }}>{done.error}</div>
              </>
            ) : (
              <>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>✅</div>
                <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--success)', marginBottom: 6 }}>
                  {done.validated} billet{done.validated > 1 ? 's' : ''} validé{done.validated > 1 ? 's' : ''} !
                </div>
                <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>
                  {order.userName} · {done.newCount}/{item.qty} utilisé{done.newCount > 1 ? 's' : ''}
                </div>
              </>
            )}
            <button onClick={onClose} style={{ marginTop: 20, padding: '10px 32px', borderRadius: 12, border: 'none', background: 'var(--bg3)', color: 'var(--text)', cursor: 'pointer', fontWeight: 600 }}>
              Fermer
            </button>
          </div>
        ) : remaining <= 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>⚠️</div>
            <div style={{ fontWeight: 700, color: '#eab308', marginBottom: 6 }}>Billet déjà entièrement utilisé</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{order.userName} · {item?.qty}/{item?.qty} billets validés</div>
            <button onClick={onClose} style={{ marginTop: 20, padding: '10px 32px', borderRadius: 12, border: 'none', background: 'var(--bg3)', color: 'var(--text)', cursor: 'pointer', fontWeight: 600 }}>Fermer</button>
          </div>
        ) : (
          <>
            {/* Holder info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, var(--purple), var(--orange))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1.1rem', flexShrink: 0 }}>
                {(order.userName || '?')[0].toUpperCase()}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: '1rem' }}>{order.userName || 'Anonyme'}</div>
                <div style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>{item?.ticketName} · {item?.qty} billet{item?.qty > 1 ? 's' : ''} achetés</div>
              </div>
            </div>

            {/* Progress */}
            <div style={{ background: 'var(--bg3)', borderRadius: 12, padding: '12px 16px', marginBottom: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 8 }}>
                <span>Billets utilisés</span>
                <span style={{ color: 'var(--text)', fontWeight: 700 }}>{item.checkedInCount || 0} / {item.qty}</span>
              </div>
              <div style={{ height: 6, background: 'var(--bg2)', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${((item.checkedInCount || 0) / item.qty) * 100}%`, background: 'linear-gradient(90deg, var(--purple), var(--success))', borderRadius: 4 }} />
              </div>
              <div style={{ marginTop: 8, fontSize: '0.8rem', color: 'var(--success)', fontWeight: 600 }}>
                {remaining} billet{remaining > 1 ? 's' : ''} restant{remaining > 1 ? 's' : ''}
              </div>
            </div>

            {/* Count selector */}
            {item.qty > 1 && (
              <div style={{ marginBottom: 22 }}>
                <div style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 10 }}>Combien de billets valider ?</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button onClick={() => setCount(c => Math.max(1, c - 1))} style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)', fontSize: '1.2rem', cursor: 'pointer' }}>−</button>
                  <div style={{ flex: 1, textAlign: 'center', fontSize: '1.8rem', fontWeight: 800, color: 'var(--text)' }}>{count}</div>
                  <button onClick={() => setCount(c => Math.min(remaining, c + 1))} style={{ width: 40, height: 40, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg3)', color: 'var(--text)', fontSize: '1.2rem', cursor: 'pointer' }}>+</button>
                </div>
                <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                  {Array.from({ length: remaining }, (_, i) => i + 1).map(n => (
                    <button key={n} onClick={() => setCount(n)} style={{ padding: '4px 12px', borderRadius: 8, border: `1px solid ${count === n ? 'var(--purple)' : 'var(--border)'}`, background: count === n ? 'rgba(124,58,237,.15)' : 'var(--bg3)', color: count === n ? 'var(--purple3)' : 'var(--muted)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: count === n ? 700 : 400 }}>
                      {n === remaining ? `Tous (${n})` : n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button onClick={confirm} disabled={busy} style={{
              width: '100%', padding: '14px', borderRadius: 14, border: 'none',
              background: 'linear-gradient(135deg, var(--purple), var(--purple2))',
              color: '#fff', fontWeight: 700, fontSize: '1rem', cursor: 'pointer',
              boxShadow: '0 4px 20px rgba(124,58,237,.35)', opacity: busy ? 0.7 : 1,
            }}>
              {busy ? 'Validation…' : `✓ Valider ${count} billet${count > 1 ? 's' : ''}`}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ── Attendees Tab ─────────────────────────────────────────────
function AttendeesTab({ myEvents, organizerOrders, onCheckin, onCheckinByRef, onCheckinPartial, onLookupByRef, onRefund, loading, errors, onRefresh }) {
  const [selectedId,  setSelectedId]  = useState(myEvents[0]?.id ?? '')
  const [search,      setSearch]      = useState('')
  const [scanRef,     setScanRef]     = useState('')
  const [scanResult,  setScanResult]  = useState(null)
  const [scanning,    setScanning]    = useState(false)
  const [showCamera,  setShowCamera]  = useState(false)
  const [confirmOrder, setConfirmOrder] = useState(null)

  const attendees = organizerOrders.filter(p => p.items.some(i => i.eventId === selectedId))
  const filtered  = search.trim()
    ? attendees.filter(p =>
        p.userName.toLowerCase().includes(search.toLowerCase()) ||
        p.userEmail.toLowerCase().includes(search.toLowerCase()) ||
        p.id.toLowerCase().startsWith(search.toLowerCase()))
    : attendees

  const totalTickets   = attendees.reduce((s, p) => s + p.items.filter(i => i.eventId === selectedId).reduce((ss, i) => ss + i.qty, 0), 0)
  const validatedCount = attendees.reduce((s, p) => s + p.items.filter(i => i.eventId === selectedId).reduce((ss, i) => ss + (i.checkedInCount || 0), 0), 0)
  const pct = totalTickets > 0 ? Math.round((validatedCount / totalTickets) * 100) : 0

  const handleManualScan = async () => {
    if (!scanRef.trim()) return
    setScanning(true)
    setScanResult(null)
    const order = onLookupByRef(scanRef.trim())
    setScanning(false)
    if (!order) { setScanResult({ error: 'Référence introuvable.' }); return }
    setScanRef('')
    setConfirmOrder(order)
  }

  const handleCameraScan = (data) => {
    setShowCamera(false)
    const order = onLookupByRef(data)
    if (!order) { setScanResult({ error: 'Billet non reconnu ou non lié à cet événement.' }); return }
    setConfirmOrder(order)
  }

  if (loading.orgOrders) return <Spinner />

  return (
    <div>
      {/* ── Camera scanner fullscreen ── */}
      {showCamera && <QRScanner onScan={handleCameraScan} onClose={() => setShowCamera(false)} />}

      {/* ── Confirm dialog ── */}
      {confirmOrder && (
        <CheckinDialog
          order={confirmOrder}
          eventId={selectedId}
          onConfirm={onCheckinPartial}
          onClose={() => { setConfirmOrder(null); setScanResult(null) }}
        />
      )}

      {/* ── Scan buttons ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
        <button
          onClick={() => setShowCamera(true)}
          style={{
            flex: 1, padding: '13px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, var(--purple), var(--purple2))',
            color: '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: '0 4px 16px rgba(124,58,237,.3)',
          }}
        >
          📷 Scanner un billet
        </button>
      </div>

      {/* ── Manual ref lookup ── */}
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', marginBottom: 16 }}>
        <div style={{ fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 8 }}>Ou saisir la référence manuellement</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            style={{ ...inputStyle, flex: 1, fontFamily: 'monospace', letterSpacing: '0.08em', textTransform: 'uppercase', fontSize: '0.88rem' }}
            placeholder="Ex: A3F7B2C1"
            value={scanRef}
            onChange={e => { setScanRef(e.target.value.toUpperCase()); setScanResult(null) }}
            onKeyDown={e => e.key === 'Enter' && handleManualScan()}
          />
          <button
            onClick={handleManualScan}
            disabled={scanning || !scanRef.trim()}
            style={{ padding: '0 16px', borderRadius: 10, border: 'none', background: 'var(--bg2)', color: 'var(--text)', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', opacity: scanning || !scanRef.trim() ? 0.5 : 1, border: '1px solid var(--border)' }}
          >
            {scanning ? '…' : 'Chercher'}
          </button>
        </div>
        {scanResult?.error && (
          <div style={{ marginTop: 8, color: 'var(--danger)', fontSize: '0.82rem' }}>❌ {scanResult.error}</div>
        )}
      </div>

      {/* ── Progress bar ── */}
      {totalTickets > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 6 }}>
            <span><b style={{ color: 'var(--success)' }}>{validatedCount}</b> / {totalTickets} billets validés</span>
            <span style={{ color: 'var(--text)', fontWeight: 700 }}>{pct}%</span>
          </div>
          <div style={{ height: 8, background: 'var(--bg3)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--purple), var(--success))', borderRadius: 4, transition: 'width .4s' }} />
          </div>
        </div>
      )}

      {/* ── Event + search filters ── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <select style={{ ...inputStyle, flex: 2, minWidth: 140 }} value={selectedId} onChange={e => { setSelectedId(e.target.value); setScanResult(null) }}>
          {myEvents.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
          {!myEvents.length && <option value="">Aucun événement</option>}
        </select>
        <input style={{ ...inputStyle, flex: 2, minWidth: 140 }} placeholder="Nom, email…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {errors.orgOrders && <ErrorBanner msg={errors.orgOrders} onRetry={onRefresh} />}

      {/* ── Attendee list ── */}
      {!filtered.length ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0' }}>
          {search ? 'Aucun résultat.' : 'Aucun participant pour cet événement.'}
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {filtered.map(p => {
            const eventItems   = p.items.filter(i => i.eventId === selectedId)
            const totalQty     = eventItems.reduce((s, i) => s + i.qty, 0)
            const validatedQty = eventItems.reduce((s, i) => s + (i.checkedInCount || 0), 0)
            const fullyIn      = validatedQty >= totalQty && totalQty > 0
            const partialIn    = validatedQty > 0 && !fullyIn
            const isRefunded   = p.status === 'refunded'

            return (
              <div key={p.id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0', borderBottom: '1px solid var(--border)',
                opacity: isRefunded ? 0.55 : 1,
              }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', flexShrink: 0, background: isRefunded ? 'var(--bg3)' : fullyIn ? 'rgba(34,197,94,.2)' : 'linear-gradient(135deg, var(--purple), var(--orange))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.9rem', border: fullyIn ? '2px solid var(--success)' : 'none' }}>
                  {fullyIn ? '✓' : (p.userName || '?')[0].toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.userName || 'Anonyme'}
                    {isRefunded && <span style={{ color: 'var(--danger)', fontSize: '0.72rem', fontWeight: 400, marginLeft: 6 }}>remboursé</span>}
                  </div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: 2 }}>
                    {eventItems.map(i => `${i.ticketName}×${i.qty}`).join(', ')}
                    {' · '}
                    <span style={{ color: fullyIn ? 'var(--success)' : partialIn ? '#eab308' : 'var(--muted)', fontWeight: 600 }}>
                      {validatedQty}/{totalQty} validé{validatedQty !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {!isRefunded && !fullyIn && (
                    <button
                      onClick={() => setConfirmOrder(p)}
                      style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border)', background: partialIn ? 'rgba(234,179,8,.1)' : 'transparent', color: partialIn ? '#eab308' : 'var(--muted)', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      {partialIn ? `+Valider` : 'Valider'}
                    </button>
                  )}
                  {fullyIn && <span style={{ fontSize: '0.75rem', color: 'var(--success)', padding: '5px 6px', fontWeight: 700 }}>✓ Complet</span>}
                  {!isRefunded && (
                    <button
                      onClick={() => { if (window.confirm(`Rembourser ${p.userName} ?`)) onRefund(p.id) }}
                      style={{ padding: '5px 8px', borderRadius: 8, border: '1px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.08)', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.75rem' }}
                    >
                      ↩
                    </button>
                  )}
                  {isRefunded && <span style={{ fontSize: '0.75rem', color: 'var(--danger)', padding: '5px 10px' }}>Remboursé</span>}
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
function AdminTab({ applications, onPromote, onReject, onRefresh, onLoadVerifRequests, onApproveVerif, onDenyVerif, onLoadCityRequests, onApproveCityRequest, onDenyCityRequest }) {
  const [busy, setBusy] = useState({})
  const [verifRequests, setVerifRequests] = useState([])
  const [denyTarget, setDenyTarget] = useState(null)
  const [denyReason, setDenyReason] = useState('')
  const [verifBusy, setVerifBusy] = useState({})
  const [cityRequests, setCityRequests] = useState([])
  const [cityBusy, setCityBusy] = useState({})

  // Load verification + city requests on mount
  useEffect(() => {
    onLoadVerifRequests?.().then(setVerifRequests)
    onLoadCityRequests?.().then(setCityRequests)
  }, [])

  const refreshVerif = () => onLoadVerifRequests?.().then(setVerifRequests)

  const handleApprove = async (userId) => {
    setVerifBusy(b => ({ ...b, [userId]: true }))
    const ok = await onApproveVerif(userId)
    setVerifBusy(b => ({ ...b, [userId]: false }))
    if (ok) refreshVerif()
  }

  const handleDeny = async () => {
    if (!denyReason.trim()) return
    setVerifBusy(b => ({ ...b, [denyTarget]: true }))
    const ok = await onDenyVerif(denyTarget, denyReason.trim())
    setVerifBusy(b => ({ ...b, [denyTarget]: false }))
    if (ok) { setDenyTarget(null); setDenyReason(''); refreshVerif() }
  }

  const act = async (id, fn) => {
    setBusy(b => ({ ...b, [id]: true }))
    await fn()
    setBusy(b => ({ ...b, [id]: false }))
  }

  return (
    <div>
      {/* ── Verification requests ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p style={{ color: 'var(--muted)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
            🛡️ Demandes de vérification ({verifRequests.length})
          </p>
          <button onClick={refreshVerif} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 12px', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.78rem' }}>↻</button>
        </div>

        {/* Deny modal */}
        {denyTarget && (
          <div style={{ background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.3)', borderRadius: 12, padding: '14px 16px', marginBottom: 12 }}>
            <p style={{ fontWeight: 600, fontSize: '0.88rem', marginBottom: 8, color: 'var(--danger)' }}>Motif du refus *</p>
            <textarea
              style={{ width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', color: 'var(--text)', fontSize: '0.85rem', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
              rows={3} placeholder="Expliquez pourquoi la demande est refusée…"
              value={denyReason} onChange={e => setDenyReason(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              <button onClick={() => { setDenyTarget(null); setDenyReason('') }} style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 0', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.82rem' }}>Annuler</button>
              <button onClick={handleDeny} disabled={!denyReason.trim()} style={{ flex: 2, background: 'rgba(239,68,68,.2)', border: '1px solid rgba(239,68,68,.4)', borderRadius: 8, padding: '7px 0', color: 'var(--danger)', cursor: denyReason.trim() ? 'pointer' : 'not-allowed', fontSize: '0.82rem', fontWeight: 600, opacity: denyReason.trim() ? 1 : 0.5 }}>Confirmer le refus</button>
            </div>
          </div>
        )}

        {verifRequests.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>Aucune demande de vérification en attente.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {verifRequests.map(r => (
              <div key={r.id} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{r.profiles?.name} <span style={{ color: 'var(--muted)', fontWeight: 400, fontSize: '0.75rem' }}>#{String(r.profiles?.user_number || '').padStart(6,'0')}</span></div>
                    <div style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: 2 }}>{r.profiles?.email}</div>
                    <a href={r.id_card_url} target="_blank" rel="noreferrer" style={{ color: 'var(--purple3)', fontSize: '0.75rem', marginTop: 4, display: 'inline-block' }}>📄 Voir le document →</a>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      disabled={verifBusy[r.user_id]}
                      onClick={() => { setDenyTarget(r.user_id); setDenyReason('') }}
                      style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(239,68,68,.4)', background: 'rgba(239,68,68,.1)', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.75rem', opacity: verifBusy[r.user_id] ? 0.5 : 1 }}
                    >✗ Refuser</button>
                    <button
                      disabled={verifBusy[r.user_id]}
                      onClick={() => handleApprove(r.user_id)}
                      style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(34,197,94,.4)', background: 'rgba(34,197,94,.12)', color: 'var(--success)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600, opacity: verifBusy[r.user_id] ? 0.5 : 1 }}
                    >{verifBusy[r.user_id] ? '…' : '✓ Approuver'}</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── City requests ── */}
      <div style={{ marginBottom: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p style={{ color: 'var(--muted)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
            🌍 Demandes de ville ({cityRequests.length})
          </p>
          <button onClick={() => onLoadCityRequests?.().then(setCityRequests)} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 12px', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.78rem' }}>↻</button>
        </div>
        {cityRequests.length === 0 ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>Aucune demande de ville en attente.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {cityRequests.map(r => (
              <div key={r.id} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>🌍 {r.name}</div>
                  <div style={{ color: 'var(--muted)', fontSize: '0.75rem', marginTop: 2 }}>
                    Demandé par {r.profiles?.name || r.profiles?.email || 'Inconnu'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button
                    disabled={cityBusy[r.id]}
                    onClick={async () => {
                      setCityBusy(b => ({ ...b, [r.id]: true }))
                      const ok = await onDenyCityRequest?.(r.id)
                      setCityBusy(b => ({ ...b, [r.id]: false }))
                      if (ok) setCityRequests(prev => prev.filter(x => x.id !== r.id))
                    }}
                    style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(239,68,68,.4)', background: 'rgba(239,68,68,.1)', color: 'var(--danger)', cursor: 'pointer', fontSize: '0.75rem' }}
                  >✗ Refuser</button>
                  <button
                    disabled={cityBusy[r.id]}
                    onClick={async () => {
                      setCityBusy(b => ({ ...b, [r.id]: true }))
                      const ok = await onApproveCityRequest?.(r.id, r.name)
                      setCityBusy(b => ({ ...b, [r.id]: false }))
                      if (ok) setCityRequests(prev => prev.filter(x => x.id !== r.id))
                    }}
                    style={{ padding: '5px 10px', borderRadius: 8, border: '1px solid rgba(34,197,94,.4)', background: 'rgba(34,197,94,.12)', color: 'var(--success)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600 }}
                  >{cityBusy[r.id] ? '…' : '✓ Approuver'}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Organizer applications ── */}
      <div style={{ paddingTop: 20, borderTop: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p style={{ color: 'var(--muted)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
            🎤 Demandes organisateur ({applications?.length || 0})
          </p>
          <button onClick={onRefresh} style={{ background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, padding: '5px 12px', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.78rem' }}>↻ Actualiser</button>
        </div>
        {!applications?.length ? (
          <p style={{ color: 'var(--muted)', fontSize: '0.82rem' }}>Aucune demande en attente.</p>
        ) : (
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
                {a.reason && <p style={{ marginTop: 10, fontSize: '0.82rem', color: 'var(--text)', background: 'var(--bg2)', borderRadius: 8, padding: '8px 12px', lineHeight: 1.5 }}>"{a.reason}"</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Invitations Tab ───────────────────────────────────────────
function InvitationsTab({ myEvents, onInvite, onLoadInvitations, toast }) {
  const [selectedId,   setSelectedId]   = useState(myEvents[0]?.id ?? '')
  const [email,        setEmail]        = useState('')
  const [invitations,  setInvitations]  = useState([])
  const [loading,      setLoading]      = useState(false)
  const [copied,       setCopied]       = useState(null)

  const selectedEvent = myEvents.find(e => e.id === selectedId)

  const load = async (id) => {
    if (!id) return
    const list = await onLoadInvitations(id)
    setInvitations(list)
  }

  const handleSelect = (id) => { setSelectedId(id); load(id) }

  // Load on mount
  useEffect(() => { if (selectedId) load(selectedId) }, [])

  const invite = async () => {
    if (!email.trim() || !selectedId) return
    setLoading(true)
    const result = await onInvite(
      selectedId, email,
      selectedEvent?.title, selectedEvent?.date, selectedEvent?.city
    )
    setLoading(false)
    if (result?.ok) {
      toast?.('Invitation envoyée ✓', 'success')
      setEmail('')
      load(selectedId)
    } else {
      toast?.(result?.error || 'Erreur lors de l\'envoi', 'error')
    }
  }

  const copyLink = (token) => {
    const url = `${window.location.origin}/?invite=${token}`
    navigator.clipboard.writeText(url).then(() => {
      setCopied(token)
      setTimeout(() => setCopied(null), 2000)
    })
  }

  const privateEvents = myEvents.filter(e => e.isPrivate)

  return (
    <div>
      {!myEvents.length ? (
        <p style={{ color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center', padding: '24px 0' }}>Créez d'abord un événement.</p>
      ) : (
        <>
          <div style={groupStyle}>
            <label style={labelStyle}>Événement</label>
            <select style={inputStyle} value={selectedId} onChange={e => handleSelect(e.target.value)}>
              {myEvents.map(e => (
                <option key={e.id} value={e.id}>{e.isPrivate ? '🔒 ' : ''}{e.title}</option>
              ))}
            </select>
            {selectedEvent && !selectedEvent.isPrivate && (
              <p style={{ color: 'var(--orange)', fontSize: '0.78rem', marginTop: 6 }}>⚠️ Cet événement est public. Les invitations fonctionnent mais tout le monde peut y accéder.</p>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
            <input
              style={{ ...inputStyle, flex: 1 }}
              type="email"
              placeholder="email@exemple.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && invite()}
            />
            <button
              onClick={invite}
              disabled={loading || !email.trim()}
              style={{ flexShrink: 0, background: 'linear-gradient(135deg, var(--purple), var(--purple2))', color: '#fff', border: 'none', borderRadius: 10, padding: '0 18px', cursor: loading ? 'not-allowed' : 'pointer', fontSize: '0.85rem', fontWeight: 600, opacity: loading ? 0.7 : 1 }}
            >
              {loading ? '…' : '✉️ Inviter'}
            </button>
          </div>

          {invitations.length > 0 && (
            <>
              <p style={{ fontSize: '0.78rem', color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>
                {invitations.length} invitation{invitations.length !== 1 ? 's' : ''}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {invitations.map(inv => (
                  <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inv.email}</div>
                      <div style={{ fontSize: '0.72rem', color: inv.status === 'accepted' ? 'var(--success)' : 'var(--muted)', marginTop: 2 }}>
                        {inv.status === 'accepted' ? '✓ Accepté' : '⏳ En attente'}
                      </div>
                    </div>
                    <button
                      onClick={() => copyLink(inv.token)}
                      style={{ flexShrink: 0, background: 'transparent', border: '1px solid var(--border)', color: copied === inv.token ? 'var(--success)' : 'var(--muted)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: '0.75rem', transition: 'all .2s' }}
                    >
                      {copied === inv.token ? '✓ Copié' : '🔗 Lien'}
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {invitations.length === 0 && selectedId && (
            <p style={{ color: 'var(--muted)', fontSize: '0.85rem', textAlign: 'center', padding: '20px 0' }}>
              Aucune invitation envoyée pour cet événement.
            </p>
          )}
        </>
      )}
    </div>
  )
}

// ── Main Modal ────────────────────────────────────────────────
export function OrganizerModal({
  open, user, isAdmin, myEvents, purchases, organizerOrders, organizerStats,
  applications,
  onClose, onCreate, onUpdate, onDelete, onCheckin, onCheckinByRef, onCheckinPartial, onLookupByRef, onRefund, onRefresh,
  onPromote, onReject, onLoadApplications, onUploadImage,
  onInvite, onLoadInvitations,
  onLoadVerifRequests, onApproveVerif, onDenyVerif,
  onRequestCity, onLoadCityRequests, onApproveCityRequest, onDenyCityRequest,
  cities,
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
              onRequestCity={onRequestCity}
              cities={cities}
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
            onRequestCity={onRequestCity}
            cities={cities}
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
            onCheckinByRef={onCheckinByRef}
            onCheckinPartial={onCheckinPartial}
            onLookupByRef={onLookupByRef}
            onRefund={onRefund}
            loading={loading} errors={errors}
            onRefresh={onRefresh}
          />
        )}

        {tab === 'invitations' && (
          <InvitationsTab
            myEvents={myEvents}
            onInvite={onInvite}
            onLoadInvitations={onLoadInvitations}
            toast={toast}
          />
        )}

        {tab === 'admin' && isAdmin && (
          <AdminTab
            applications={applications || []}
            onPromote={onPromote}
            onReject={onReject}
            onRefresh={onLoadApplications}
            onLoadVerifRequests={onLoadVerifRequests}
            onApproveVerif={onApproveVerif}
            onDenyVerif={onDenyVerif}
            onLoadCityRequests={onLoadCityRequests}
            onApproveCityRequest={onApproveCityRequest}
            onDenyCityRequest={onDenyCityRequest}
          />
        )}
      </ModalBody>
    </Modal>
  )
}
