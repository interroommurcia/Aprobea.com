'use client'

import { useEffect, useState, useCallback } from 'react'

type Examen = {
  id: string
  user_id: string
  tipo: string
  estado: string
  total_preguntas: number
  correctas: number | null
  puntuacion: number | null
  created_at: string
  oposiciones: { nombre_corto: string } | null
  perfiles: { nombre: string } | null
}

const tipoColor: Record<string, string> = { practica: '#4db87a', simulacro: '#4d9fd4', repaso_fallos: '#e07a4d', adaptativo: 'var(--gold-200)', oficial: '#c084fc' }
const estadoColor: Record<string, string> = { en_curso: '#e0a84d', completado: '#4db87a', abandonado: 'var(--text-3)' }

export default function ExamenesPage() {
  const [items, setItems]     = useState<Examen[]>([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(1)
  const [filtroTipo, setFiltroTipo]     = useState('')
  const [filtroEstado, setFiltroEstado] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (filtroTipo)   params.set('tipo', filtroTipo)
    if (filtroEstado) params.set('estado', filtroEstado)
    fetch(`/api/backoffice/examenes?${params}`)
      .then(r => r.ok ? r.json() : { items: [], total: 0 })
      .then(d => { setItems(d.items ?? []); setTotal(d.total ?? 0); setLoading(false) })
  }, [page, filtroTipo, filtroEstado])

  useEffect(() => { load() }, [load])

  function fmt(iso: string) {
    return new Date(iso).toLocaleString('es-ES', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  const totalPages = Math.ceil(total / 30)

  return (
    <div style={{ padding: '2.5rem 3rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.4rem' }}>Historial global</div>
        <h1 className="serif" style={{ fontSize: '2.2rem', fontWeight: 300, color: 'var(--text-0)' }}>Exámenes</h1>
        <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '4px' }}>{total.toLocaleString('es-ES')} exámenes en total</div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <select value={filtroTipo} onChange={e => { setFiltroTipo(e.target.value); setPage(1) }}
          style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius)', color: 'var(--text-1)', padding: '7px 12px', fontSize: '12px' }}>
          <option value="">Todos los tipos</option>
          {['practica', 'simulacro', 'repaso_fallos', 'adaptativo', 'oficial'].map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={filtroEstado} onChange={e => { setFiltroEstado(e.target.value); setPage(1) }}
          style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius)', color: 'var(--text-1)', padding: '7px 12px', fontSize: '12px' }}>
          <option value="">Todos los estados</option>
          {['en_curso', 'completado', 'abandonado'].map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        <button onClick={load} style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', color: 'var(--text-1)', borderRadius: 'var(--radius)', padding: '7px 14px', fontSize: '12px', cursor: 'pointer' }}>↻ Actualizar</button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total', value: total },
          { label: 'Completados', value: items.filter(e => e.estado === 'completado').length, color: '#4db87a' },
          { label: 'En curso', value: items.filter(e => e.estado === 'en_curso').length, color: '#e0a84d' },
          { label: 'Puntuación media', value: (() => { const done = items.filter(e => e.puntuacion != null); return done.length ? (done.reduce((s, e) => s + (e.puntuacion ?? 0), 0) / done.length).toFixed(1) : '—' })() },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.5rem' }}>
            <div className="serif" style={{ fontSize: '1.6rem', fontWeight: 300, color: (s as any).color ?? 'var(--gold-100)' }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      {loading ? (
        <p style={{ color: 'var(--text-2)', fontSize: '14px' }}>Cargando exámenes…</p>
      ) : (
        <>
          <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-3)', borderBottom: '0.5px solid var(--gold-border)' }}>
                  {['Fecha', 'Usuario', 'Oposición', 'Tipo', 'Estado', 'Preguntas', 'Puntuación'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 600, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>No hay exámenes con estos filtros</td></tr>
                )}
                {items.map(ex => (
                  <tr key={ex.id} style={{ borderBottom: '0.5px solid var(--gold-border)' }}>
                    <td style={{ padding: '10px 16px', color: 'var(--text-3)', whiteSpace: 'nowrap', fontSize: '11px' }}>{fmt(ex.created_at)}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-1)' }}>{(ex.perfiles as any)?.nombre ?? ex.user_id.slice(0, 8) + '…'}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-2)' }}>{(ex.oposiciones as any)?.nombre_corto ?? '—'}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ background: `${tipoColor[ex.tipo] ?? 'var(--text-3)'}22`, color: tipoColor[ex.tipo] ?? 'var(--text-3)', borderRadius: 6, padding: '2px 8px', fontSize: '10px', fontWeight: 600 }}>{ex.tipo}</span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ background: `${estadoColor[ex.estado] ?? 'var(--text-3)'}22`, color: estadoColor[ex.estado] ?? 'var(--text-3)', borderRadius: 6, padding: '2px 8px', fontSize: '10px', fontWeight: 600 }}>{ex.estado}</span>
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-2)', textAlign: 'center' }}>
                      {ex.correctas != null ? `${ex.correctas}/${ex.total_preguntas}` : ex.total_preguntas}
                    </td>
                    <td style={{ padding: '10px 16px', color: ex.puntuacion != null && ex.puntuacion >= 5 ? '#4db87a' : ex.puntuacion != null ? '#e07a4d' : 'var(--text-3)', fontWeight: 600 }}>
                      {ex.puntuacion != null ? ex.puntuacion.toFixed(2) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', justifyContent: 'center' }}>
              <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', color: 'var(--text-1)', borderRadius: 'var(--radius)', padding: '6px 14px', cursor: page <= 1 ? 'default' : 'pointer', opacity: page <= 1 ? 0.4 : 1, fontSize: '12px' }}>← Anterior</button>
              <span style={{ padding: '6px 14px', fontSize: '12px', color: 'var(--text-2)' }}>{page} / {totalPages}</span>
              <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', color: 'var(--text-1)', borderRadius: 'var(--radius)', padding: '6px 14px', cursor: page >= totalPages ? 'default' : 'pointer', opacity: page >= totalPages ? 0.4 : 1, fontSize: '12px' }}>Siguiente →</button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
