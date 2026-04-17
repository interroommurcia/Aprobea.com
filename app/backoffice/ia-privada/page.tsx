'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

// ── Tipos ───────────────────────────────────────────────────────────────────
type Skill = 'general' | 'analista' | 'comercial'
type Msg   = { role: 'user' | 'assistant'; content: string }
type Thread = { id: number; nombre: string; skill: Skill; messages: Msg[] }

// ── Skills ──────────────────────────────────────────────────────────────────
const SKILLS: Record<Skill, { icon: string; label: string; desc: string; suggestions: string[] }> = {
  general: {
    icon: '🧠', label: 'Estratega',
    desc: 'Asistente ejecutivo · estrategia, comunicaciones, planificación',
    suggestions: [
      '¿Cómo podríamos mejorar la captación de inversores este trimestre?',
      'Redacta un email de bienvenida para nuevos clientes',
      'Resume el estado actual del negocio y próximos pasos',
    ],
  },
  analista: {
    icon: '📊', label: 'Analista',
    desc: 'Inmobiliario y NPL · due diligence, rentabilidad, mercado',
    suggestions: [
      'Explícame cómo valorar una cartera NPL',
      'Calcula la rentabilidad de un activo comprado a 120.000€ con valor de mercado 280.000€',
      '¿Cuáles son los indicadores clave para analizar una oportunidad de crowdfunding?',
    ],
  },
  comercial: {
    icon: '👥', label: 'Comercial',
    desc: 'CRM · emails, scripts, seguimiento, base de clientes',
    suggestions: [
      'Busca en la base de clientes a alguien de Madrid interesado en NPL',
      'Redacta un script de llamada para un inversor que pidió información hace 2 semanas',
      'Dame ideas para reactivar clientes que no han invertido en 6 meses',
    ],
  },
}

const DEFAULT_THREADS: Thread[] = [
  { id: 1, nombre: 'Hilo 1', skill: 'general',   messages: [] },
  { id: 2, nombre: 'Hilo 2', skill: 'analista',  messages: [] },
  { id: 3, nombre: 'Hilo 3', skill: 'comercial', messages: [] },
]

