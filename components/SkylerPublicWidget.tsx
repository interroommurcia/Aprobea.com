'use client'

import { useState, useRef, useEffect } from 'react'

type Msg = { role: 'user' | 'assistant'; content: string }

const SUGERENCIAS = [
  '¿Qué es un crédito NPL?',
  '¿Cuánto puedo ganar?',
  '¿Cómo funciona el crowdfunding?',
  '¿Desde cuánto puedo invertir?',
]

export default function SkylerPublicWidget() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [stream, setStream] = useState('')
  const [pulse, setPulse] = useState(true)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, stream])
  useEffect(() => { if (open) setPulse(false) }, [open])

  async function send(text: string) {
    if (!text.trim() || loading) return
    const newMsgs: Msg[] = [...msgs, { role: 'user', content: text }]
    setMsgs(newMsgs)
    setInput('')
    setLoading(true)
    setStream('')

    try {
      const res = await fetch('/api/ia/skyller-public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMsgs.map(m => ({ role: m.role, content: m.content })) }),
      })

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      let full = ''

      if (reader) {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          for (const line of decoder.decode(value).split('\n')) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const parsed = JSON.parse(line.slice(6))
                if (parsed.text) { full += parsed.text; setStream(s => s + parsed.text) }
              } catch {}
            }
          }
        }
      }
      setMsgs(m => [...m, { role: 'assistant', content: full || '¿En qué más puedo ayudarte?' }])
    } catch {
      setMsgs(m => [...m, { role: 'assistant', content: '⚠️ Error de conexión. Inténtalo de nuevo.' }])
    }

    setStream('')
    setLoading(false)
  }

  return (
    <div style={{ position: 'fixed', bottom: '1.75rem', right: '1.75rem', zIndex: 999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>

      {/* Ventana de chat */}
      {open && (
        <div style={{
          width: '340px',
          height: '520px',
          background: '#0e0e0e',
          border: '0.5px solid rgba(201,160,67,0.45)',
          borderRadius: '20px',
          boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'skylerIn 0.22s cubic-bezier(0.16,1,0.3,1)',
        }}>
          <style>{`
            @keyframes skylerIn {
              from { opacity: 0; transform: scale(0.92) translateY(16px); }
              to   { opacity: 1; transform: scale(1) translateY(0); }
            }
            @keyframes skydotP {
              0%,80%,100% { transform: scale(0.6); opacity: 0.3; }
              40% { transform: scale(1); opacity: 1; }
            }
          `}</style>

          {/* Header */}
          <div style={{ padding: '14px 16px', background: 'linear-gradient(135deg, rgba(201,160,67,0.15) 0%, rgba(201,160,67,0.05) 100%)', borderBottom: '0.5px solid rgba(201,160,67,0.2)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
            <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg,#C9A043,#7a5c1e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', flexShrink: 0, boxShadow: '0 2px 12px rgba(201,160,67,0.4)' }}>S</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#C9A043', letterSpacing: '0.06em' }}>SKYLLER</div>
              <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.45)', marginTop: '1px' }}>GrupoSkyLine Investment</div>
            </div>
            <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '18px', lineHeight: 1, padding: '2px 4px' }}>×</button>
          </div>

          {/* Mensajes */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '8px' }}>

            {/* Bienvenida */}
            {msgs.length === 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '10px' }}>
                  <div style={{ maxWidth: '92%', padding: '10px 13px', borderRadius: '14px 14px 14px 2px', fontSize: '12.5px', lineHeight: 1.65, background: '#1a1a1a', border: '0.5px solid rgba(201,160,67,0.2)', color: '#e8e8e8' }}>
                    👋 Hola, soy <strong style={{ color: '#C9A043' }}>SKYLLER</strong>. Te ayudo a conocer cómo invertir con GrupoSkyLine. ¿Qué te gustaría saber?
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                  {SUGERENCIAS.map(s => (
                    <button key={s} onClick={() => send(s)}
                      style={{ fontSize: '10.5px', padding: '4px 10px', borderRadius: '20px', border: '0.5px solid rgba(201,160,67,0.3)', background: 'rgba(201,160,67,0.06)', color: '#C9A043', cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,160,67,0.14)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'rgba(201,160,67,0.06)')}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {msgs.map((m, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <div style={{
                  maxWidth: '85%', padding: '9px 12px', fontSize: '12.5px', lineHeight: 1.65,
                  borderRadius: m.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                  background: m.role === 'user' ? 'linear-gradient(135deg,#C9A043,#a07828)' : '#1a1a1a',
                  color: m.role === 'user' ? '#0a0a0a' : '#e8e8e8',
                  border: m.role === 'assistant' ? '0.5px solid rgba(201,160,67,0.2)' : 'none',
                  fontWeight: m.role === 'user' ? 500 : 400,
                  whiteSpace: 'pre-wrap',
                }}>
                  {m.content}
                </div>
              </div>
            ))}

            {/* Streaming */}
            {loading && stream && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ maxWidth: '85%', padding: '9px 12px', borderRadius: '14px 14px 14px 2px', fontSize: '12.5px', lineHeight: 1.65, background: '#1a1a1a', border: '0.5px solid rgba(201,160,67,0.2)', color: '#e8e8e8', whiteSpace: 'pre-wrap' }}>
                  {stream}<span style={{ opacity: 0.4 }}>▌</span>
                </div>
              </div>
            )}

            {/* Typing dots */}
            {loading && !stream && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '10px 14px', borderRadius: '14px', background: '#1a1a1a', border: '0.5px solid rgba(201,160,67,0.2)', display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#C9A043', display: 'inline-block', animation: `skydotP 1.2s ${i * 0.2}s infinite` }} />
                  ))}
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Input */}
          <form onSubmit={e => { e.preventDefault(); send(input) }} style={{ padding: '10px', borderTop: '0.5px solid rgba(201,160,67,0.2)', display: 'flex', gap: '7px', flexShrink: 0 }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              placeholder="Escribe tu pregunta…"
              style={{ flex: 1, background: '#1a1a1a', border: '0.5px solid rgba(201,160,67,0.25)', borderRadius: '10px', padding: '8px 12px', fontSize: '12.5px', color: '#e8e8e8', outline: 'none', fontFamily: 'inherit' }}
            />
            <button type="submit" disabled={loading || !input.trim()}
              style={{ width: '36px', height: '36px', borderRadius: '10px', background: loading || !input.trim() ? '#2a2a2a' : 'linear-gradient(135deg,#C9A043,#a07828)', border: 'none', color: loading || !input.trim() ? '#555' : '#0a0a0a', fontSize: '15px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}>→</button>
          </form>
        </div>
      )}

      {/* Botón flotante */}
      <button
        onClick={() => setOpen(v => !v)}
        title="SKYLLER · Asistente virtual GrupoSkyLine"
        style={{
          width: '54px', height: '54px', borderRadius: '50%',
          background: open ? 'linear-gradient(135deg,#a07828,#7a5c1e)' : 'linear-gradient(135deg,#C9A043,#a07828)',
          border: '2px solid rgba(201,160,67,0.5)',
          boxShadow: '0 4px 24px rgba(201,160,67,0.4)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'all 0.2s',
          position: 'relative',
        }}
        onMouseEnter={e => { (e.currentTarget.style.transform = 'scale(1.08)') }}
        onMouseLeave={e => { (e.currentTarget.style.transform = 'scale(1)') }}
      >
        <span style={{ fontSize: '22px', fontWeight: 800, color: '#fff', letterSpacing: '-0.5px', lineHeight: 1 }}>
          {open ? '×' : 'S'}
        </span>

        {pulse && !open && (
          <>
            <span style={{ position: 'absolute', inset: '-4px', borderRadius: '50%', border: '2px solid rgba(201,160,67,0.4)', animation: 'skyPulseP 2s ease-out infinite' }} />
            <style>{`@keyframes skyPulseP { 0%{transform:scale(1);opacity:1} 100%{transform:scale(1.6);opacity:0} }`}</style>
          </>
        )}
      </button>
    </div>
  )
}
