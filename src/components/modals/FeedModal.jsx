import { useState, useEffect, useRef } from 'react'
import { Modal, ModalHeader, ModalBody } from '../Modal.jsx'

const MAX_FILE_MB = 50

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diffMs / 60000)
  if (min < 1)   return "à l'instant"
  if (min < 60)  return `il y a ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24)    return `il y a ${h} h`
  const d = Math.floor(h / 24)
  if (d < 7)     return `il y a ${d} j`
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Post creation form ──────────────────────────────────────────
function PostForm({ events, onSubmit, onCancel, toast }) {
  const [eventId, setEventId] = useState('')
  const [file,    setFile]    = useState(null)
  const [preview, setPreview] = useState(null)
  const [caption, setCaption] = useState('')
  const [busy,    setBusy]    = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const pickFile = (f) => {
    if (!f) return
    if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) {
      toast('Choisissez une photo ou une vidéo.', 'error'); return
    }
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      toast(`Fichier trop volumineux (max ${MAX_FILE_MB} Mo).`, 'error'); return
    }
    setFile(f)
  }

  const submit = async () => {
    if (!eventId) { toast('Choisissez un événement.', 'error'); return }
    if (!file)    { toast('Ajoutez une photo ou une vidéo.', 'error'); return }
    setBusy(true)
    const res = await onSubmit({ eventId, file, caption })
    setBusy(false)
    if (res?.ok) {
      setFile(null); setCaption(''); setEventId('')
      onCancel()
    } else {
      toast(res?.error || 'Impossible de publier ce moment.', 'error')
    }
  }

  const inputStyle = {
    width: '100%', background: 'var(--bg3)', border: '1px solid var(--border)',
    borderRadius: 10, padding: '9px 13px', color: 'var(--text)', fontSize: '0.88rem',
    outline: 'none', boxSizing: 'border-box', fontFamily: 'var(--font-body)',
  }

  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 14, padding: 16, marginBottom: 20 }}>
      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 6 }}>Événement *</label>
        <select style={inputStyle} value={eventId} onChange={e => setEventId(e.target.value)}>
          <option value="">Sélectionnez un événement…</option>
          {events.map(e => (
            <option key={e.id} value={e.id}>{e.title}{e.city ? ` — ${e.city}` : ''}</option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: 12 }}>
        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 6 }}>Photo ou vidéo *</label>
        <input
          ref={inputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }}
          onChange={e => pickFile(e.target.files?.[0])}
        />
        {preview ? (
          <div style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', background: '#000' }}>
            {file.type.startsWith('video/') ? (
              <video src={preview} style={{ width: '100%', maxHeight: 260, display: 'block' }} controls />
            ) : (
              <img src={preview} alt="" style={{ width: '100%', maxHeight: 260, objectFit: 'contain', display: 'block' }} />
            )}
            <button onClick={() => setFile(null)} style={{
              position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%',
              background: 'rgba(0,0,0,.6)', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '0.9rem',
            }}>✕</button>
          </div>
        ) : (
          <button onClick={() => inputRef.current?.click()} style={{
            width: '100%', padding: '20px 0', borderRadius: 10, border: '1.5px dashed var(--border)',
            background: 'var(--bg2)', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.85rem',
          }}>
            📷 Choisir une photo ou une vidéo
          </button>
        )}
      </div>

      <div style={{ marginBottom: 14 }}>
        <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--muted)', marginBottom: 6 }}>Légende (optionnel)</label>
        <input style={inputStyle} placeholder="L'ambiance est incroyable ici ! 🔥"
          value={caption} onChange={e => setCaption(e.target.value)} maxLength={200} />
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={onCancel} disabled={busy} style={{
          flex: 1, background: 'transparent', border: '1px solid var(--border)', color: 'var(--muted)',
          borderRadius: 10, padding: '10px 0', fontSize: '0.88rem', cursor: 'pointer',
        }}>Annuler</button>
        <button onClick={submit} disabled={busy} style={{
          flex: 2, background: 'linear-gradient(135deg, var(--orange), var(--orange2))', color: '#fff',
          border: 'none', borderRadius: 10, padding: '10px 0', fontSize: '0.88rem', fontWeight: 700,
          cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1,
        }}>{busy ? 'Publication…' : 'Publier'}</button>
      </div>
    </div>
  )
}

// ── Single post card ─────────────────────────────────────────────
function PostCard({ post, currentUserId, onDelete }) {
  const isOwn = post.userId === currentUserId
  return (
    <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px 8px' }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>{post.userName}</div>
          <div style={{ fontSize: '0.76rem', color: 'var(--muted)', marginTop: 1 }}>{timeAgo(post.createdAt)}</div>
        </div>
        {isOwn && (
          <button onClick={() => onDelete(post.id)} title="Supprimer" style={{
            background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.95rem', padding: 4,
          }}>🗑️</button>
        )}
      </div>

      <div style={{ background: '#000' }}>
        {post.mediaType === 'video' ? (
          <video src={post.mediaUrl} style={{ width: '100%', maxHeight: 420, display: 'block' }} controls />
        ) : (
          <img src={post.mediaUrl} alt="" style={{ width: '100%', maxHeight: 420, objectFit: 'cover', display: 'block' }} />
        )}
      </div>

      <div style={{ padding: '10px 14px 14px' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(142,45,110,.1)', border: '1px solid rgba(142,45,110,.25)', borderRadius: 99, padding: '3px 10px', fontSize: '0.76rem', color: 'var(--purple3)', fontWeight: 600, marginBottom: 8 }}>
          <span>{post.eventEmoji}</span>
          <span>{post.eventTitle}</span>
          {post.eventVenue && <span style={{ opacity: 0.7 }}>· {post.eventVenue}</span>}
        </div>
        {post.caption && (
          <p style={{ fontSize: '0.86rem', color: 'var(--text)', lineHeight: 1.5, margin: 0 }}>{post.caption}</p>
        )}
      </div>
    </div>
  )
}

// ── Main modal ────────────────────────────────────────────────────
export function FeedModal({ open, posts, events, loading, currentUserId, onClose, onCreate, onDelete, toast }) {
  const [showForm, setShowForm] = useState(false)

  const postableEvents = events.filter(e => e.status !== 'draft')

  return (
    <Modal open={open} onClose={() => { setShowForm(false); onClose() }} size="lg">
      <ModalHeader title="📸 Feed" subtitle="Les moments partagés par la communauté" />
      <ModalBody>
        {!showForm && (
          <button onClick={() => setShowForm(true)} style={{
            width: '100%', marginBottom: 20, padding: '12px 0', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, var(--purple), var(--purple2))', color: '#fff',
            fontWeight: 700, fontSize: '0.92rem', cursor: 'pointer',
          }}>
            ✨ Partager un moment
          </button>
        )}

        {showForm && (
          <PostForm
            events={postableEvents}
            onSubmit={onCreate}
            onCancel={() => setShowForm(false)}
            toast={toast}
          />
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)' }}>Chargement…</div>
        ) : posts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>📸</div>
            <p style={{ color: 'var(--muted)', fontSize: '0.9rem', marginBottom: 4 }}>Aucun moment partagé pour l'instant.</p>
            <p style={{ color: 'var(--muted)', fontSize: '0.8rem' }}>Soyez le premier à montrer l'ambiance d'un événement !</p>
          </div>
        ) : (
          posts.map(post => (
            <PostCard key={post.id} post={post} currentUserId={currentUserId} onDelete={onDelete} />
          ))
        )}
      </ModalBody>
    </Modal>
  )
}
