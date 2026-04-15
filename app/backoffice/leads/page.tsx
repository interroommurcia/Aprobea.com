'use client'

import { useEffect, useState } from 'react'

type Lead = {
  id: string
  created_at: string
  nombre: string | null
  email: string | null
  telefono: string | null
  interes: string | null
  mensaje: string | null
  estado: string
  nota_admin: string | null
  conversacion: { role: 'user' | 'assistant'; content: string }[] | null
}

const ESTADO_COLORS: Record<string, { bg: string; color: string; label: string }> = {
  nuevo: { bg: 'rgba(201,160,67,0.15)', color: '#C9A043', label: '🔔 Nuevo' },
  contactado: { bg: 'rgba(109,200,109,0.12)', color: '#6dc86d', label: '✅ Contactado' },
  descartado: { bg: 'rgba(255,255,255,0.05)', color: '#888', label: '✗ Descartado' },
}

const INTERES_LABEL: Record<string, string> = {
  npl: '📄 NPL',
  crowdfunding: '🏗️ Crowdfunding',
  'rent-to-rent': '🏠 Rent to Rent',
  general: '💬 General',
}

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<string>('todos')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [nota, setNota] = useState<Record<string, string>>({})
  const [guardando, setGuardando] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/backoffice/leads')
      .then(r => r.ok ? r.json() : [])
      .then(d => { setLeads(Array.isArray(d) ? d : []); setLoading(false) })
  }, [])

  const filtrados = filtro === 'todos' ? leads : leads.filter(l => l.estado === filtro)

  async function updateEstado(id: string, estado: string) {
    const notaVal = nota[id] ?? leads.find(l => l.id === id)?.nota_admin ?? ''
    setGuardando(id)
    await fetch(`/api/backoffice/leads?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado, nota_admin: notaVal }),
    })
    setLeads(ls => ls.map(l => l.id === id ? { ...l, estado, nota_admin: notaVal } : l))
    setGuardando(null)
  }

  async function saveNota(id: string) {
    const lead = leads.find(l => l.id === id)
    setGuardando(id)
    await fetch(`/api/backoffice/leads?id=${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: lead?.estado ?? 'nuevo', nota_admin: nota[id] ?? '' }),
    })
    setLeads(ls => ls.map(l => l.id === id ? { ...l, nota_admin: nota[id] ?? '' } : l))
    setGuardando(null)
  }

  const counts = {
    todos: leads.length,
    nuevo: leads.filter(l => l.estado === 'nuevo').length,
    contactado: leads.filter(l => l.estado === 'contactado').length,
    descartado: leads.filter(l => l.estado === 'descartado').length,
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-0)', marginBottom: '0.35rem' }}>
          📥 Buzón de Leads
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-3)' }}>
          Visitantes que han dejado sus datos de contacto a través de SKYLLER en la web.
        </p>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {(['todos', 'nuevo', 'contactado', 'descartado'] as const).map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            style={{
              padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
              background: filtro === f ? 'linear-gradient(135deg,#C9A043,#a07828)' : 'var(--bg-2)',
              color: filtro === f ? '#0a0a0a' : 'var(--text-2)',
              border: filtro === f ? 'none' : '0.5px solid var(--gold-border)',
            }}>
            {f === 'todos' ? 'Todos' : ESTADO_COLORS[f].label} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '3rem', fontSize: '13px' }}>Cargando…</div>
      ) : filtrados.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--text-3)', padding: '4rem', fontSize: '13px' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📭</div>
          No hay leads con este filtro
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {filtrados.map(lead => {
            const est = ESTADO_COLORS[lead.estado] ?? ESTADO_COLORS.nuevo
            const expanded = expandedId === lead.id
            return (
              <div key={lead.id}
                style={{ background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', borderRadius: '16px', overflow: 'hidden', transition: 'all 0.2s' }}>

                {/* Cabecera del lead */}
                <div
                  onClick={() => setExpandedId(expanded ? null : lead.id)}
                  style={{ padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '14px', cursor: 'pointer' }}>

                  {/* Avatar */}
                  <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(201,160,67,0.1)', border: '0.5px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                    {lead.nombre ? lead.nombre[0].toUpperCase() : '?'}
                  </div>

                  {/* Info principal */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '3px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-0)' }}>
                        {lead.nombre || 'Sin nombre'}
                      </span>
                      <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '10px', background: est.bg, color: est.color, fontWeight: 600 }}>
                        {est.label}
                      </span>
                      {lead.interes && (
                        <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                          {INTERES_LABEL[lead.interes] ?? lead.interes}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {lead.telefono && <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>📱 {lead.telefono}</span>}
                      {lead.email && <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>✉️ {lead.email}</span>}
                      <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                        {new Date(lead.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>

                  <span style={{ color: 'var(--text-3)', fontSize: '12px', flexShrink: 0 }}>{expanded ? '▲' : '▼'}</span>
                </div>

                {/* Detalle expandido */}
                {expanded && (
                  <div style={{ padding: '0 1.25rem 1.25rem', borderTop: '0.5px solid rgba(201,160,67,0.1)' }}>
                    {/* Mensaje del lead */}
                    {lead.mensaje && (
                      <div style={{ background: 'var(--bg-2)', borderRadius: '10px', padding: '10px 14px', margin: '1rem 0', fontSize: '12.5px', color: 'var(--text-1)', lineHeight: 1.6, borderLeft: '3px solid rgba(201,160,67,0.4)' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Motivo de interés</div>
                        {lead.mensaje}
                      </div>
                    )}

                    {/* Conversación con SKYLLER */}
                    {lead.conversacion && lead.conversacion.length > 0 && (
                      <div style={{ marginBottom: '1rem' }}>
                        <div style={{ fontSize: '10px', color: 'var(--text-3)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          💬 Conversación con SKYLLER ({lead.conversacion.length} mensajes)
                        </div>
                        <div style={{ background: 'var(--bg-2)', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '280px', overflowY: 'auto' }}>
                          {lead.conversacion.map((m, i) => (
                            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                              <div style={{
                                maxWidth: '82%', padding: '7px 11px', fontSize: '11.5px', lineHeight: 1.55,
                                borderRadius: m.role === 'user' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                                background: m.role === 'user' ? 'linear-gradient(135deg,#C9A043,#a07828)' : 'var(--bg-1)',
                                color: m.role === 'user' ? '#0a0a0a' : 'var(--text-1)',
                                border: m.role === 'assistant' ? '0.5px solid rgba(201,160,67,0.2)' : 'none',
                                whiteSpace: 'pre-wrap',
                              }}>
                                {m.role === 'assistant' && <span style={{ fontSize: '9px', fontWeight: 700, color: '#C9A043', display: 'block', marginBottom: '2px' }}>SKYLLER</span>}
                                {typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Cambiar estado */}
                    <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                      {(['nuevo', 'contactado', 'descartado'] as const).map(est => (
                        <button key={est} onClick={() => updateEstado(lead.id, est)}
                          disabled={guardando === lead.id || lead.estado === est}
                          style={{
                            padding: '5px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, cursor: lead.estado === est ? 'default' : 'pointer',
                            background: lead.estado === est ? ESTADO_COLORS[est].bg : 'var(--bg-3)',
                            color: lead.estado === est ? ESTADO_COLORS[est].color : 'var(--text-2)',
                            border: `0.5px solid ${lead.estado === est ? ESTADO_COLORS[est].color : 'var(--gold-border)'}`,
                            opacity: guardando === lead.id ? 0.6 : 1,
                          }}>
                          {ESTADO_COLORS[est].label}
                        </button>
                      ))}
                    </div>

                    {/* Nota interna */}
                    <div>
                      <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '5px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Nota interna</div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          value={nota[lead.id] ?? lead.nota_admin ?? ''}
                          onChange={e => setNota(n => ({ ...n, [lead.id]: e.target.value }))}
                          placeholder="Añade una nota…"
                          style={{ flex: 1, background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', padding: '7px 12px', fontSize: '12px', color: 'var(--text-0)', outline: 'none', fontFamily: 'inherit' }}
                        />
                        <button onClick={() => saveNota(lead.id)} disabled={guardando === lead.id}
                          style={{ padding: '7px 16px', borderRadius: '8px', background: 'linear-gradient(135deg,#C9A043,#a07828)', border: 'none', color: '#0a0a0a', fontSize: '12px', fontWeight: 600, cursor: 'pointer', opacity: guardando === lead.id ? 0.6 : 1 }}>
                          {guardando === lead.id ? '…' : 'Guardar'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
