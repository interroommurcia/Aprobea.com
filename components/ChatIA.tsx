'use client'

import { useState, useRef, useEffect } from 'react'

type Msg = { role: 'user' | 'assistant'; content: string }

const SUGERENCIAS = [
  '¿Cuál es el mínimo para invertir en NPL?',
  '¿Cómo funciona el crowdfunding?',
  '¿Qué documentos necesito?',
  '¿Cuánto cuesta la membresía?',
]

export default function ChatIA() {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamText, setStreamText] = useState('')
  const [started, setStarted] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs, streamText])
  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 200) }, [open])

  async function send(text: string) {
    if (!text.trim() || loading) return
    setStarted(true)
    const newMsgs: Msg[] = [...msgs, { role: 'user', content: text }]
    setMsgs(newMsgs)
    setInput('')
    setLoading(true)
    setStreamText('')

    const res = await fetch('/api/ia/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: newMsgs }),
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
              const { text: t } = JSON.parse(line.slice(6))
              if (t) { full += t; setStreamText(s => s + t) }
            } catch {}
          }
        }
      }
    }

    setMsgs(m => [...m, { role: 'assistant', content: full }])
    setStreamText('')
    setLoading(false)
  }

  return (
    <>
      {/* ── BOTÓN FLOTANTE ── */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Asistente IA"
        style={{
          position: 'fixed', bottom: '2rem', right: '2rem', zIndex: 900,
          width: '56px', height: '56px', borderRadius: '50%',
          background: 'linear-gradient(135deg, #C9A043, #a07828)',
          border: 'none', cursor: 'pointer', boxShadow: '0 4px 24px rgba(201,160,67,0.35)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.2s, box-shadow 0.2s',
          fontSize: open ? '20px' : '22px',
          color: '#0a0a0a',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {open ? '✕' : '✦'}
      </button>

      {/* ── VENTANA DE CHAT ── */}
      {open && (
        <div style={{
          position: 'fixed', bottom: '5.5rem', right: '2rem', zIndex: 900,
          width: '360px', maxWidth: 'calc(100vw - 2rem)',
          background: 'var(--bg-1, #0d0f13)',
          border: '0.5px solid rgba(201,160,67,0.25)',
          borderRadius: '16px', boxShadow: '0 8px 48px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          animation: 'iaSlideUp 0.2s ease',
        }}>
          <style>{`@keyframes iaSlideUp { from { opacity:0; transform:translateY(12px) } to { opacity:1; transform:translateY(0) } }`}</style>

          {/* Header */}
          <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid rgba(201,160,67,0.15)', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg,#C9A043,#a07828)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', color: '#0a0a0a', fontWeight: 700, flexShrink: 0 }}>✦</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#f5f0e8' }}>Asistente GrupoSkyLine</div>
              <div style={{ fontSize: '10px', color: '#6dc86d', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#6dc86d', display: 'inline-block' }} />
                Disponible ahora
              </div>
            </div>
          </div>

          {/* Mensajes */}
          <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', minHeight: '280px', maxHeight: '360px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

            {/* Mensaje de bienvenida */}
            {!started && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ maxWidth: '85%', padding: '0.65rem 0.9rem', borderRadius: '12px 12px 12px 2px', fontSize: '13px', lineHeight: 1.6, background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(201,160,67,0.15)', color: '#d4cfc8' }}>
                    Hola, soy el asistente de GrupoSkyLine. ¿En qué puedo ayudarte hoy?
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {SUGERENCIAS.map(s => (
                    <button key={s} onClick={() => send(s)} style={{ fontSize: '11px', padding: '5px 10px', borderRadius: '20px', border: '0.5px solid rgba(201,160,67,0.3)', background: 'rgba(201,160,67,0.06)', color: '#C9A043', cursor: 'pointer', transition: 'background 0.15s' }}
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
                  maxWidth: '85%', padding: '0.65rem 0.9rem', fontSize: '13px', lineHeight: 1.6,
                  borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  background: m.role === 'user' ? 'linear-gradient(135deg,#C9A043,#a07828)' : 'rgba(255,255,255,0.05)',
                  color: m.role === 'user' ? '#0a0a0a' : '#d4cfc8',
                  border: m.role === 'assistant' ? '0.5px solid rgba(201,160,67,0.15)' : 'none',
                  fontWeight: m.role === 'user' ? 500 : 400,
                }}>
                  {m.content}
                </div>
              </div>
            ))}

            {loading && streamText && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ maxWidth: '85%', padding: '0.65rem 0.9rem', borderRadius: '12px 12px 12px 2px', fontSize: '13px', lineHeight: 1.6, background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(201,160,67,0.15)', color: '#d4cfc8' }}>
                  {streamText}<span style={{ opacity: 0.5 }}>▌</span>
                </div>
              </div>
            )}

            {loading && !streamText && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{ padding: '0.65rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(201,160,67,0.15)' }}>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {[0,1,2].map(i => (
                      <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C9A043', opacity: 0.6, animation: `dot 1.2s ${i * 0.2}s infinite`, display: 'inline-block' }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={e => { e.preventDefault(); send(input) }}
            style={{ padding: '0.75rem', borderTop: '0.5px solid rgba(201,160,67,0.15)', display: 'flex', gap: '0.5rem' }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
              placeholder="Escribe tu pregunta…"
              style={{
                flex: 1, background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(201,160,67,0.2)',
                borderRadius: '8px', padding: '8px 12px', fontSize: '13px', color: '#f5f0e8',
                outline: 'none', fontFamily: 'inherit',
              }}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              style={{ background: 'linear-gradient(135deg,#C9A043,#a07828)', border: 'none', color: '#0a0a0a', width: '36px', height: '36px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 700, opacity: (loading || !input.trim()) ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
            >→</button>
          </form>

          <div style={{ padding: '0.5rem 1.25rem', fontSize: '10px', color: 'rgba(255,255,255,0.2)', textAlign: 'center' }}>
            GrupoSkyLine IA · Powered by Claude
          </div>
        </div>
      )}

      <style>{`
        @keyframes dot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.3 }
          40% { transform: scale(1); opacity: 1 }
        }
      `}</style>
    </>
  )
}
