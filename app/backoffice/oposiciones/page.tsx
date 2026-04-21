'use client'

import { useEffect, useState } from 'react'

type Oposicion = { id: string; nombre: string; nombre_corto: string; administracion: string; estado: string; plazas_ultima: number; suscriptores_count: number; destacada: boolean; proxima_convocatoria: string }

export default function BackofficeOposiciones() {
  const [oposiciones, setOposiciones] = useState<Oposicion[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [modal, setModal]       = useState<'nueva' | Oposicion | null>(null)
  const [form, setForm]         = useState<Partial<Oposicion & { descripcion: string; categoria: string; comunidad_autonoma: string }>>({})
  const [saving, setSaving]     = useState(false)

  function load() {
    setLoading(true)
    const q = search ? `?q=${encodeURIComponent(search)}` : ''
    fetch(`/api/backoffice/oposiciones${q}`).then(r => r.json()).then(d => { setOposiciones(Array.isArray(d) ? d : []); setLoading(false) })
  }

  useEffect(() => { load() }, [search])

  async function save() {
    setSaving(true)
    const isEdit = modal !== 'nueva' && modal !== null && typeof modal === 'object'
    const method = isEdit ? 'PATCH' : 'POST'
    const body   = isEdit ? { id: (modal as Oposicion).id, ...form } : form
    await fetch('/api/backoffice/oposiciones', { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setModal(null); setSaving(false); load()
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar esta oposición?')) return
    await fetch('/api/backoffice/oposiciones', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  const abrirEditar = (op: Oposicion) => { setForm(op as any); setModal(op) }
  const abrirNueva  = () => { setForm({ estado: 'activa', administracion: 'estatal' }); setModal('nueva') }

  return (
    <div style={{ padding: '2.5rem 3rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.4rem' }}>Catálogo</div>
          <h1 className="serif" style={{ fontSize: '2.2rem', fontWeight: 300, color: 'var(--text-0)' }}>Oposiciones</h1>
        </div>
        <button onClick={abrirNueva} style={{ background: 'var(--gold-200)', color: '#000', border: 'none', borderRadius: 'var(--radius)', padding: '10px 20px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
          + Nueva oposición
        </button>
      </div>

      <div style={{ marginBottom: '1.5rem' }}>
        <input
          className="form-input"
          placeholder="Buscar oposición…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: '380px' }}
        />
      </div>

      <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {loading ? (
          <p style={{ padding: '2rem', color: 'var(--text-3)' }}>Cargando…</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--gold-border)' }}>
                {['Nombre', 'Admin.', 'Plazas', 'Suscriptores', 'Estado', 'Acciones'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {oposiciones.map(op => (
                <tr key={op.id} style={{ borderBottom: '0.5px solid rgba(62,59,53,0.3)', transition: 'background 0.15s' }}>
                  <td style={{ padding: '0.9rem 1.5rem' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-0)' }}>{op.nombre_corto ?? op.nombre}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px', maxWidth: '320px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{op.nombre}</div>
                  </td>
                  <td style={{ padding: '0.9rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-2)', textTransform: 'capitalize' }}>{op.administracion}</td>
                  <td style={{ padding: '0.9rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-1)' }}>{op.plazas_ultima ?? '—'}</td>
                  <td style={{ padding: '0.9rem 1.5rem' }}>
                    <span style={{ fontSize: '0.85rem', color: 'var(--gold-100)', fontWeight: 600 }}>{op.suscriptores_count ?? 0}</span>
                  </td>
                  <td style={{ padding: '0.9rem 1.5rem' }}>
                    <span style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '6px', background: op.estado === 'en_convocatoria' ? 'rgba(77,184,122,0.1)' : op.estado === 'activa' ? 'rgba(201,160,67,0.1)' : 'rgba(255,255,255,0.05)', color: op.estado === 'en_convocatoria' ? '#4db87a' : op.estado === 'activa' ? 'var(--gold-200)' : 'var(--text-3)' }}>
                      {op.estado}
                    </span>
                  </td>
                  <td style={{ padding: '0.9rem 1.5rem' }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => abrirEditar(op)} style={{ background: 'rgba(201,160,67,0.1)', border: '0.5px solid var(--gold-border)', color: 'var(--gold-200)', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>Editar</button>
                      <button onClick={() => eliminar(op.id)} style={{ background: 'rgba(224,80,80,0.08)', border: '0.5px solid rgba(224,80,80,0.2)', color: '#e05', padding: '4px 10px', borderRadius: '6px', fontSize: '11px', cursor: 'pointer' }}>Eliminar</button>
                    </div>
                  </td>
                </tr>
              ))}
              {!oposiciones.length && (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.85rem' }}>Sin oposiciones. Crea la primera.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal !== null && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }} onClick={e => { if (e.target === e.currentTarget) setModal(null) }}>
          <div style={{ background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '2rem', width: '100%', maxWidth: '600px', maxHeight: '85vh', overflowY: 'auto' }}>
            <h2 className="serif" style={{ fontSize: '1.6rem', fontWeight: 300, marginBottom: '1.5rem' }}>{modal === 'nueva' ? 'Nueva oposición' : 'Editar oposición'}</h2>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              {[
                { key: 'nombre', label: 'Nombre completo', full: true },
                { key: 'nombre_corto', label: 'Nombre corto' },
                { key: 'categoria', label: 'Categoría' },
                { key: 'cuerpo', label: 'Cuerpo / Escala' },
                { key: 'plazas_ultima', label: 'Plazas (última conv.)', type: 'number' },
                { key: 'proxima_convocatoria', label: 'Próxima convocatoria', type: 'date' },
                { key: 'boe_url', label: 'URL BOE', full: true },
              ].map(f => (
                <div key={f.key} className="form-group" style={f.full ? { gridColumn: '1 / -1' } : {}}>
                  <label className="form-label">{f.label}</label>
                  <input type={f.type ?? 'text'} className="form-input" value={(form as any)[f.key] ?? ''} onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
                </div>
              ))}
              <div className="form-group">
                <label className="form-label">Administración</label>
                <select className="form-input" value={form.administracion ?? 'estatal'} onChange={e => setForm(f => ({ ...f, administracion: e.target.value }))}>
                  <option value="estatal">Estatal</option>
                  <option value="autonomica">Autonómica</option>
                  <option value="local">Local</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Estado</label>
                <select className="form-input" value={form.estado ?? 'activa'} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
                  <option value="activa">Activa</option>
                  <option value="en_convocatoria">En convocatoria</option>
                  <option value="inactiva">Inactiva</option>
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <input type="checkbox" id="destacada" checked={!!form.destacada} onChange={e => setForm(f => ({ ...f, destacada: e.target.checked }))} />
                <label htmlFor="destacada" className="form-label" style={{ margin: 0 }}>Oposición destacada (aparece primero)</label>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setModal(null)} style={{ background: 'transparent', border: '0.5px solid var(--gold-border)', color: 'var(--text-2)', padding: '10px 20px', borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: '13px' }}>Cancelar</button>
              <button onClick={save} disabled={saving} style={{ background: 'var(--gold-200)', color: '#000', border: 'none', borderRadius: 'var(--radius)', padding: '10px 24px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
