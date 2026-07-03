import { useState } from 'react'
import { Modal, ModalHeader, ModalBody } from '../Modal.jsx'

const PLATFORM_FEE_PCT = 10

function formatDate(iso) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function ListingCard({ listing, currentUserId, onBuy }) {
  const fee   = Math.round(listing.ask_price_cfa * PLATFORM_FEE_PCT / 100)
  const total = listing.ask_price_cfa + fee
  const isOwn = listing.seller_id === currentUserId
  const isPast = listing.event_date && new Date(listing.event_date) < new Date()

  return (
    <div style={{
      background: 'var(--bg3)',
      border: '1px solid var(--border)',
      borderRadius: 14,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      opacity: isPast ? 0.5 : 1,
    }}>
      {/* Event banner */}
      <div style={{
        position: 'relative',
        height: 90,
        background: listing.event_image_url
          ? `url(${listing.event_image_url}) center/cover`
          : 'linear-gradient(135deg, var(--purple) 0%, var(--orange) 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        {!listing.event_image_url && (
          <span style={{ fontSize: '2.4rem' }}>{listing.event_emoji || '🎟️'}</span>
        )}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,.7) 0%, transparent 60%)',
        }} />
        <div style={{
          position: 'absolute', bottom: 8, left: 12, right: 12,
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
        }}>
          <div style={{ color: '#fff', fontSize: '0.8rem', fontWeight: 700, lineHeight: 1.2 }}>
            {listing.event_title}
          </div>
          <div style={{ background: 'rgba(255,255,255,.15)', backdropFilter: 'blur(8px)', borderRadius: 99, padding: '2px 8px', fontSize: '0.7rem', color: '#fff', whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 8 }}>
            {formatDate(listing.event_date)}
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 14px', flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{listing.ticket_name}</div>
            <div style={{ color: 'var(--muted)', fontSize: '0.74rem', marginTop: 2 }}>
              {listing.event_city && `📍 ${listing.event_city} · `}Vendeur particulier · ×{listing.quantity}
            </div>
          </div>
          {isOwn && (
            <span style={{ background: 'rgba(142,45,110,.15)', color: 'var(--purple2)', fontSize: '0.7rem', fontWeight: 700, borderRadius: 99, padding: '2px 8px', whiteSpace: 'nowrap', flexShrink: 0 }}>
              Ma vente
            </span>
          )}
        </div>

        {/* Price breakdown */}
        <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: '8px 12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 4 }}>
            <span>Prix vendeur</span>
            <span>{listing.ask_price_cfa.toLocaleString('fr-FR')} FCFA</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--muted)', marginBottom: 6 }}>
            <span>Frais de service ({PLATFORM_FEE_PCT}%)</span>
            <span>+{fee.toLocaleString('fr-FR')} FCFA</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.95rem', color: 'var(--orange)', borderTop: '1px solid var(--border)', paddingTop: 6 }}>
            <span>Total</span>
            <span>{total.toLocaleString('fr-FR')} FCFA</span>
          </div>
        </div>

        <button
          onClick={() => onBuy(listing)}
          disabled={isOwn || isPast}
          style={{
            width: '100%', padding: '9px 0', borderRadius: 10, border: 'none', cursor: isOwn || isPast ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.85rem',
            background: isOwn || isPast ? 'var(--bg2)' : 'linear-gradient(135deg, var(--orange), var(--orange2))',
            color: isOwn || isPast ? 'var(--muted)' : '#fff',
            transition: 'all .2s',
          }}
        >
          {isPast ? 'Événement passé' : isOwn ? 'Votre annonce' : `Acheter — ${total.toLocaleString('fr-FR')} FCFA`}
        </button>
      </div>
    </div>
  )
}

