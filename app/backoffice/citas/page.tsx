'use client'

import { useEffect, useState } from 'react'

type Cita = {
  id: string
  created_at: string
  tipo: 'llamada' | 'presencial'
  fecha_propuesta: string | null
  hora_propuesta: string | null
  mensaje: string
  estado: 'pendiente' | 'confirmada' | 'denegada' | 'reprogramada'
  fecha_confirmada: string | null
  hora_confirmada: string | null
  nota_admin: string | null
  clientes: { nombre: string; apellidos: string; email: string; telefono: string | null } | null
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
          <h1 className="serif" style={{ fontSize: '2.2rem', fontWeight: 300, color: 'var(--text-0)' }}>Solicitudes de Cita</h1>
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
                  {cita.tipo === 'llamada' ? '📞' : '🤝'}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-0)' }}>
                        {cliente ? `${cliente.nombre} ${cliente.apellidos}` : 'Cliente'}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--text-3)', marginLeft: '8px' }}>
                        {cita.tipo === 'llamada' ? 'Llamada' : 'Cita presencial'}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: est.color, background: est.bg, padding: '3px 10px', borderRadius: '20px' }}>
                      {est.label}
                    </span>
                  </div>

                  <div style={{ fontSize: '12px', color: 'var(--text-2)', marginBottom: '6px', lineHeight: 1.5 }}>
                    {cita.mensaje}
                  </div>

                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '11px', color: 'var(--text-3)', flexWrap: 'wrap' }}>
                    {cita.fecha_propuesta && (
                      <span>📅 {new Date(cita.fecha_propuesta + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}{cita.hora_propuesta ? ` · ${cita.hora_propuesta}` : ''}</span>
                    )}
                    {cliente?.email && <span>✉️ {cliente.email}</span>}
                    {cliente?.telefono && <span>📱 {cliente.telefono}</span>}
                    <span>Recibida {new Date(cita.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>

                  {/* Respuesta del admin si existe */}
                  {(cita.fecha_confirmada || cita.nota_admin) && (
                    <div style={{ marginTop: '8px', padding: '8px 12px', background: 'var(--bg-1)', borderRadius: '8px', fontSize: '11px', color: 'var(--text-2)', borderLeft: `2px solid ${est.color}` }}>
                      {cita.fecha_confirmada && <span>📅 Confirmada: {new Date(cita.fecha_confirmada + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}{cita.hora_confirmada ? ` a las ${cita.hora_confirmada}` : ''}</span>}
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
              {modal.clientes?.nombre} {modal.clientes?.apellidos} · {modal.tipo}
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
