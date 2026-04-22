'use client'

import { useEffect, useState } from 'react'

type Oposicion = { id: string; nombre: string; nombre_corto: string }
type Temario = {
  id: string; titulo: string; organismo: string | null; comunidad: string | null
  url_pdf: string | null; url_fuente: string; fecha_vigencia: string | null
  vigente: boolean; ia_procesado_at: string | null
  temas: { numero: number; titulo: string; descripcion?: string }[]
  oposicion_id: string; oposiciones: { nombre: string; nombre_corto: string } | null
}

const FUENTES_SUGERIDAS = [
  { label: 'BOE (boe.es)', prefix: 'https://www.boe.es' },
  { label: 'INAP', prefix: 'https://www.inap.es' },
  { label: 'Ministerio de Hacienda', prefix: 'https://www.hacienda.gob.es' },
  { label: 'CSIF Temarios', prefix: 'https://www.csif.es' },
  { label: 'Función Pública', prefix: 'https://funcionpublica.hacienda.gob.es' },
]

export default function TemariosPage() {
  const [items, setItems]       = useState<Temario[]>([])
  const [opos, setOpos]         = useState<Oposicion[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [expandId, setExpandId] = useState<string | null>(null)

  // Filtros
  const [filtroOpo, setFiltroOpo]         = useState('')
  const [soloVigentes, setSoloVigentes]   = useState(false)
  const [q, setQ]                         = useState('')

  // Form nuevo temario
  const [form, setForm] = useState({
    oposicion_id: '', titulo: '', organismo: '', comunidad: '',
    url_fuente: '', url_pdf: '', fecha_vigencia: '',
  })

  function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (filtroOpo)    params.set('oposicion_id', filtroOpo)
    if (soloVigentes) params.set('vigente', '1')
    if (q)            params.set('q', q)
    fetch(`/api/backoffice/temarios?${params}`)
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => { setItems(d.items ?? []); setLoading(false) })
  }

  function loadOpos() {
    fetch('/api/backoffice/oposiciones')
      .then(r => r.ok ? r.json() : { items: [] })
      .then(d => setOpos(d.items ?? []))
  }

  useEffect(() => { loadOpos() }, [])
  useEffect(() => { load() }, [filtroOpo, soloVigentes, q]) // eslint-disable-line

  async function crearTemario() {
    if (!form.oposicion_id || !form.titulo || !form.url_fuente) {
      alert('Oposición, título y URL fuente son obligatorios'); return
    }
    setSaving(true)
    const res = await fetch('/api/backoffice/temarios', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (!res.ok) { alert(data.error ?? 'Error al guardar'); setSaving(false); return }
    setShowForm(false)
    setForm({ oposicion_id: '', titulo: '', organismo: '', comunidad: '', url_fuente: '', url_pdf: '', fecha_vigencia: '' })
    setSaving(false); load()
  }

  async function toggleVigente(item: Temario) {
    await fetch('/api/backoffice/temarios', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, vigente: !item.vigente }),
    })
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, vigente: !item.vigente } : i))
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este temario?')) return
    await fetch(`/api/backoffice/temarios?id=${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(i => i.id !== id))
  }

  const stats = {
    total: items.length,
    vigentes: items.filter(i => i.vigente).length,
    conTemas: items.filter(i => i.temas?.length > 0).length,
  }

  return (
    <div style={{ padding: '2.5rem 3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.4rem' }}>Fuentes oficiales</div>
          <h1 className="serif" style={{ fontSize: '2.2rem', fontWeight: 300, color: 'var(--text-0)' }}>Temarios</h1>
          <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', marginTop: '0.4rem' }}>
            Solo fuentes oficiales (BOE, ministerios, organismos). Los temas alimentan el banco de preguntas.
          </p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{ background: showForm ? 'transparent' : 'rgba(201,160,67,0.12)', color: 'var(--gold-100)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius)', padding: '10px 18px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
          {showForm ? '✕ Cancelar' : '+ Añadir temario'}
        </button>
      </div>

      {/* Formulario nuevo temario */}
      {showForm && (
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-300)', marginBottom: '1rem' }}>Nuevo temario oficial</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-3)' }}>
              Oposición *
              <select value={form.oposicion_id} onChange={e => setForm(f => ({ ...f, oposicion_id: e.target.value }))}
                style={{ background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', padding: '7px 10px', color: 'var(--text-0)', fontSize: '12px' }}>
                <option value="">— Selecciona —</option>
                {opos.map(o => <option key={o.id} value={o.id}>{o.nombre_corto || o.nombre}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-3)', gridColumn: 'span 2' }}>
              Título del temario *
              <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))}
                placeholder="Ej: Temario oficial Cuerpo Gestión AGE 2024"
                style={{ background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', padding: '7px 10px', color: 'var(--text-0)', fontSize: '12px' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-3)' }}>
              Organismo que publica
              <input value={form.organismo} onChange={e => setForm(f => ({ ...f, organismo: e.target.value }))}
                placeholder="Ej: Ministerio de Hacienda"
                style={{ background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', padding: '7px 10px', color: 'var(--text-0)', fontSize: '12px' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-3)' }}>
              Comunidad autónoma (si aplica)
              <input value={form.comunidad} onChange={e => setForm(f => ({ ...f, comunidad: e.target.value }))}
                placeholder="Ej: estatal, madrid, andalucia…"
                style={{ background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', padding: '7px 10px', color: 'var(--text-0)', fontSize: '12px' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-3)' }}>
              Fecha de vigencia
              <input type="date" value={form.fecha_vigencia} onChange={e => setForm(f => ({ ...f, fecha_vigencia: e.target.value }))}
                style={{ background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', padding: '7px 10px', color: 'var(--text-0)', fontSize: '12px' }} />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-3)', gridColumn: 'span 2' }}>
              URL fuente oficial * (BOE, ministerio, organismo)
              <input value={form.url_fuente} onChange={e => setForm(f => ({ ...f, url_fuente: e.target.value }))}
                placeholder="https://www.boe.es/boe/dias/…"
                style={{ background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', padding: '7px 10px', color: 'var(--text-0)', fontSize: '12px' }} />
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                {FUENTES_SUGERIDAS.map(f => (
                  <button key={f.label} type="button" onClick={() => setForm(prev => ({ ...prev, url_fuente: f.prefix }))}
                    style={{ fontSize: '9px', padding: '2px 7px', background: 'rgba(201,160,67,0.06)', border: '0.5px solid var(--gold-border)', borderRadius: '5px', color: 'var(--text-3)', cursor: 'pointer' }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--text-3)', gridColumn: 'span 2' }}>
              URL directa al PDF (si está disponible)
              <input value={form.url_pdf} onChange={e => setForm(f => ({ ...f, url_pdf: e.target.value }))}
                placeholder="https://www.boe.es/boe/dias/…/A12345-12350.pdf"
                style={{ background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', padding: '7px 10px', color: 'var(--text-0)', fontSize: '12px' }} />
            </label>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
            <button onClick={crearTemario} disabled={saving}
              style={{ background: 'rgba(201,160,67,0.12)', color: 'var(--gold-100)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', padding: '8px 20px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Guardando…' : '✓ Guardar temario'}
            </button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Temarios registrados', value: stats.total },
          { label: 'Vigentes', value: stats.vigentes },
          { label: 'Con temas extraídos', value: stats.conTemas },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.5rem' }}>
            <div className="serif" style={{ fontSize: '1.6rem', fontWeight: 300, color: 'var(--gold-100)' }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="Buscar por título…" value={q} onChange={e => setQ(e.target.value)}
          style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', padding: '6px 12px', color: 'var(--text-0)', fontSize: '12px', flex: 1, minWidth: '180px' }} />
        <select value={filtroOpo} onChange={e => setFiltroOpo(e.target.value)}
          style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', padding: '6px 10px', color: 'var(--text-0)', fontSize: '12px' }}>
          <option value="">Todas las oposiciones</option>
          {opos.map(o => <option key={o.id} value={o.id}>{o.nombre_corto || o.nombre}</option>)}
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: 'var(--text-3)', cursor: 'pointer' }}>
          <input type="checkbox" checked={soloVigentes} onChange={e => setSoloVigentes(e.target.checked)} />
          Solo vigentes
        </label>
      </div>

      {/* Tabla */}
      <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: '2rem', color: 'var(--text-3)', textAlign: 'center' }}>Cargando…</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--gold-border)' }}>
                {['Temario', 'Oposición', 'Organismo', 'Vigencia', 'Temas', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '0.65rem 1.25rem', textAlign: 'left', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <>
                  <tr key={item.id} style={{ borderBottom: expandId === item.id ? 'none' : '0.5px solid rgba(62,59,53,0.2)', background: expandId === item.id ? 'rgba(201,160,67,0.03)' : 'transparent' }}>
                    <td style={{ padding: '0.8rem 1.25rem', maxWidth: '300px' }}>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-0)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.titulo}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>
                        {item.comunidad && <span style={{ marginRight: '6px' }}>🌍 {item.comunidad}</span>}
                        {item.ia_procesado_at && <span style={{ color: '#4db87a' }}>✓ IA</span>}
                      </div>
                    </td>
                    <td style={{ padding: '0.8rem 1.25rem', fontSize: '0.78rem', color: 'var(--text-2)' }}>
                      {item.oposiciones?.nombre_corto || item.oposiciones?.nombre || '—'}
                    </td>
                    <td style={{ padding: '0.8rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-3)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.organismo ?? '—'}
                    </td>
                    <td style={{ padding: '0.8rem 1.25rem', fontSize: '0.75rem', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
                      {item.fecha_vigencia ? new Date(item.fecha_vigencia).toLocaleDateString('es-ES') : '—'}
                    </td>
                    <td style={{ padding: '0.8rem 1.25rem' }}>
                      {item.temas?.length > 0 ? (
                        <button onClick={() => setExpandId(expandId === item.id ? null : item.id)}
                          style={{ fontSize: '10px', color: 'var(--gold-200)', background: 'rgba(201,160,67,0.08)', border: '0.5px solid var(--gold-border)', padding: '2px 8px', borderRadius: '5px', cursor: 'pointer' }}>
                          {item.temas.length} temas {expandId === item.id ? '▲' : '▼'}
                        </button>
                      ) : (
                        <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>Sin extraer</span>
                      )}
                    </td>
                    <td style={{ padding: '0.8rem 1.25rem' }}>
                      <button onClick={() => toggleVigente(item)}
                        style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '5px', background: item.vigente ? 'rgba(77,184,122,0.1)' : 'rgba(224,122,77,0.1)', color: item.vigente ? '#4db87a' : '#e07a4d', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                        {item.vigente ? '✓ Vigente' : '✗ Desfasado'}
                      </button>
                    </td>
                    <td style={{ padding: '0.8rem 1.25rem' }}>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <a href={item.url_fuente} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: '10px', color: 'var(--gold-200)', background: 'rgba(201,160,67,0.08)', border: '0.5px solid var(--gold-border)', padding: '3px 7px', borderRadius: '5px', textDecoration: 'none' }}>
                          🔗 Fuente
                        </a>
                        {item.url_pdf && (
                          <a href={item.url_pdf} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: '10px', color: '#4d9fd4', background: 'rgba(77,159,212,0.08)', border: '0.5px solid rgba(77,159,212,0.2)', padding: '3px 7px', borderRadius: '5px', textDecoration: 'none' }}>
                            📄 PDF
                          </a>
                        )}
                        <button onClick={() => eliminar(item.id)}
                          style={{ fontSize: '10px', color: '#e05', background: 'rgba(224,0,85,0.06)', border: '0.5px solid rgba(224,0,85,0.15)', padding: '3px 7px', borderRadius: '5px', cursor: 'pointer' }}>
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandId === item.id && item.temas?.length > 0 && (
                    <tr key={`${item.id}-temas`} style={{ borderBottom: '0.5px solid rgba(62,59,53,0.2)' }}>
                      <td colSpan={7} style={{ padding: '0 1.25rem 1rem 1.25rem', background: 'rgba(201,160,67,0.02)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '4px', maxHeight: '220px', overflowY: 'auto' }}>
                          {item.temas.map(t => (
                            <div key={t.numero} style={{ fontSize: '11px', color: 'var(--text-2)', padding: '4px 8px', background: 'var(--bg-1)', borderRadius: '5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              <span style={{ color: 'var(--gold-300)', marginRight: '5px', fontWeight: 600 }}>{t.numero}.</span>
                              {t.titulo}
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {!items.length && (
                <tr><td colSpan={7} style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.85rem' }}>
                  Sin temarios registrados. Usa el botón "+ Añadir temario" para empezar.
                </td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
