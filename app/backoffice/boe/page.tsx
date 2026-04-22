'use client'

import { useEffect, useState } from 'react'

type Pub = { id: string; titulo: string; tipo: string; boe_fuente: string; fecha_publicacion: string; url_pdf: string; resumen_ia: string; procesado: boolean; relevancia: number }

export default function BackofficeBoe() {
  const hoyISO = new Date().toISOString().slice(0, 10)

  const [pubs, setPubs]           = useState<Pub[]>([])
  const [loading, setLoading]     = useState(true)
  const [scraping, setScraping]   = useState(false)
  const [vaciando, setVaciando]   = useState(false)
  const [debugInfo, setDebugInfo] = useState<string>('')
  const [filtroTipo, setFiltro]   = useState('todos')
  const [filtroFecha, setFiltroFecha] = useState('')          // filtro visual de la tabla
  const [fechaScraping, setFechaScraping] = useState(hoyISO) // fecha para el scraping manual

  function load() {
    setLoading(true)
    fetch('/api/backoffice/boe').then(r => r.ok ? r.json() : { items: [] }).then(d => { setPubs(Array.isArray(d.items) ? d.items : []); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  async function ejecutarScraping() {
    setScraping(true)
    const body: Record<string, string> = {}
    if (fechaScraping) body.fecha = fechaScraping
    const res = await fetch('/api/backoffice/boe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    alert(`Scraping completado (${fechaScraping}): ${data.insertadas ?? 0} nuevas publicaciones insertadas`)
    setScraping(false); load()
  }

  async function ejecutarDebug() {
    setDebugInfo('Consultando BOE…')
    const body: Record<string, any> = { debug: true }
    if (fechaScraping) body.fecha = fechaScraping
    const res = await fetch('/api/backoffice/boe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    setDebugInfo(JSON.stringify(data.debug ?? data, null, 2))
  }

  async function vaciarYRescraping() {
    if (!confirm(`¿Borrar TODAS las publicaciones BOE y volver a scrapear ${fechaScraping}?\nEsta acción no se puede deshacer.`)) return
    setVaciando(true)
    await fetch('/api/backoffice/boe', { method: 'DELETE' })
    setPubs([])
    setVaciando(false)
    // Rescraping inmediato con la fecha seleccionada
    setScraping(true)
    const body: Record<string, string> = {}
    if (fechaScraping) body.fecha = fechaScraping
    const res = await fetch('/api/backoffice/boe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    alert(`BD vaciada y rescrapeada (${fechaScraping}): ${data.insertadas ?? 0} publicaciones relevantes insertadas`)
    setScraping(false); load()
  }

  async function marcarProcesado(id: string) {
    await fetch('/api/backoffice/boe/procesar', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setPubs(prev => prev.map(p => p.id === id ? { ...p, procesado: true } : p))
  }

  const tipoColor: Record<string, string> = { convocatoria: '#4db87a', bases: 'var(--gold-100)', resultado: '#4d9fd4', temario: '#e07a4d', rectificacion: '#e05', otro: 'var(--text-3)' }
  const filtradas = pubs
    .filter(p => filtroTipo === 'todos' || p.tipo === filtroTipo)
    .filter(p => !filtroFecha || p.fecha_publicacion === filtroFecha)

  return (
    <div style={{ padding: '2.5rem 3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.4rem' }}>Monitoreo automático</div>
          <h1 className="serif" style={{ fontSize: '2.2rem', fontWeight: 300, color: 'var(--text-0)' }}>BOE Radar</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
          <input
            type="date"
            value={fechaScraping}
            max={hoyISO}
            onChange={e => setFechaScraping(e.target.value)}
            style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius)', padding: '9px 12px', color: 'var(--text-0)', fontSize: '13px', cursor: 'pointer' }}
          />
          <button onClick={ejecutarScraping} disabled={scraping || vaciando || !fechaScraping}
            style={{ background: scraping ? 'rgba(77,159,212,0.1)' : '#4d9fd4', color: scraping ? '#4d9fd4' : '#fff', border: `0.5px solid ${scraping ? 'rgba(77,159,212,0.4)' : '#4d9fd4'}`, borderRadius: 'var(--radius)', padding: '9px 20px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', opacity: (scraping || vaciando) ? 0.7 : 1, whiteSpace: 'nowrap' }}>
            {scraping ? '⏳ Scrapeando…' : '📡 Ejecutar scraping'}
          </button>
          <button onClick={ejecutarDebug} disabled={scraping || vaciando}
            style={{ background: 'rgba(201,160,67,0.08)', color: 'var(--gold-200)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius)', padding: '9px 14px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', opacity: (scraping || vaciando) ? 0.6 : 1, whiteSpace: 'nowrap' }}>
            🔍 Debug
          </button>
          <button onClick={vaciarYRescraping} disabled={scraping || vaciando}
            style={{ background: 'rgba(224,0,85,0.08)', color: '#e05', border: '0.5px solid rgba(224,0,85,0.25)', borderRadius: 'var(--radius)', padding: '9px 16px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', opacity: (scraping || vaciando) ? 0.6 : 1, whiteSpace: 'nowrap' }}>
            {vaciando ? '🗑 Vaciando…' : '🗑 Vaciar BD y rescraping'}
          </button>
        </div>
      </div>

      {/* Debug panel */}
      {debugInfo && (
        <div style={{ background: 'rgba(0,0,0,0.4)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '11px', color: 'var(--gold-300)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Debug BOE API</span>
            <button onClick={() => setDebugInfo('')} style={{ fontSize: '11px', color: 'var(--text-3)', background: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>
          </div>
          <pre style={{ fontSize: '11px', color: 'var(--text-2)', overflow: 'auto', maxHeight: '300px', margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{debugInfo}</pre>
        </div>
      )}

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {['todos','convocatoria','bases','resultado','temario','rectificacion','otro'].map(t => (
          <button key={t} onClick={() => setFiltro(t)} style={{ padding: '5px 12px', background: filtroTipo === t ? 'rgba(201,160,67,0.1)' : 'transparent', border: `0.5px solid ${filtroTipo === t ? 'var(--gold-200)' : 'rgba(255,255,255,0.08)'}`, color: filtroTipo === t ? 'var(--gold-100)' : 'var(--text-3)', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', textTransform: 'capitalize' }}>
            {t === 'todos' ? 'Todos' : t}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <input
            type="date"
            value={filtroFecha}
            max={hoyISO}
            onChange={e => setFiltroFecha(e.target.value)}
            style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', padding: '4px 10px', color: 'var(--text-0)', fontSize: '11px', cursor: 'pointer' }}
          />
          {filtroFecha && (
            <button onClick={() => setFiltroFecha('')} style={{ fontSize: '11px', color: 'var(--text-3)', background: 'transparent', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '4px 8px', cursor: 'pointer' }}>
              ✕ Limpiar
            </button>
          )}
        </div>
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