// ── Buy confirmation panel ─────────────────────────────────────
function BuyPanel({ listing, onConfirm, onCancel, busy }) {
  const [method, setMethod] = useState('simulation')
  const [phone,  setPhone]  = useState('')
  const fee   = Math.round(listing.ask_price_cfa * PLATFORM_FEE_PCT / 100)
  const total = listing.ask_price_cfa + fee

  return (
    <div style={{ padding: '0 0 4px' }}>
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
        <div style={{ fontWeight: 700, marginBottom: 4 }}>{listing.event_title}</div>
        <div style={{ color: 'var(--muted)', fontSize: '0.8rem', marginBottom: 10 }}>
          {listing.ticket_name} · {formatDate(listing.event_date)}
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
          <span>Prix vendeur</span><span>{listing.ask_price_cfa.toLocaleString('fr-FR')} FCFA</span>
        </div>
        <div style={{ fontSize: '0.82rem', color: 'var(--muted)', display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span>Frais de service</span><span>+{fee.toLocaleString('fr-FR')} FCFA</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, color: 'var(--orange)', fontSize: '1rem', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
          <span>À payer</span><span>{total.toLocaleString('fr-FR')} FCFA</span>
        </div>
      </div>

      <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Méthode de paiement</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          { id: 'simulation', label: '💳 Carte (simulation)' },
          { id: 'tmoney',     label: '📱 T-Money' },
          { id: 'flooz',      label: '🟡 Flooz' },
        ].map(m => (
          <button key={m.id} onClick={() => setMethod(m.id)} style={{
            padding: '7px 14px', borderRadius: 10, border: `1px solid ${method === m.id ? 'var(--orange)' : 'var(--border)'}`,
            background: method === m.id ? 'rgba(245,166,35,.12)' : 'transparent',
            color: method === m.id ? 'var(--orange)' : 'var(--muted)',
            cursor: 'pointer', fontSize: '0.8rem', fontWeight: method === m.id ? 700 : 400,
          }}>{m.label}</button>
        ))}
      </div>

      {method !== 'simulation' && (
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: 'block', fontSize: '0.82rem', color: 'var(--muted)', marginBottom: 6 }}>Numéro de téléphone</label>
          <input
            style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 13px', color: 'var(--text)', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
            placeholder="+228 90 00 00 00"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onCancel} disabled={busy} style={{ flex: 1, background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)', borderRadius: 10, padding: '10px 0', fontSize: '0.88rem', cursor: 'pointer' }}>
          Annuler
        </button>
        <button onClick={() => onConfirm(listing, method, phone)} disabled={busy} style={{
          flex: 2, background: 'linear-gradient(135deg, var(--orange), var(--orange2))',
          color: '#fff', border: 'none', borderRadius: 10, padding: '10px 0', fontSize: '0.88rem',
          fontWeight: 700, cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1,
        }}>
          {busy ? 'Traitement…' : `Confirmer — ${total.toLocaleString('fr-FR')} FCFA`}
        </button>
      </div>
    </div>
  )
}

// ── Main Modal ─────────────────────────────────────────────────
export function ResaleMarketModal({ open, listings, currentUserId, loading, onClose, onBuy }) {
  const [buyingListing, setBuyingListing] = useState(null)
  const [busy,          setBusy]          = useState(false)
  const [search,        setSearch]        = useState('')

  const today = new Date().toISOString().slice(0, 10)
  const upcoming = listings.filter(l => !l.event_date || l.event_date.slice(0, 10) >= today)

  const filtered = search.trim()
    ? upcoming.filter(l =>
        l.event_title.toLowerCase().includes(search.toLowerCase()) ||
        l.ticket_name.toLowerCase().includes(search.toLowerCase()) ||
        (l.event_city || '').toLowerCase().includes(search.toLowerCase())
      )
    : upcoming

  const handleBuy = async (listing, method, phone) => {
    setBusy(true)
    const result = await onBuy(listing, method, phone)
    setBusy(false)
    if (result?.ok || result?.redirect) {
      setBuyingListing(null)
    }
  }

  return (
    <Modal open={open} onClose={() => { setBuyingListing(null); onClose() }} size="lg">
      <ModalHeader
        title="🏪 Marché secondaire"
        subtitle="Billets revendus par d'autres utilisateurs"
      />
      <ModalBody>
        {buyingListing ? (
          <BuyPanel
            listing={buyingListing}
            onConfirm={handleBuy}
            onCancel={() => setBuyingListing(null)}
            busy={busy}
          />
        ) : (
          <>
            <div style={{ marginBottom: 16 }}>
              <input
                style={{ width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 10, padding: '9px 13px', color: 'var(--text)', fontSize: '0.88rem', outline: 'none', boxSizing: 'border-box' }}
                placeholder="Rechercher un événement, un type de billet…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>Chargement…</div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🏪</div>
                <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: 4 }}>
                  {search ? 'Aucune annonce ne correspond.' : 'Aucune annonce active pour le moment.'}
                </p>
                <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>
                  Les billets mis en vente par d'autres utilisateurs apparaîtront ici.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                {filtered.map(l => (
                  <ListingCard
                    key={l.id}
                    listing={l}
                    currentUserId={currentUserId}
                    onBuy={setBuyingListing}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </ModalBody>
    </Modal>
  )
}
