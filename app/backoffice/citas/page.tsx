'use client'

import { useEffect, useState } from 'react'

type Cita = {
  id: string
  created_at: string
  tipo: 'llamada'
  fecha_propuesta: string | null
  hora_propuesta: string | null
  mensaje: string
  estado: 'pendiente' | 'confirmada' | 'denegada' | 'reprogramada'
  fecha_confirmada: string | null
  hora_confirmada: string | null
  nota_admin: string | null
  conversacion_ia: { role: string; content: string }[] | null
  clientes: {
    id: string
    nombre: string
    apellidos: string
    email: string
    telefono: string | null
    tipo_inversor: string
    capital_inicial: number
    estado: string
    created_at: string
  } | null
}

function ConversacionIA({ mensajes }: { mensajes: { role: string; content: string }[] }) {
  const [open, setOpen] = useState(false)
  const visibles = mensajes.filter(m => m.content && typeof m.content === 'string')
  if (visibles.length === 0) return null
  return (
    <div style={{ marginBottom: '10px' }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', color: 'var(--gold-200)', display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 0' }}>
        <span style={{ fontSize: '12px' }}>{open ? '▾' : '▸'}</span>
        {open ? 'Ocultar' : 'Ver'} conversación con la IA ({visibles.length} mensajes)
      </button>
      {open && (
        <div style={{ marginTop: '6px', background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', borderRadius: '10px', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto' }}>
          {visibles.map((m, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '85%', padding: '6px 10px', borderRadius: m.role === 'user' ? '10px 10px 2px 10px' : '10px 10px 10px 2px',
                fontSize: '11px', lineHeight: 1.5,
                background: m.role === 'user' ? 'rgba(201,160,67,0.15)' : 'rgba(255,255,255,0.04)',
                color: m.role === 'user' ? '#C9A043' : 'var(--text-2)',
                border: m.role === 'assistant' ? '0.5px solid rgba(201,160,67,0.1)' : 'none',
              }}>
                <span style={{ fontSize: '9px', opacity: 0.5, display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {m.role === 'user' ? 'Cliente' : 'IA'}
                </span>
                {m.content}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const ESTADO_STYLE: Record<string, { color: string; bg: string; label: string }> = {
  pendiente:    { color: '#C9A043', bg: 'rgba(201,160,67,0.12)',  label: '⏳ Pendiente' },
  confirmada:   { color: '#6dc86d', bg: 'rgba(109,200,109,0.12)', label: '✓ Confirmada' },
  denegada:     { color: '#e05656', bg: 'rgba(224,86,86,0.12)',   label: '✕ Denegada' },
  reprogramada: { color: '#4da6d4', bg: 'rgba(77,166,212,0.12)',  label: '📅 Reprogramada' },
}

export default function CitasPage() {
  const [citas, setCitas] = useState<Cita[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState<string>('pendiente')
  const [modal, setModal] = useState<Cita | null>(null)
  const [accion, setAccion] = useState<'confirmar' | 'denegar' | 'reprogramar' | null>(null)
  const [fechaConf, setFechaConf] = useState('')
  const [horaConf, setHoraConf] = useState('')
  const [notaAdmin, setNotaAdmin] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadCitas() }, [filtro])

  function loadCitas() {
    setLoading(true)
    const qs = filtro === 'todas' ? '' : `?estado=${filtro}`
    fetch(`/api/backoffice/citas${qs}`)
      .then(r => r.json())
      .then(d => { setCitas(Array.isArray(d) ? d : []); setLoading(false) })
  }

  function openModal(cita: Cita, acc: 'confirmar' | 'denegar' | 'reprogramar') {
    setModal(cita)
    setAccion(acc)
    setFechaConf(cita.fecha_propuesta ?? '')
    setHoraConf(cita.hora_propuesta ?? '')
    setNotaAdmin('')
  }

  async function handleResponder() {
    if (!modal || !accion) return
    setSaving(true)
    const estadoMap = { confirmar: 'confirmada', denegar: 'denegada', reprogramar: 'reprogramada' }
    await fetch('/api/backoffice/citas', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: modal.id,
        estado: estadoMap[accion],
        fecha_confirmada: accion !== 'denegar' ? fechaConf || null : null,
        hora_confirmada: accion !== 'denegar' ? horaConf || null : null,
        nota_admin: notaAdmin || null,
      }),
    })
    setSaving(false)
    setModal(null)
    setAccion(null)
    loadCitas()
  }

  const pendientes = citas.filter(c => c.estado === 'pendiente').length

  return (
    <div style={{ padding: '2.5rem 3rem', maxWidth: '1000px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.5rem' }}>Agenda</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <h1 className="serif" style={{ fontSize: '2.2rem', fontWeight: 300, color: 'var(--text-0)' }}>Solicitudes de Llamada</h1>
          {pendientes > 0 && (
            <span style={{ background: '#C9A043', color: '#0a0a0a', borderRadius: '20px', padding: '3px 10px', fontSize: '11px', fontWeight: 700 }}>
              {pendientes} nueva{pendientes > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {['pendiente', 'confirmada', 'reprogramada', 'denegada', 'todas'].map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            style={{ padding: '6px 14px', borderRadius: '20px', fontSize: '11px', cursor: 'pointer', border: '0.5px solid var(--gold-border)', fontWeight: filtro === f ? 600 : 400, background: filtro === f ? 'var(--gold-200)' : 'transparent', color: filtro === f ? 'var(--bg-0)' : 'var(--text-2)', textTransform: 'capitalize' }}>
            {f === 'todas' ? 'Todas' : ESTADO_STYLE[f]?.label ?? f}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div style={{ color: 'var(--text-2)', padding: '2rem' }}>Cargando…</div>
      ) : citas.length === 0 ? (
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', padding: '3rem', textAlign: 'center', color: 'var(--text-3)' }}>
          No hay solicitudes {filtro !== 'todas' ? `con estado "${filtro}"` : ''}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {citas.map(cita => {
            const est = ESTADO_STYLE[cita.estado]
            const cliente = cita.clientes
            return (
              <div key={cita.id} style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', padding: '1.25rem 1.5rem', display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                {/* Icono tipo */}
                <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(201,160,67,0.08)', border: '0.5px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
                  📞
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Cabecera: nombre + estado */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-0)' }}>
                        {cliente ? `${cliente.nombre} ${cliente.apellidos}` : 'Cliente desconocido'}
                      </span>
                      {cliente && (
                        <span style={{ marginLeft: '8px', fontSize: '10px', background: cliente.tipo_inversor === 'npl' ? 'rgba(184,115,51,0.15)' : 'rgba(201,160,67,0.12)', color: cliente.tipo_inversor === 'npl' ? '#b87333' : '#C9A043', padding: '2px 8px', borderRadius: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                          {cliente.tipo_inversor}
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: est.color, background: est.bg, padding: '3px 10px', borderRadius: '20px' }}>
                      {est.label}
                    </span>
                  </div>

                  {/* Motivo de la llamada */}
                  <div style={{ fontSize: '13px', color: 'var(--text-1)', marginBottom: '10px', lineHeight: 1.6, padding: '8px 12px', background: 'rgba(201,160,67,0.04)', borderRadius: '8px', borderLeft: '2px solid rgba(201,160,67,0.3)' }}>
                    <span style={{ fontSize: '10px', color: 'var(--text-3)', display: 'block', marginBottom: '2px', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Motivo</span>
                    {cita.mensaje}
                  </div>

                  {/* Conversación IA previa */}
                  {cita.conversacion_ia && cita.conversacion_ia.length > 0 && (
                    <ConversacionIA mensajes={cita.conversacion_ia} />
                  )}

                  {/* Datos de contacto */}
                  <div style={{ display: 'flex', gap: '1rem', fontSize: '11px', color: 'var(--text-2)', flexWrap: 'wrap', marginBottom: '6px' }}>
                    {cliente?.email && (
                      <a href={`mailto:${cliente.email}`} style={{ color: 'var(--gold-200)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ✉️ {cliente.email}
                      </a>
                    )}
                    {cliente?.telefono && (
                      <a href={`tel:${cliente.telefono}`} style={{ color: 'var(--gold-200)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        📱 {cliente.telefono}
                      </a>
                    )}
                    {cita.fecha_propuesta && (
                      <span style={{ color: 'var(--text-3)' }}>
                        📅 Propone: {new Date(cita.fecha_propuesta + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}{cita.hora_propuesta ? ` · ${cita.hora_propuesta}` : ''}
                      </span>
                    )}
                    <span style={{ color: 'var(--text-3)' }}>
                      🕐 {new Date(cita.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Capital / antigüedad si es cliente */}
                  {cliente && (
                    <div style={{ display: 'flex', gap: '1rem', fontSize: '10px', color: 'var(--text-3)', flexWrap: 'wrap' }}>
                      {cliente.capital_inicial > 0 && <span>💰 Capital inicial: {cliente.capital_inicial.toLocaleString('es-ES')}€</span>}
                      <span>👤 Estado: {cliente.estado}</span>
                      <span>📆 Cliente desde {new Date(cliente.created_at).toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</span>
                    </div>
                  )}

                  {/* Respuesta del admin si existe */}
                  {(cita.fecha_confirmada || cita.nota_admin) && (
                    <div style={{ marginTop: '8px', padding: '8px 12px', background: 'var(--bg-1)', borderRadius: '8px', fontSize: '11px', color: 'var(--text-2)', borderLeft: `2px solid ${est.color}` }}>
                      {cita.fecha_confirmada && <span>📅 {new Date(cita.fecha_confirmada + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}{cita.hora_confirmada ? ` a las ${cita.hora_confirmada}` : ''}</span>}
                      {cita.nota_admin && <span style={{ marginLeft: '8px' }}>· {cita.nota_admin}</span>}
                    </div>
                  )}
                </div>

                {/* Acciones (solo si pendiente) */}
                {cita.estado === 'pendiente' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flexShrink: 0 }}>
                    <button onClick={() => openModal(cita, 'confirmar')}
                      style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', background: '#6dc86d', border: 'none', color: '#0a0a0a', fontWeight: 600 }}>
                      ✓ Confirmar
                    </button>
                    <button onClick={() => openModal(cita, 'reprogramar')}
                      style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', background: 'rgba(77,166,212,0.15)', border: '0.5px solid #4da6d4', color: '#4da6d4', fontWeight: 600 }}>
                      📅 Reprogramar
                    </button>
                    <button onClick={() => openModal(cita, 'denegar')}
                      style={{ padding: '6px 14px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', background: 'rgba(224,86,86,0.1)', border: '0.5px solid #e05656', color: '#e05656', fontWeight: 600 }}>
                      ✕ Denegar
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── MODAL DE RESPUESTA ── */}
      {modal && accion && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
          onClick={e => { if (e.target === e.currentTarget) { setModal(null); setAccion(null) } }}>
          <div style={{ background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '480px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-0)', marginBottom: '0.25rem' }}>
              {accion === 'confirmar' ? '✓ Confirmar cita' : accion === 'reprogramar' ? '📅 Proponer nuevo horario' : '✕ Denegar solicitud'}
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '1.5rem' }}>
              {modal.clientes?.nombre} {modal.clientes?.apellidos} · Llamada telefónica
            </p>

            {accion !== 'denegar' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Fecha</label>
                  <input type="date" value={fechaConf} onChange={e => setFechaConf(e.target.value)}
                    className="form-input" style={{ width: '100%', fontSize: '13px' }} />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Hora</label>
                  <input type="time" value={horaConf} onChange={e => setHoraConf(e.target.value)}
                    className="form-input" style={{ width: '100%', fontSize: '13px' }} />
                </div>
              </div>
            )}

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>
                {accion === 'denegar' ? 'Motivo o alternativa (opcional)' : 'Nota para el cliente (opcional)'}
              </label>
              <textarea value={notaAdmin} onChange={e => setNotaAdmin(e.target.value)}
                rows={3} placeholder={accion === 'denegar' ? 'Ej: No tenemos disponibilidad esa semana, puedes escribirnos para buscar otra fecha…' : 'Ej: Nos vemos en la oficina, calle…'}
                style={{ width: '100%', background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', color: 'var(--text-1)', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => { setModal(null); setAccion(null) }}
                style={{ padding: '8px 18px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', background: 'transparent', border: '0.5px solid var(--gold-border)', color: 'var(--text-2)' }}>
                Cancelar
              </button>
              <button onClick={handleResponder} disabled={saving}
                style={{ padding: '8px 22px', borderRadius: '8px', fontSize: '12px', cursor: 'pointer', fontWeight: 600, border: 'none', opacity: saving ? 0.6 : 1,
                  background: accion === 'confirmar' ? '#6dc86d' : accion === 'reprogramar' ? '#4da6d4' : '#e05656',
                  color: accion === 'confirmar' ? '#0a0a0a' : '#fff' }}>
                {saving ? 'Enviando…' : accion === 'confirmar' ? 'Confirmar y notificar' : accion === 'reprogramar' ? 'Proponer horario' : 'Denegar y notificar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
