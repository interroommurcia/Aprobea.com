'use client'

import { useEffect, useState } from 'react'

type Pub = { id: string; titulo: string; tipo: string; boe_fuente: string; fecha_publicacion: string; url_pdf: string; resumen_ia: string; procesado: boolean; relevancia: number }

export default function BackofficeBoe() {
  const [pubs, setPubs]         = useState<Pub[]>([])
  const [loading, setLoading]   = useState(true)
  const [scraping, setScraping] = useState(false)
  const [filtroTipo, setFiltro] = useState('todos')

  function load() {
    setLoading(true)
    fetch('/api/backoffice/boe').then(r => r.ok ? r.json() : { items: [] }).then(d => { setPubs(Array.isArray(d.items) ? d.items : []); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  async function ejecutarScraping() {
    setScraping(true)
    const res = await fetch('/api/backoffice/boe', { method: 'POST' })
    const data = await res.json()
    alert(`Scraping completado: ${data.insertadas ?? 0} nuevas publicaciones insertadas`)
    setScraping(false); load()
  }

  async function marcarProcesado(id: string) {
    await fetch('/api/backoffice/boe/procesar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setPubs(prev => prev.map(p => p.id === id ? { ...p, procesado: true } : p))
  }

  const tipoColor: Record<string, string> = { convocatoria: '#4db87a', bases: 'var(--gold-100)', resultado: '#4d9fd4', temario: '#e07a4d', rectificacion: '#e05', otro: 'var(--text-3)' }
  const filtradas = filtroTipo === 'todos' ? pubs : pubs.filter(p => p.tipo === filtroTipo)

  return (
    <div style={{ padding: '2.5rem 3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.4rem' }}>Monitoreo automático</div>
          <h1 className="serif" style={{ fontSize: '2.2rem', fontWeight: 300, color: 'var(--text-0)' }}>BOE Radar</h1>
        </div>
        <button onClick={ejecutarScraping} disabled={scraping} style={{ background: scraping ? 'rgba(77,159,212,0.1)' : '#4d9fd4', color: scraping ? '#4d9fd4' : '#fff', border: `0.5px solid ${scraping ? 'rgba(77,159,212,0.4)' : '#4d9fd4'}`, borderRadius: 'var(--radius)', padding: '10px 20px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', opacity: scraping ? 0.7 : 1 }}>
          {scraping ? '⏳ Scrapeando BOE…' : '📡 Ejecutar scraping ahora'}
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total publicaciones', value: pubs.length },
          { label: 'Sin procesar', value: pubs.filter(p => !p.procesado).length, alert: true },
          { label: 'Convocatorias', value: pubs.filter(p => p.tipo === 'convocatoria').length },
          { label: 'Hoy', value: pubs.filter(p => p.fecha_publicacion === new Date().toISOString().slice(0, 10)).length },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-2)', border: `0.5px solid ${s.alert && s.value > 0 ? 'rgba(224,122,77,0.4)' : 'var(--gold-border)'}`, borderRadius: 'var(--radius-lg)', padding: '1rem 1.5rem' }}>
            <div className="serif" style={{ fontSize: '1.6rem', fontWeight: 300, color: s.alert && s.value > 0 ? '#e07a4d' : 'var(--gold-100)' }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {['todos','convocatoria','bases','resultado','temario','rectificacion','otro'].map(t => (
          <button key={t} onClick={() => setFiltro(t)} style={{ padding: '5px 12px', background: filtroTipo === t ? 'rgba(201,160,67,0.1)' : 'transparent', border: `0.5px solid ${filtroTipo === t ? 'var(--gold-200)' : 'rgba(255,255,255,0.08)'}`, color: filtroTipo === t ? 'var(--gold-100)' : 'var(--text-3)', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', textTransform: 'capitalize' }}>
            {t === 'todos' ? 'Todos' : t}
          </button>
        ))}
      </div>

      <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {loading ? <p style={{ padding: '2rem', color: 'var(--text-3)' }}>Cargando…</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--gold-border)' }}>
                {['Título', 'Tipo', 'Fuente', 'Fecha', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '0.65rem 1.5rem', textAlign: 'left', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtradas.map(p => (
                <tr key={p.id} style={{ borderBottom: '0.5px solid rgba(62,59,53,0.2)' }}>
                  <td style={{ padding: '0.8rem 1.5rem', maxWidth: '360px' }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{p.titulo}</div>
                    {p.resumen_ia && <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.resumen_ia}</div>}
                  </td>
                  <td style={{ padding: '0.8rem 1.5rem' }}>
                    <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '5px', background: `${tipoColor[p.tipo] ?? 'var(--text-3)'}20`, color: tipoColor[p.tipo] ?? 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase' }}>{p.tipo}</span>
                  </td>
                  <td style={{ padding: '0.8rem 1.5rem', fontSize: '10px', color: 'var(--text-2)', textTransform: 'uppercase' }}>{p.boe_fuente}</td>
                  <td style={{ padding: '0.8rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-2)' }}>{p.fecha_publicacion ? new Date(p.fecha_publicacion).toLocaleDateString('es-ES') : '—'}</td>
                  <td style={{ padding: '0.8rem 1.5rem' }}>
                    <span style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '5px', background: p.procesado ? 'rgba(77,184,122,0.1)' : 'rgba(224,122,77,0.1)', color: p.procesado ? '#4db87a' : '#e07a4d' }}>
                      {p.procesado ? 'Procesado' : 'Pendiente'}
                    </span>
                  </td>
                  <td style={{ padding: '0.8rem 1.5rem' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      {p.url_pdf && <a href={p.url_pdf} target="_blank" rel="noopener noreferrer" style={{ fontSize: '10px', color: 'var(--gold-200)', background: 'rgba(201,160,67,0.08)', border: '0.5px solid var(--gold-border)', padding: '3px 8px', borderRadius: '5px', textDecoration: 'none' }}>PDF</a>}
                      {!p.procesado && <button onClick={() => marcarProcesado(p.id)} style={{ fontSize: '10px', color: '#4db87a', background: 'rgba(77,184,122,0.08)', border: '0.5px solid rgba(77,184,122,0.2)', padding: '3px 8px', borderRadius: '5px', cursor: 'pointer' }}>✓ Procesar</button>}
                    </div>
                  </td>
                </tr>
              ))}
              {!filtradas.length && <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.85rem' }}>Sin publicaciones. Ejecuta el scraping.</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
