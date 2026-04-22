'use client'

import { useEffect, useState } from 'react'

type ExamenOficial = {
  id: string; boe_id: string; titulo: string
  fecha_publicacion: string; organismo: string | null
  url_pdf: string | null; procesado: boolean
  anio_convocatoria: number | null; grupo: string | null; num_plazas: number | null
}

const hoyISO = new Date().toISOString().slice(0, 10)
const hace1anio = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10)

export default function ExamenesOficialesPage() {
  const [items, setItems]           = useState<ExamenOficial[]>([])
  const [total, setTotal]           = useState(0)
  const [loading, setLoading]       = useState(true)
  const [scraping, setScraping]     = useState(false)
  const [scrapResult, setScrapResult] = useState<{ procesadas: number; encontradas: number; insertadas: number } | null>(null)
  const [scrapError, setScrapError] = useState('')

  // Scraping histórico
  const [desde, setDesde] = useState(hace1anio)
  const [hasta, setHasta] = useState(hoyISO)

  // Filtros tabla
  const [q, setQ]         = useState('')
  const [anio, setAnio]   = useState('')
  const [page, setPage]   = useState(1)

  function load(p = 1) {
    setLoading(true)
    const params = new URLSearchParams({ page: String(p), limit: '50' })
    if (q)    params.set('q', q)
    if (anio) params.set('anio', anio)
    fetch(`/api/backoffice/examenes-oficiales?${params}`)
      .then(r => r.ok ? r.json() : { items: [], total: 0 })
      .then(d => { setItems(d.items ?? []); setTotal(d.total ?? 0); setLoading(false) })
  }

  useEffect(() => { load(1); setPage(1) }, [q, anio]) // eslint-disable-line
  useEffect(() => { load(page) }, [page])              // eslint-disable-line

  async function ejecutarScraping() {
    setScraping(true); setScrapResult(null); setScrapError('')
    try {
      const res = await fetch('/api/backoffice/boe/scrape-historico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ desde, hasta }),
      })
      const data = await res.json()
      if (!res.ok) { setScrapError(data.error ?? 'Error desconocido'); return }
      setScrapResult(data)
      load(1); setPage(1)
    } catch (e: any) {
      setScrapError(e.message)
    } finally {
      setScraping(false)
    }
  }

  const aniosDisponibles = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i)
  const totalPages = Math.ceil(total / 50)

  return (
    <div style={{ padding: '2.5rem 3rem' }}>
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.4rem' }}>Fuentes oficiales</div>
        <h1 className="serif" style={{ fontSize: '2.2rem', fontWeight: 300, color: 'var(--text-0)' }}>Exámenes Oficiales</h1>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', marginTop: '0.4rem' }}>
          Resoluciones de pruebas selectivas publicadas en el BOE. Solo fuentes oficiales.
        </p>
      </div>

      {/* Panel de scraping histórico */}
      <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-300)', marginBottom: '1rem' }}>
          📥 Scraping histórico BOE — resoluciones de pruebas selectivas
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.75rem', flexWrap: 'wrap' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-3)' }}>
            Desde
            <input type="date" value={desde} max={hasta} onChange={e => setDesde(e.target.value)}
              style={{ background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', padding: '7px 10px', color: 'var(--text-0)', fontSize: '12px' }} />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-3)' }}>
            Hasta
            <input type="date" value={hasta} min={desde} max={hoyISO} onChange={e => setHasta(e.target.value)}
              style={{ background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', padding: '7px 10px', color: 'var(--text-0)', fontSize: '12px' }} />
          </label>
          <button onClick={ejecutarScraping} disabled={scraping || !desde || !hasta}
            style={{ background: scraping ? 'rgba(77,159,212,0.1)' : '#4d9fd4', color: scraping ? '#4d9fd4' : '#fff', border: `0.5px solid ${scraping ? 'rgba(77,159,212,0.4)' : '#4d9fd4'}`, borderRadius: '8px', padding: '8px 18px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', opacity: scraping ? 0.7 : 1 }}>
            {scraping ? '⏳ Scrapeando BOE…' : '📡 Scrapear rango'}
          </button>
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '0.6rem' }}>
          ⚠ Máximo 6 meses por petición · Solo días laborables · ~300 ms/día
        </div>
        {scrapResult && (
          <div style={{ marginTop: '1rem', background: 'rgba(77,184,122,0.08)', border: '0.5px solid rgba(77,184,122,0.2)', borderRadius: '8px', padding: '0.8rem 1rem', fontSize: '12px', color: '#4db87a' }}>
            ✓ Completado — {scrapResult.procesadas} días procesados · {scrapResult.encontradas} resoluciones encontradas · {scrapResult.insertadas} nuevas insertadas
          </div>
        )}
        {scrapError && (
          <div style={{ marginTop: '1rem', background: 'rgba(224,0,85,0.08)', border: '0.5px solid rgba(224,0,85,0.2)', borderRadius: '8px', padding: '0.8rem 1rem', fontSize: '12px', color: '#e05' }}>
            ✗ {scrapError}
          </div>
        )}
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total resoluciones', value: total },
          { label: 'Sin procesar IA', value: items.filter(i => !i.procesado).length },
          { label: 'Con PDF', value: items.filter(i => !!i.url_pdf).length },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.5rem' }}>
            <div className="serif" style={{ fontSize: '1.6rem', fontWeight: 300, color: 'var(--gold-100)' }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros tabla */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="Buscar en título…" value={q} onChange={e => setQ(e.target.value)}
          style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', padding: '6px 12px', color: 'var(--text-0)', fontSize: '12px', flex: 1, minWidth: '200px' }} />
        <select value={anio} onChange={e => setAnio(e.target.value)}
          style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', padding: '6px 10px', color: 'var(--text-0)', fontSize: '12px' }}>
          <option value="">Todos los años</option>
          {aniosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        {(q || anio) && (
          <button onClick={() => { setQ(''); setAnio('') }}
            style={{ fontSize: '11px', color: 'var(--text-3)', background: 'transparent', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: '8px', padding: '5px 10px', cursor: 'pointer' }}>
            ✕ Limpiar
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '11px', color: 'var(--text-3)' }}>{total} resoluciones</span>
      </div>

      {/* Tabla */}
      <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: '2rem', color: 'var(--text-3)', textAlign: 'center' }}>Cargando…</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--gold-border)' }}>
                {['Título / Organismo', 'Año', 'Plazas', 'Grupo', 'Fecha BOE', 'Estado', 'PDF'].map(h => (
                  <th key={h} style={{ padding: '0.65rem 1.25rem', textAlign: 'left', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} style={{ borderBottom: '0.5px solid rgba(62,59,53,0.2)' }}>
                  <td style={{ padding: '0.8rem 1.25rem', maxWidth: '380px' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-0)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.titulo}</div>
                    {item.organismo && <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>{item.organismo}</div>}
                  </td>
                  <td style={{ padding: '0.8rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-2)' }}>{item.anio_convocatoria ?? '—'}</td>
                  <td style={{ padding: '0.8rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-2)' }}>{item.num_plazas ?? '—'}</td>
                  <td style={{ padding: '0.8rem 1.25rem' }}>
                    {item.grupo ? (
                      <span style={{ fontSize: '9px', padding: '2px 6px', borderRadius: '5px', background: 'rgba(201,160,67,0.1)', color: 'var(--gold-200)', fontWeight: 700 }}>{item.grupo}</span>
                    ) : '—'}
                  </td>
                  <td style={{ padding: '0.8rem 1.25rem', fontSize: '0.8rem', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                    {item.fecha_publicacion ? new Date(item.fecha_publicacion).toLocaleDateString('es-ES') : '—'}
                  </td>
                  <td style={{ padding: '0.8rem 1.25rem' }}>
                    <span style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '5px', background: item.procesado ? 'rgba(77,184,122,0.1)' : 'rgba(224,122,77,0.1)', color: item.procesado ? '#4db87a' : '#e07a4d' }}>
                      {item.procesado ? '✓ Procesado' : 'Pendiente'}
                    </span>
                  </td>
                  <td style={{ padding: '0.8rem 1.25rem' }}>
                    {item.url_pdf ? (
                      <a href={item.url_pdf} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: '10px', color: 'var(--gold-200)', background: 'rgba(201,160,67,0.08)', border: '0.5px solid var(--gold-border)', padding: '3px 8px', borderRadius: '5px', textDecoration: 'none', whiteSpace: 'nowrap' }}>
                        📄 PDF
                      </a>
                    ) : <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>—</span>}
                  </td>
                </tr>
              ))}
              {!items.length && (
                <tr><td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.85rem' }}>
                  Sin resoluciones. Lanza el scraping histórico para poblar esta sección.
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1rem' }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '5px 14px', background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', color: 'var(--text-2)', cursor: 'pointer', fontSize: '12px', opacity: page === 1 ? 0.4 : 1 }}>
            ← Anterior
          </button>
          <span style={{ padding: '5px 12px', fontSize: '12px', color: 'var(--text-3)' }}>{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ padding: '5px 14px', background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', color: 'var(--text-2)', cursor: 'pointer', fontSize: '12px', opacity: page === totalPages ? 0.4 : 1 }}>
            Siguiente →
          </button>
        </div>
      )}
    </div>
  )
}