// ── Componente principal ─────────────────────────────────────────────────────
export default function IAPrivadaPage() {
  const [threads, setThreads] = useState<Thread[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_THREADS
    try {
      const saved = localStorage.getItem('admin_ia_threads')
      if (!saved) return DEFAULT_THREADS
      const parsed = JSON.parse(saved)
      // Asegura que mensajes son arrays aunque estuvieran corruptos
      return parsed.map((t: Thread) => ({ ...t, messages: Array.isArray(t.messages) ? t.messages : [] }))
    } catch { return DEFAULT_THREADS }
  })

  const [activeIdx, setActiveIdx]   = useState(0)
  const [input, setInput]           = useState('')
  const [streaming, setStreaming]   = useState(false)
  const [editingName, setEditingName] = useState<number | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const thread = threads[activeIdx]

  // Persistir en localStorage
  useEffect(() => {
    localStorage.setItem('admin_ia_threads', JSON.stringify(threads))
  }, [threads])

  // Scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread.messages])

  const updateThread = useCallback((idx: number, updates: Partial<Thread>) => {
    setThreads(prev => prev.map((t, i) => i === idx ? { ...t, ...updates } : t))
  }, [])

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }, [input])

  async function send(text?: string) {
    const content = (text ?? input).trim()
    if (!content || streaming) return

    const userMsg: Msg = { role: 'user', content }
    const newMessages = [...thread.messages, userMsg]
    updateThread(activeIdx, { messages: newMessages })
    setInput('')
    setStreaming(true)

    // Placeholder mientras llega la respuesta
    updateThread(activeIdx, { messages: [...newMessages, { role: 'assistant', content: '' }] })

    let assistantText = ''

    try {
      const res = await fetch('/api/backoffice/ia-privada', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, skill: thread.skill }),
      })

      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const dec    = new TextDecoder()

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        for (const line of dec.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6)
          if (raw === '[DONE]') break
          try {
            const { text } = JSON.parse(raw)
            assistantText += text
            updateThread(activeIdx, {
              messages: [...newMessages, { role: 'assistant', content: assistantText }],
            })
          } catch {}
        }
      }
    } catch (e: any) {
      assistantText = `⚠️ Error: ${e.message}`
      updateThread(activeIdx, {
        messages: [...newMessages, { role: 'assistant', content: assistantText }],
      })
    }

    setStreaming(false)
  }

  const skill = SKILLS[thread.skill]

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 57px)', overflow: 'hidden' }}>

      {/* ── Sidebar de hilos ─────────────────────────────────────────────── */}
      <aside style={{
        width: '230px', flexShrink: 0,
        borderRight: '0.5px solid var(--gold-border)',
        background: 'var(--bg-1)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
      }}>
        <div style={{ padding: '1.25rem 1rem 0.75rem', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
          IA Privada — Hilos
        </div>

        {threads.map((t, idx) => {
          const s = SKILLS[t.skill]
          const active = idx === activeIdx
          return (
            <div key={t.id}
              onClick={() => { setActiveIdx(idx); setEditingName(null) }}
              style={{
                margin: '0 0.5rem 0.35rem',
                padding: '10px 12px',
                borderRadius: '10px',
                cursor: 'pointer',
                background: active ? 'var(--bg-3)' : 'transparent',
                border: `0.5px solid ${active ? 'var(--gold-border)' : 'transparent'}`,
                transition: 'all 0.15s',
              }}
            >
              {/* Nombre del hilo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '15px', flexShrink: 0 }}>{s.icon}</span>
                {editingName === idx ? (
                  <input
                    autoFocus
                    value={t.nombre}
                    onChange={e => updateThread(idx, { nombre: e.target.value })}
                    onBlur={() => setEditingName(null)}
                    onKeyDown={e => e.key === 'Enter' && setEditingName(null)}
                    onClick={e => e.stopPropagation()}
                    style={{
                      flex: 1, background: 'transparent', border: 'none',
                      borderBottom: '1px solid var(--gold-200)',
                      color: 'var(--text-0)', fontSize: '12px', outline: 'none',
                    }}
                  />
                ) : (
                  <span
                    style={{ fontSize: '12px', fontWeight: 600, color: active ? 'var(--text-0)' : 'var(--text-2)', flex: 1 }}
                    onDoubleClick={e => { e.stopPropagation(); setEditingName(idx) }}
                    title="Doble clic para renombrar"
                  >
                    {t.nombre}
                  </span>
                )}
              </div>

              {/* Skill badge */}
              <div style={{ fontSize: '10px', color: 'var(--gold-200)', marginLeft: '23px' }}>{s.label}</div>

              {/* Controles (solo visible en hilo activo) */}
              {active && (
                <div style={{ marginTop: '10px', marginLeft: '23px', display: 'flex', flexDirection: 'column', gap: '6px' }} onClick={e => e.stopPropagation()}>
                  <select
                    value={t.skill}
                    onChange={e => updateThread(idx, { skill: e.target.value as Skill })}
                    style={{
                      fontSize: '10px', background: 'var(--bg-0)',
                      border: '0.5px solid var(--gold-border)', borderRadius: '6px',
                      color: 'var(--text-2)', padding: '4px 6px', width: '100%', cursor: 'pointer',
                    }}
                  >
                    {(Object.entries(SKILLS) as [Skill, typeof SKILLS[Skill]][]).map(([k, v]) => (
                      <option key={k} value={k}>{v.icon} {v.label}</option>
                    ))}
                  </select>

                  {t.messages.length > 0 && (
                    <button
                      onClick={() => updateThread(idx, { messages: [] })}
                      style={{ fontSize: '9px', color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textAlign: 'left' }}
                    >
                      🗑 Limpiar conversación
                    </button>
                  )}
                  {t.messages.length > 0 && (
                    <div style={{ fontSize: '9px', color: 'var(--text-3)' }}>
                      {Math.floor(t.messages.length / 2)} intercambio{t.messages.length / 2 !== 1 ? 's' : ''}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Separador + enlace a base de clientes */}
        <div style={{ margin: '0.75rem 0.5rem 0', borderTop: '0.5px solid var(--gold-border)', paddingTop: '0.75rem' }}>
          <a href="/backoffice/base-clientes" style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '9px 12px', borderRadius: '10px', textDecoration: 'none',
            color: 'var(--text-2)', fontSize: '12px', transition: 'all 0.15s',
          }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-3)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <span style={{ fontSize: '14px' }}>📁</span>
            Base de clientes
          </a>
        </div>
      </aside>

      {/* ── Área de chat ─────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-0)', minWidth: 0 }}>

        {/* Header */}
        <div style={{
          padding: '1rem 1.5rem',
          borderBottom: '0.5px solid var(--gold-border)',
          background: 'var(--bg-1)',
          display: 'flex', alignItems: 'center', gap: '12px',
        }}>
          <span style={{ fontSize: '24px' }}>{skill.icon}</span>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-0)' }}>
              {thread.nombre} · {skill.label}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '1px' }}>
              {skill.desc}
            </div>
          </div>
        </div>

        {/* Mensajes */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Estado vacío con sugerencias */}
          {thread.messages.length === 0 && (
            <div style={{ margin: 'auto', textAlign: 'center', maxWidth: '420px' }}>
              <div style={{ fontSize: '40px', marginBottom: '1rem' }}>{skill.icon}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--text-0)', marginBottom: '0.35rem' }}>
                {skill.label}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-3)', marginBottom: '2rem' }}>
                {skill.desc}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
                {skill.suggestions.map((s, i) => (
                  <button key={i} onClick={() => send(s)}
                    style={{
                      padding: '10px 14px', borderRadius: '10px', background: 'var(--bg-2)',
                      border: '0.5px solid var(--gold-border)', color: 'var(--text-1)',
                      fontSize: '12px', cursor: 'pointer', textAlign: 'left', lineHeight: 1.5,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--gold-200)')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--gold-border)')}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Burbujas */}
          {thread.messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === 'assistant' && (
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: 'var(--bg-3)', border: '0.5px solid var(--gold-border)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', marginRight: '8px', flexShrink: 0, alignSelf: 'flex-end',
                }}>
                  {skill.icon}
                </div>
              )}
              <div style={{
                maxWidth: '72%', padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg,#C9A043,#a07828)'
                  : 'var(--bg-2)',
                color: msg.role === 'user' ? '#0a0a0a' : 'var(--text-0)',
                fontSize: '13px', lineHeight: 1.65,
                border: msg.role === 'assistant' ? '0.5px solid var(--gold-border)' : 'none',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {msg.content || (
                  <span style={{ opacity: 0.4 }}>
                    <span style={{ animation: 'pulse 1s infinite' }}>●</span>
                    <span style={{ animation: 'pulse 1s 0.2s infinite', marginLeft: '3px' }}>●</span>
                    <span style={{ animation: 'pulse 1s 0.4s infinite', marginLeft: '3px' }}>●</span>
                  </span>
                )}
              </div>
            </div>
          ))}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '1rem 1.5rem', borderTop: '0.5px solid var(--gold-border)', background: 'var(--bg-1)' }}>
          <div style={{
            display: 'flex', gap: '10px', alignItems: 'flex-end',
            background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)',
            borderRadius: '14px', padding: '10px 14px',
          }}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
              }}
              placeholder={`Mensaje para ${skill.label}… (Enter para enviar, Shift+Enter para salto de línea)`}
              disabled={streaming}
              rows={1}
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--text-0)', fontSize: '13px', resize: 'none',
                lineHeight: 1.55, maxHeight: '120px', fontFamily: 'inherit',
              }}
            />
            <button
              onClick={() => send()}
              disabled={streaming || !input.trim()}
              style={{
                background: (streaming || !input.trim()) ? 'var(--bg-3)' : 'linear-gradient(135deg,#C9A043,#a07828)',
                border: 'none', borderRadius: '9px',
                padding: '7px 16px', color: '#0a0a0a',
                fontSize: '13px', fontWeight: 700, cursor: streaming ? 'wait' : 'pointer',
                flexShrink: 0, transition: 'all 0.2s',
                opacity: (streaming || !input.trim()) ? 0.6 : 1,
              }}
            >
              {streaming ? '⏳' : '→'}
            </button>
          </div>
          <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '6px', textAlign: 'right' }}>
            {skill.label === 'Comercial' ? '💡 Puedes pedir buscar contactos en la base de clientes' : ''}
          </div>
        </div>
      </div>
    </div>
  )
}
