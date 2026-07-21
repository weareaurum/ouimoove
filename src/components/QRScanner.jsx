import { useEffect, useRef, useState, useCallback } from 'react'
import jsQR from 'jsqr'

// Scans camera feed for QR codes, calls onScan(data) once per unique code
export function QRScanner({ onScan, onClose }) {
  const videoRef  = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef    = useRef(null)
  const lastRef   = useRef('')
  const [error, setError] = useState('')
  const [lit,   setLit]   = useState(false)

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        scanLoop()
      }
    } catch {
      setError('Impossible d\'accéder à la caméra. Vérifiez les permissions.')
    }
  }, [])

  const scanLoop = useCallback(() => {
    const video  = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    if (video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanLoop)
      return
    }
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: 'dontInvert' })
    if (code && code.data && code.data !== lastRef.current) {
      lastRef.current = code.data
      setLit(true)
      setTimeout(() => setLit(false), 600)
      onScan(code.data)
    }
    rafRef.current = requestAnimationFrame(scanLoop)
  }, [onScan])

  useEffect(() => {
    startCamera()
    return () => {
      cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#000',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '16px 20px',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        zIndex: 2,
      }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff' }}>
            <span style={{ color: '#fff' }}>Oui</span><span style={{ color: '#f49a0e' }}>Moove</span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 400, fontSize: '0.8rem', marginLeft: 10 }}>Scan billet</span>
          </div>
        </div>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.12)', border: 'none', color: '#fff',
          borderRadius: 10, padding: '8px 16px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
        }}>
          ✕ Fermer
        </button>
      </div>

      {/* Camera feed */}
      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted playsInline />
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* Scan frame overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,0.45)',
        }}>
          <div style={{ position: 'relative', width: 260, height: 260 }}>
            {/* Dimmed surround — cut out the middle */}
            {/* Corner brackets */}
            {[
              { top: 0,   left: 0,   borderTop: true,    borderLeft: true  },
              { top: 0,   right: 0,  borderTop: true,    borderRight: true },
              { bottom: 0, left: 0,  borderBottom: true, borderLeft: true  },
              { bottom: 0, right: 0, borderBottom: true, borderRight: true },
            ].map((c, i) => (
              <div key={i} style={{
                position: 'absolute',
                width: 36, height: 36,
                ...c,
                borderWidth: 3,
                borderStyle: 'solid',
                borderColor: lit ? '#22c55e' : '#8b2276',
                borderRadius: 4,
                transition: 'border-color 0.2s',
                // only show the relevant sides
                borderTop:    c.borderTop    ? `3px solid ${lit ? '#22c55e' : '#8b2276'}` : 'none',
                borderLeft:   c.borderLeft   ? `3px solid ${lit ? '#22c55e' : '#8b2276'}` : 'none',
                borderRight:  c.borderRight  ? `3px solid ${lit ? '#22c55e' : '#8b2276'}` : 'none',
                borderBottom: c.borderBottom ? `3px solid ${lit ? '#22c55e' : '#8b2276'}` : 'none',
              }} />
            ))}

            {/* Scan line animation */}
            {!lit && (
              <div style={{
                position: 'absolute', left: 0, right: 0, height: 2,
                background: 'linear-gradient(90deg, transparent, #8b2276, transparent)',
                animation: 'scanline 1.8s ease-in-out infinite',
              }} />
            )}

            {lit && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'rgba(34,197,94,0.15)',
                borderRadius: 4,
              }} />
            )}
          </div>
        </div>

        {error && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center', padding: 32,
          }}>
            <div style={{
              background: 'rgba(239,68,68,0.9)', borderRadius: 16,
              padding: '20px 24px', color: '#fff', textAlign: 'center', fontSize: '0.9rem',
            }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>📷</div>
              {error}
            </div>
          </div>
        )}
      </div>

      {/* Hint */}
      <div style={{
        padding: '16px 24px', textAlign: 'center',
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
        color: 'rgba(255,255,255,0.6)', fontSize: '0.82rem',
      }}>
        Pointez la caméra vers le QR code du billet
      </div>

      <style>{`
        @keyframes scanline {
          0%   { top: 0%; }
          50%  { top: calc(100% - 2px); }
          100% { top: 0%; }
        }
      `}</style>
    </div>
  )
}
