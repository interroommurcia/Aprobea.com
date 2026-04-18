'use client'
import { useState, useRef, useEffect } from 'react'
import type { MarketplaceOp } from './MarketplaceCard'
import TicketProgress from './TicketProgress'

const TIPO_COLORS: Record<string, string> = { npl: '#b87333', crowdfunding: '#C9A043' }

function eur(n: number | null | undefined) {
  if (n == null) return '—'
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })
}

type Msg = { role: 'user' | 'assistant'; content: string }

export default function AssetDetailModal({
  op, onClose, onVerPDF, userEmail, userId, authToken,
}: {
  op: MarketplaceOp
  onClose: () => void
  onVerPDF?: () => void
  userEmail?: string
  userId?: string
  authToken?: string
}) {
  const [chatOpen, setChatOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [showContact, setShowContact] = useState(false)
  const [contactPhone, setContactPhone] = useState('')
  const [contactMsg, setContactMsg] = useState(`Consulta sobre: ${op.titulo}`)
  const [contactSending, setContactSending] = useState(false)
  const [contactSent, setContactSent] = useState(false)
  const [reservando, setReservando] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  const libre = Math.max((op.tickets_total ?? 0) - (op.tickets_vendidos ?? 0), 0)
  const isFull = op.tickets_total > 0 && libre === 0
  const isFinalizada = op.estado_operacion === 'finalizada'

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Bloquear scroll del body mientras el modal está abierto
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  async function sendMessage() {
    if (!input.trim() || loading) return
    const userMsg: Msg = { role: 'user', content: input.trim() }
    const newMsgs = [...messages, userMsg]
    setMessages(newMsgs)
    setInput('')
    setLoading(true)

    try {
      const resp = await fetch('/api/ia/activo-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({ messages: newMsgs, operacion_id: op.id }),
      })
      if (!resp.body) throw new Error('No stream')

      const reader = resp.body.getReader()
      const decoder = new TextDecoder()
      let assistantText = ''
      setMessages(prev => [...prev, { role: 'assistant', content: '' }])

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue
          const d = line.slice(6)
          if (d === '[DONE]') break
          try {
            const { text } = JSON.parse(d)
            assistantText += text
            setMessages(prev => {
              const copy = [...prev]
              copy[copy.length - 1] = { role: 'assistant', content: assistantText }
              return copy
            })
          } catch { /* ignore */ }
        }
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '⚠️ Error al conectar con el asistente.' }])
    } finally {
      setLoading(false)
    }
  }

  async function handleContactar() {
    if (!contactPhone.trim()) return
    setContactSending(true)
    try {
      await fetch('/api/ia/activo-contacto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          operacion_id: op.id,
          operacion_titulo: op.titulo,
          telefono: contactPhone,
          mensaje: contactMsg,
        }),
      })
      setContactSent(true)
    } catch { /* ignore */ } finally {
      setContactSending(false)
    }
  }

  async function handleReservar(e: React.MouseEvent) {
    e.stopPropagation()
    setReservando(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ operacion_id: op.id, tipo: op.tipo, user_id: userId, email: userEmail }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
    } finally {
      setReservando(false)
    }
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.82)',
        backdropFilter: 'blur(8px)',
        zIndex: 3000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--bg-1)',
          border: '0.5px solid var(--gold-border)',
          borderRadius: '20px',
          width: '100%',
          maxWidth: chatOpen ? '1000px' : '680px',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          transition: 'max-width 0.3s ease',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '1rem 1.375rem',
          borderBottom: '0.5px solid rgba(255,255,255,0.06)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
            <span style={{
              padding: '3px 9px', borderRadius: '99px', flexShrink: 0,
              fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
              color: TIPO_COLORS[op.tipo] ?? '#C9A043',
              background: `${TIPO_COLORS[op.tipo] ?? '#C9A043'}22`,
              border: `0.5px solid ${TIPO_COLORS[op.tipo] ?? '#C9A043'}`,
            }}>
              {op.tipo}
            </span>
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {op.titulo}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: '22px', lineHeight: 1, padding: '2px 6px', flexShrink: 0 }}
          >×</button>
        </div>

        {/* ── Body ── */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* Left: ficha técnica */}
          <div style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>

            {/* Imagen */}
            {op.imagen_principal ? (
              <div style={{ height: '220px', overflow: 'hidden', flexShrink: 0 }}>
                <img src={op.imagen_principal} alt={op.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            ) : (
              <div style={{ height: '140px', background: 'var(--bg-0)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
                <span style={{ fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Sin imagen</span>
              </div>
            )}

            <div style={{ padding: '1.375rem' }}>

              {/* Ubicación */}
              {(op.municipio || op.provincia) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.625rem' }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--gold-200)" strokeWidth="2.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    {[op.municipio, op.provincia].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}

              {/* Ref catastral con enlace */}
              {op.referencia_catastral && (
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '1rem', fontFamily: 'monospace' }}>
                  RC: <span style={{ color: 'var(--gold-200)' }}>{op.referencia_catastral}</span>
                  {'  '}
                  <a
                    href={`https://www1.sedecatastro.gob.es/CYCBienInmueble/OVCListaBienes.aspx?rc1=${op.referencia_catastral.slice(0,7)}&rc2=${op.referencia_catastral.slice(7,14)}`}
                    target="_blank" rel="noopener noreferrer"
                    style={{ color: 'var(--gold-200)', textDecoration: 'none', fontSize: '10px' }}
                  >↗ Catastro</a>
                </div>
              )}

              {/* Grid financiero */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.125rem', padding: '1rem', background: 'var(--bg-0)', borderRadius: '12px', border: '0.5px solid rgba(255,255,255,0.05)' }}>
                {op.valor_mercado != null && (
                  <div>
                    <div style={{ fontSize: '8px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Valor mercado</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-0)' }}>{eur(op.valor_mercado)}</div>
                  </div>
                )}
                {op.precio_compra != null && (
                  <div>
                    <div style={{ fontSize: '8px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Precio compra</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-0)' }}>{eur(op.precio_compra)}</div>
                  </div>
                )}
                {op.rentabilidad != null && (
                  <div>
                    <div style={{ fontSize: '8px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Rentabilidad</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#6dc86d' }}>{op.rentabilidad.toFixed(2)}%</div>
                  </div>
                )}
                {op.comision != null && (
                  <div>
                    <div style={{ fontSize: '8px', color: 'var(--gold-200)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Comisión</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--gold-100)' }}>{eur(op.comision)}</div>
                  </div>
                )}
                {op.ticket_minimo != null && (
                  <div>
                    <div style={{ fontSize: '8px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Ticket mínimo</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-0)' }}>{eur(op.ticket_minimo)}</div>
                  </div>
                )}
                {op.superficie != null && (
                  <div>
                    <div style={{ fontSize: '8px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Superficie</div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-0)' }}>{op.superficie.toFixed(0)} m²</div>
                  </div>
                )}
              </div>

              {/* Tickets */}
              {op.tickets_total > 0 && (
                <div style={{ marginBottom: '1.125rem', padding: '0.875rem 1rem', background: 'var(--bg-0)', borderRadius: '10px', border: '0.5px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>Inversores</span>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: isFull ? '#ee0055' : 'var(--text-0)' }}>
                      {op.tickets_vendidos ?? 0} / {op.tickets_total}
                    </span>
                  </div>
                  <TicketProgress total={op.tickets_total} vendidos={op.tickets_vendidos ?? 0} tipo={op.tipo} size="sm" showLabel={false} animate />
                </div>
              )}

              {/* Fase hipotecaria */}
              {op.fase_hipotecaria && (
                <div style={{ marginBottom: '1.125rem', padding: '0.75rem 1rem', background: 'rgba(201,160,67,0.05)', borderRadius: '10px', border: '0.5px solid rgba(201,160,67,0.2)' }}>
                  <div style={{ fontSize: '8px', color: 'var(--gold-200)', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '4px' }}>Fase de ejecución hipotecaria</div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-1)', lineHeight: 1.5 }}>{op.fase_hipotecaria}</div>
                </div>
              )}

              {/* Tags */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '1.125rem' }}>
                {op.publico && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: '99px', fontSize: '9px', fontWeight: 600, color: '#6dc86d', border: '0.5px solid rgba(109,200,109,0.35)', background: 'rgba(109,200,109,0.08)' }}>
                    🌐 Público
                  </span>
                )}
                {op.tipo_propiedad && (
                  <span style={{ padding: '3px 9px', borderRadius: '99px', fontSize: '9px', color: 'var(--text-2)', border: '0.5px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
                    {op.tipo_propiedad}
                  </span>
                )}
              </div>

              {/* Descripción */}
              {op.descripcion && (
                <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: '1.25rem' }}>
                  {op.descripcion}
                </p>
              )}

              {/* CTAs */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <button
                  onClick={handleReservar}
                  disabled={reservando || isFull || !op.activa || isFinalizada}
                  style={{
                    width: '100%', padding: '14px',
                    background: isFull || !op.activa || isFinalizada
                      ? 'rgba(255,255,255,0.05)'
                      : 'linear-gradient(135deg, var(--gold-300), var(--gold-200), var(--gold-100))',
                    color: isFull || !op.activa || isFinalizada ? 'var(--text-3)' : 'var(--bg-0)',
                    border: isFull || !op.activa || isFinalizada ? '0.5px solid rgba(255,255,255,0.1)' : 'none',
                    borderRadius: '12px', fontSize: '12px', fontWeight: 700,
                    letterSpacing: '0.12em', textTransform: 'uppercase',
                    cursor: isFull || !op.activa || isFinalizada ? 'not-allowed' : 'pointer',
                    boxShadow: isFull || !op.activa || isFinalizada ? 'none' : '0 4px 16px rgba(201,160,67,0.25)',
                  }}
                >
                  {reservando ? '⏳ Redirigiendo…' : isFinalizada ? 'Operación finalizada' : isFull ? 'Plazas completas' : !op.activa ? 'No disponible' : 'Reservar ticket →'}
                </button>

                <div style={{ display: 'grid', gridTemplateColumns: op.pdf_url ? '1fr 1fr' : '1fr', gap: '8px' }}>
                  <button
                    onClick={() => { setChatOpen(true) }}
                    style={{
                      padding: '11px', background: 'rgba(201,160,67,0.07)',
                      color: 'var(--gold-200)', border: '0.5px solid rgba(201,160,67,0.35)',
                      borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                      letterSpacing: '0.06em', cursor: 'pointer',
                    }}
                  >
                    💬 Consultar dudas del activo
                  </button>
                  {op.pdf_url && (
                    <button
                      onClick={() => { onVerPDF?.() }}
                      style={{
                        padding: '11px', background: 'transparent',
                        color: 'var(--text-2)', border: '0.5px solid rgba(255,255,255,0.1)',
                        borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                        letterSpacing: '0.06em', cursor: 'pointer',
                      }}
                    >
                      📄 Ver informe PDF ↗
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right: Chat panel */}
          {chatOpen && (
            <div style={{
              width: '360px', flexShrink: 0,
              borderLeft: '0.5px solid rgba(255,255,255,0.06)',
              display: 'flex', flexDirection: 'column',
              background: 'var(--bg-0)',
            }}>
              {/* Chat header */}
              <div style={{ padding: '0.875rem 1rem', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
                <div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-0)' }}>💬 Skyller — Asistente del activo</div>
                  <div style={{ fontSize: '9px', color: 'var(--text-3)', marginTop: '2px' }}>Pregunta sobre esta operación</div>
                </div>
                <button onClick={() => setChatOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '18px', lineHeight: 1 }}>×</button>
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: 'auto', padding: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                {messages.length === 0 && (
                  <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '0.82rem', padding: '1.5rem 0.5rem' }}>
                    <div style={{ fontSize: '1.75rem', marginBottom: '0.5rem' }}>🤖</div>
                    <p style={{ lineHeight: 1.5 }}>Hola, soy Skyller. Conozco todos los detalles de esta operación. ¿Qué quieres saber?</p>
                  </div>
                )}
                {messages.map((m, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      maxWidth: '86%', padding: '9px 13px',
                      borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      background: m.role === 'user' ? 'var(--gold-300)' : 'var(--bg-2)',
                      color: m.role === 'user' ? 'var(--bg-0)' : 'var(--text-1)',
                      fontSize: '0.8rem', lineHeight: 1.55, whiteSpace: 'pre-wrap',
                    }}>
                      {m.content || (loading && i === messages.length - 1 ? (
                        <span style={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }}>
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-3)', animation: 'pulse 1.2s infinite' }} />
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-3)', animation: 'pulse 1.2s 0.4s infinite' }} />
                          <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--text-3)', animation: 'pulse 1.2s 0.8s infinite' }} />
                        </span>
                      ) : '')}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Botón contacto directo */}
              {!showContact && !contactSent && (
                <div style={{ padding: '0 0.875rem 0.5rem' }}>
                  <button
                    onClick={() => setShowContact(true)}
                    style={{
                      width: '100%', padding: '8px',
                      background: 'transparent', color: 'var(--text-3)',
                      border: '0.5px solid rgba(255,255,255,0.07)',
                      borderRadius: '8px', fontSize: '10px', cursor: 'pointer',
                      letterSpacing: '0.04em',
                    }}
                  >
                    Contacta directamente al equipo →
                  </button>
                </div>
              )}

              {/* Formulario de contacto */}
              {showContact && !contactSent && (
                <div style={{ padding: '0.875rem', borderTop: '0.5px solid rgba(255,255,255,0.06)', background: 'var(--bg-1)', flexShrink: 0 }}>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-0)', marginBottom: '0.5rem' }}>Contacto directo con el equipo</div>
                  <input
                    type="tel"
                    placeholder="📱 Número de móvil *"
                    value={contactPhone}
                    onChange={e => setContactPhone(e.target.value)}
                    style={{ width: '100%', background: 'var(--bg-0)', border: '0.5px solid var(--gold-border)', color: 'var(--text-0)', padding: '8px 10px', borderRadius: '8px', fontSize: '12px', marginBottom: '6px', boxSizing: 'border-box' }}
                  />
                  <textarea
                    value={contactMsg}
                    onChange={e => setContactMsg(e.target.value)}
                    rows={2}
                    style={{ width: '100%', background: 'var(--bg-0)', border: '0.5px solid var(--gold-border)', color: 'var(--text-0)', padding: '8px 10px', borderRadius: '8px', fontSize: '12px', marginBottom: '6px', resize: 'none', boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button onClick={() => setShowContact(false)} style={{ flex: 1, padding: '8px', background: 'transparent', color: 'var(--text-3)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '11px', cursor: 'pointer' }}>
                      Cancelar
                    </button>
                    <button
                      onClick={handleContactar}
                      disabled={!contactPhone.trim() || contactSending}
                      style={{ flex: 2, padding: '8px', background: 'var(--gold-200)', color: 'var(--bg-0)', border: 'none', borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', opacity: !contactPhone.trim() || contactSending ? 0.6 : 1 }}
                    >
                      {contactSending ? 'Enviando…' : 'Enviar solicitud'}
                    </button>
                  </div>
                </div>
              )}

              {contactSent && (
                <div style={{ padding: '0.875rem', textAlign: 'center', background: 'rgba(109,200,109,0.07)', borderTop: '0.5px solid rgba(109,200,109,0.2)', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.82rem', color: '#6dc86d' }}>✓ Solicitud enviada. El equipo te contactará pronto.</div>
                </div>
              )}

              {/* Input de chat */}
              <div style={{ padding: '0.75rem', borderTop: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', gap: '7px', flexShrink: 0 }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
                  placeholder="Escribe tu pregunta…"
                  style={{ flex: 1, background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', color: 'var(--text-0)', padding: '9px 12px', borderRadius: '10px', fontSize: '13px', outline: 'none' }}
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !input.trim()}
                  style={{ padding: '9px 14px', background: 'var(--gold-200)', color: 'var(--bg-0)', border: 'none', borderRadius: '10px', fontSize: '14px', cursor: 'pointer', opacity: loading || !input.trim() ? 0.45 : 1, transition: 'opacity 0.15s', fontWeight: 700 }}
                >
                  →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
