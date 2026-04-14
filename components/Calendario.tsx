'use client'

import { useState, useEffect } from 'react'

export type EventoCalendario = {
  id: string
  titulo: string
  descripcion?: string
  fecha: string          // ISO date YYYY-MM-DD
  hora?: string          // HH:MM
  tipo: 'manual' | 'operacion' | 'vencimiento' | 'pago' | 'recordatorio'
  color?: string
  cliente_id?: string
  user_id?: string
}

const TIPO_COLOR: Record<string, string> = {
  manual:      '#C9A043',
  operacion:   '#7c6fd4',
  vencimiento: '#e05656',
  pago:        '#6dc86d',
  recordatorio:'#4da6d4',
}

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

interface Props {
  eventos: EventoCalendario[]
  onAddEvento?: (ev: Omit<EventoCalendario, 'id'>) => Promise<void>
  onDeleteEvento?: (id: string) => Promise<void>
  isAdmin?: boolean
  clienteId?: string
}

export default function Calendario({ eventos, onAddEvento, onDeleteEvento, isAdmin, clienteId }: Props) {
  const hoy = new Date()
  const [year, setYear]   = useState(hoy.getFullYear())
  const [month, setMonth] = useState(hoy.getMonth())
  const [selected, setSelected] = useState<string | null>(null)      // fecha seleccionada YYYY-MM-DD
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ titulo: '', descripcion: '', hora: '', tipo: 'manual' as EventoCalendario['tipo'] })
  const [saving, setSaving] = useState(false)
  const [detailEv, setDetailEv] = useState<EventoCalendario | null>(null)

  // Primer día del mes (0=Dom … 6=Sáb → convertir a Lun-first)
  const firstDay = new Date(year, month, 1).getDay()
  const offset   = firstDay === 0 ? 6 : firstDay - 1
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (number | null)[] = [
    ...Array(offset).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // pad to complete weeks
  while (cells.length % 7 !== 0) cells.push(null)

  function isoDate(d: number) {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }

  function eventosDelDia(d: number) {
    const fecha = isoDate(d)
    return eventos.filter(e => e.fecha === fecha)
  }

  function isToday(d: number) {
    return year === hoy.getFullYear() && month === hoy.getMonth() && d === hoy.getDate()
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || !onAddEvento) return
    setSaving(true)
    await onAddEvento({ ...form, fecha: selected, cliente_id: clienteId })
    setSaving(false)
    setShowForm(false)
    setForm({ titulo: '', descripcion: '', hora: '', tipo: 'manual' })
  }

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const selectedEvs = selected ? eventos.filter(e => e.fecha === selected) : []

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: '1.5rem', minHeight: '520px' }}>

      {/* ── GRID MENSUAL ── */}
      <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>

        {/* Header mes */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem 1.5rem', borderBottom: '0.5px solid var(--gold-border)' }}>
          <button onClick={prevMonth} style={{ background: 'none', border: 'none', color: 'var(--gold-200)', cursor: 'pointer', fontSize: '1.1rem', padding: '4px 8px' }}>‹</button>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.4rem', fontWeight: 300, color: 'var(--text-0)' }}>
              {MESES[month]}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.1em' }}>{year}</div>
          </div>
          <button onClick={nextMonth} style={{ background: 'none', border: 'none', color: 'var(--gold-200)', cursor: 'pointer', fontSize: '1.1rem', padding: '4px 8px' }}>›</button>
        </div>

        {/* Días de semana */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', borderBottom: '0.5px solid var(--gold-border)' }}>
          {DIAS.map(d => (
            <div key={d} style={{ padding: '0.5rem', textAlign: 'center', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{d}</div>
          ))}
        </div>

        {/* Celdas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
          {cells.map((d, i) => {
            const evs = d ? eventosDelDia(d) : []
            const fecha = d ? isoDate(d) : null
            const isSelected = fecha === selected
            const today = d ? isToday(d) : false

            return (
              <div
                key={i}
                onClick={() => d && setSelected(fecha)}
                style={{
                  minHeight: '72px', padding: '6px', cursor: d ? 'pointer' : 'default',
                  borderBottom: '0.5px solid rgba(62,59,53,0.3)',
                  borderRight: (i + 1) % 7 !== 0 ? '0.5px solid rgba(62,59,53,0.3)' : 'none',
                  background: isSelected ? 'rgba(201,160,67,0.08)' : today ? 'rgba(201,160,67,0.04)' : 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                {d && (
                  <>
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: today ? 600 : 400,
                      background: today ? 'var(--gold-200)' : 'transparent',
                      color: today ? 'var(--bg-0)' : isSelected ? 'var(--gold-100)' : 'var(--text-1)',
                      marginBottom: '4px',
                    }}>{d}</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {evs.slice(0, 3).map(ev => (
                        <div
                          key={ev.id}
                          onClick={e => { e.stopPropagation(); setDetailEv(ev) }}
                          style={{
                            fontSize: '9px', padding: '1px 4px', borderRadius: '2px',
                            background: (TIPO_COLOR[ev.tipo] ?? '#C9A043') + '22',
                            borderLeft: `2px solid ${TIPO_COLOR[ev.tipo] ?? '#C9A043'}`,
                            color: TIPO_COLOR[ev.tipo] ?? 'var(--gold-200)',
                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                            cursor: 'pointer',
                          }}
                        >{ev.hora ? `${ev.hora} ` : ''}{ev.titulo}</div>
                      ))}
                      {evs.length > 3 && (
                        <div style={{ fontSize: '9px', color: 'var(--text-3)' }}>+{evs.length - 3} más</div>
                      )}
                    </div>
                  </>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── PANEL LATERAL ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* Leyenda */}
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1rem' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.75rem' }}>Tipos</div>
          {Object.entries(TIPO_COLOR).map(([tipo, color]) => (
            <div key={tipo} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
              <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: color, flexShrink: 0 }} />
              <span style={{ fontSize: '11px', color: 'var(--text-2)', textTransform: 'capitalize' }}>
                {tipo === 'manual' ? 'Nota personal' : tipo === 'operacion' ? 'Operación' : tipo === 'vencimiento' ? 'Vencimiento' : tipo === 'pago' ? 'Pago' : 'Recordatorio'}
              </span>
            </div>
          ))}
        </div>

        {/* Eventos del día seleccionado */}
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1rem', flex: 1 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
              {selected ? new Date(selected + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' }) : 'Selecciona un día'}
            </div>
            {selected && onAddEvento && (
              <button
                onClick={() => setShowForm(true)}
                style={{ background: 'var(--gold-200)', border: 'none', color: 'var(--bg-0)', borderRadius: 'var(--radius)', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', fontWeight: 600 }}
              >+ Añadir</button>
            )}
          </div>

          {selectedEvs.length === 0 && selected && (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', textAlign: 'center', marginTop: '1rem' }}>Sin eventos</p>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {selectedEvs.map(ev => (
              <div key={ev.id} style={{
                padding: '0.65rem 0.75rem', borderRadius: 'var(--radius)',
                borderLeft: `3px solid ${TIPO_COLOR[ev.tipo] ?? '#C9A043'}`,
                background: (TIPO_COLOR[ev.tipo] ?? '#C9A043') + '10',
                position: 'relative',
              }}>
                <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-0)', marginBottom: '2px' }}>
                  {ev.hora && <span style={{ color: 'var(--text-3)', marginRight: '6px', fontSize: '11px' }}>{ev.hora}</span>}
                  {ev.titulo}
                </div>
                {ev.descripcion && <div style={{ fontSize: '11px', color: 'var(--text-2)' }}>{ev.descripcion}</div>}
                {onDeleteEvento && ev.tipo === 'manual' && (
                  <button
                    onClick={() => onDeleteEvento(ev.id)}
                    style={{ position: 'absolute', top: '6px', right: '6px', background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '12px', lineHeight: 1 }}
                  >×</button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Próximos eventos */}
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1rem' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.75rem' }}>Próximos 7 días</div>
          {(() => {
            const hoy7 = new Date(); hoy7.setDate(hoy7.getDate() + 7)
            const proximos = eventos
              .filter(e => {
                const f = new Date(e.fecha + 'T12:00:00')
                return f >= new Date() && f <= hoy7
              })
              .sort((a, b) => a.fecha.localeCompare(b.fecha))
              .slice(0, 5)
            if (proximos.length === 0) return <p style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Sin eventos próximos</p>
            return proximos.map(ev => (
              <div key={ev.id} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '8px' }}>
                <div style={{ width: '3px', background: TIPO_COLOR[ev.tipo] ?? '#C9A043', borderRadius: '2px', alignSelf: 'stretch', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-0)' }}>{ev.titulo}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                    {new Date(ev.fecha + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                    {ev.hora ? ` · ${ev.hora}` : ''}
                  </div>
                </div>
              </div>
            ))
          })()}
        </div>
      </div>

      {/* ── MODAL AÑADIR EVENTO ── */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div style={{ background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '2rem', width: '100%', maxWidth: '400px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <h3 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.4rem', fontWeight: 300, color: 'var(--text-0)' }}>
                Nuevo evento · {selected && new Date(selected + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}
              </h3>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
            </div>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: '6px' }}>Título *</label>
                <input className="form-input" required value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ej: Reunión con cliente" />
              </div>
              <div>
                <label style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: '6px' }}>Hora</label>
                <input className="form-input" type="time" value={form.hora} onChange={e => setForm(f => ({ ...f, hora: e.target.value }))} />
              </div>
              <div>
                <label style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: '6px' }}>Tipo</label>
                <select className="form-input" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as EventoCalendario['tipo'] }))}>
                  <option value="manual">Nota personal</option>
                  <option value="recordatorio">Recordatorio</option>
                  <option value="pago">Pago</option>
                  <option value="vencimiento">Vencimiento</option>
                  {isAdmin && <option value="operacion">Operación</option>}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: '6px' }}>Descripción</label>
                <input className="form-input" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} placeholder="Opcional…" />
              </div>
              <button type="submit" className="form-submit" disabled={saving} style={{ marginTop: '0.5rem' }}>
                {saving ? 'Guardando…' : 'Guardar evento'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL DETALLE EVENTO ── */}
      {detailEv && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={e => { if (e.target === e.currentTarget) setDetailEv(null) }}>
          <div style={{ background: 'var(--bg-1)', border: `0.5px solid ${TIPO_COLOR[detailEv.tipo] ?? 'var(--gold-border)'}`, borderRadius: 'var(--radius-lg)', padding: '2rem', width: '100%', maxWidth: '380px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
              <span style={{ fontSize: '9px', padding: '3px 8px', borderRadius: 'var(--radius)', background: (TIPO_COLOR[detailEv.tipo] ?? '#C9A043') + '22', color: TIPO_COLOR[detailEv.tipo] ?? 'var(--gold-200)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {detailEv.tipo}
              </span>
              <button onClick={() => setDetailEv(null)} style={{ background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: '1.2rem' }}>×</button>
            </div>
            <h3 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '1.6rem', fontWeight: 300, color: 'var(--text-0)', marginBottom: '0.5rem' }}>{detailEv.titulo}</h3>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-3)', marginBottom: '1rem' }}>
              {new Date(detailEv.fecha + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {detailEv.hora && ` · ${detailEv.hora}`}
            </div>
            {detailEv.descripcion && <p style={{ fontSize: '0.88rem', color: 'var(--text-1)', lineHeight: 1.7 }}>{detailEv.descripcion}</p>}
            {onDeleteEvento && detailEv.tipo === 'manual' && (
              <button onClick={() => { onDeleteEvento(detailEv.id); setDetailEv(null) }}
                style={{ marginTop: '1.5rem', background: 'transparent', border: '0.5px solid #e0565644', color: '#e05656', padding: '8px 16px', borderRadius: 'var(--radius)', fontSize: '11px', cursor: 'pointer' }}>
                Eliminar evento
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
