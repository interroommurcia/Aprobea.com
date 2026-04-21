'use client'

import { useEffect, useState, useCallback } from 'react'

type Pregunta = {
  id: string
  enunciado: string
  tipo: string
  dificultad: number
  activa: boolean
  fuente: string
  oposicion_id: string | null
  tema_id: string | null
  respuesta_correcta: string
  opciones: any
  oposiciones: { nombre_corto: string } | null
}

const difLabel = ['', '⭐', '⭐⭐', '⭐⭐⭐', '⭐⭐⭐⭐', '⭐⭐⭐⭐⭐']
const tipoColor: Record<string, string> = { test: '#4db87a', verdadero_falso: '#4d9fd4', desarrollo: '#e07a4d' }

const EMPTY_FORM = { enunciado: '', tipo: 'test', opciones: '', respuesta_correcta: '', dificultad: 3, explicacion: '', fuente: 'admin', oposicion_id: '', tema_id: '' }

export default function BancoPreguntasPage() {
  const [items, setItems]     = useState<Pregunta[]>([])
  const [total, setTotal]     = useState(0)
  const [loading, setLoading] = useState(true)
  const [page, setPage]       = useState(1)
  const [search, setSearch]   = useState('')
  const [form, setForm]       = useState(EMPTY_FORM)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving]   = useState(false)
  const [oposiciones, setOposiciones] = useState<any[]>([])

  const load = useCallback(() => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page) })
    if (search) params.set('q', search)
    fetch(`/api/backoffice/preguntas?${params}`)
      .then(r => r.ok ? r.json() : { items: [], total: 0 })
      .then(d => { setItems(d.items ?? []); setTotal(d.total ?? 0); setLoading(false) })
  }, [page, search])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    fetch('/api/backoffice/oposiciones').then(r => r.ok ? r.json() : []).then(d => setOposiciones(Array.isArray(d) ? d : []))
  }, [])

  async function guardar() {
    setSaving(true)
    let opcionesJson: any = null
    if (form.tipo === 'test' && form.opciones.trim()) {
      try { opcionesJson = JSON.parse(form.opciones) } catch { opcionesJson = form.opciones.split('\n').filter(Boolean).map((t, i) => ({ letra: String.fromCharCode(65 + i), texto: t.trim() })) }
    }
    const body = { ...form, opciones: opcionesJson, dificultad: Number(form.dificultad), oposicion_id: form.oposicion_id || null, tema_id: form.tema_id || null }
    const res = await fetch('/api/backoffice/preguntas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    if (res.ok) { setShowForm(false); setForm(EMPTY_FORM); load() }
    else { const e = await res.json(); alert(e.error) }
    setSaving(false)
  }

  async function toggleActiva(p: Pregunta) {
    await fetch('/api/backoffice/preguntas', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: p.id, activa: !p.activa }) })
    setItems(prev => prev.map(x => x.id === p.id ? { ...x, activa: !x.activa } : x))
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar esta pregunta?')) return
    await fetch(`/api/backoffice/preguntas?id=${id}`, { method: 'DELETE' })
    setItems(prev => prev.filter(x => x.id !== id))
    setTotal(t => t - 1)
  }

  const totalPages = Math.ceil(total / 30)

  return (
    <div style={{ padding: '2.5rem 3rem' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.4rem' }}>Gestión de contenido</div>
          <h1 className="serif" style={{ fontSize: '2.2rem', fontWeight: 300, color: 'var(--text-0)' }}>Banco de Preguntas</h1>
          <div style={{ fontSize: '12px', color: 'var(--text-3)', marginTop: '4px' }}>{total.toLocaleString('es-ES')} preguntas en total</div>
        </div>
        <button onClick={() => setShowForm(s => !s)} style={{ background: 'var(--gold-200)', color: 'var(--bg-0)', border: 'none', borderRadius: 'var(--radius)', padding: '10px 20px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
          {showForm ? '✕ Cancelar' : '+ Nueva pregunta'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem 2rem', marginBottom: '2rem' }}>
          <h3 style={{ margin: '0 0 1.25rem', color: 'var(--text-0)', fontSize: '1rem', fontWeight: 600 }}>Nueva pregunta</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Enunciado *</label>
              <textarea value={form.enunciado} onChange={e => setForm(f => ({ ...f, enunciado: e.target.value }))} rows={3}
                style={{ width: '100%', background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius)', color: 'var(--text-0)', padding: '8px 12px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Tipo</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}
                style={{ width: '100%', background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius)', color: 'var(--text-0)', padding: '8px 12px', fontSize: '13px' }}>
                <option value="test">Test (múltiple)</option>
                <option value="verdadero_falso">Verdadero / Falso</option>
                <option value="desarrollo">Desarrollo</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Dificultad (1-5)</label>
              <input type="number" min={1} max={5} value={form.dificultad} onChange={e => setForm(f => ({ ...f, dificultad: Number(e.target.value) }))}
                style={{ width: '100%', background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius)', color: 'var(--text-0)', padding: '8px 12px', fontSize: '13px' }} />
            </div>
            {form.tipo === 'test' && (
              <div style={{ gridColumn: '1/-1' }}>
                <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Opciones (una por línea: A, B, C, D…)</label>
                <textarea value={form.opciones} onChange={e => setForm(f => ({ ...f, opciones: e.target.value }))} rows={4}
                  style={{ width: '100%', background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius)', color: 'var(--text-0)', padding: '8px 12px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>
            )}
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Respuesta correcta *</label>
              <input value={form.respuesta_correcta} onChange={e => setForm(f => ({ ...f, respuesta_correcta: e.target.value }))}
                style={{ width: '100%', background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius)', color: 'var(--text-0)', padding: '8px 12px', fontSize: '13px' }} />
            </div>
            <div>
              <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Oposición</label>
              <select value={form.oposicion_id} onChange={e => setForm(f => ({ ...f, oposicion_id: e.target.value }))}
                style={{ width: '100%', background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius)', color: 'var(--text-0)', padding: '8px 12px', fontSize: '13px' }}>
                <option value="">— Sin oposición —</option>
                {oposiciones.map((o: any) => <option key={o.id} value={o.id}>{o.nombre_corto || o.nombre}</option>)}
              </select>
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Explicación (opcional)</label>
              <textarea value={form.explicacion} onChange={e => setForm(f => ({ ...f, explicacion: e.target.value }))} rows={2}
                style={{ width: '100%', background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius)', color: 'var(--text-0)', padding: '8px 12px', fontSize: '13px', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
            <button onClick={guardar} disabled={saving} style={{ background: 'var(--gold-200)', color: 'var(--bg-0)', border: 'none', borderRadius: 'var(--radius)', padding: '9px 20px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Guardando…' : 'Guardar pregunta'}
            </button>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM) }} style={{ background: 'transparent', color: 'var(--text-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius)', padding: '9px 18px', fontSize: '13px', cursor: 'pointer' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Buscador */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem' }}>
        <input
          value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
          placeholder="Buscar por enunciado…"
          style={{ flex: 1, background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius)', color: 'var(--text-0)', padding: '8px 14px', fontSize: '13px' }}
        />
      </div>

      {/* Tabla */}
      {loading ? (
        <p style={{ color: 'var(--text-2)', fontSize: '14px' }}>Cargando preguntas…</p>
      ) : (
        <>
          <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead>
                <tr style={{ background: 'var(--bg-3)', borderBottom: '0.5px solid var(--gold-border)' }}>
                  {['Enunciado', 'Tipo', 'Dif.', 'Oposición', 'Activa', ''].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 600, fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>No hay preguntas</td></tr>
                )}
                {items.map(p => (
                  <tr key={p.id} style={{ borderBottom: '0.5px solid var(--gold-border)', opacity: p.activa ? 1 : 0.45 }}>
                    <td style={{ padding: '10px 16px', color: 'var(--text-1)', maxWidth: 420 }}>
                      <span title={p.enunciado}>{p.enunciado.length > 90 ? p.enunciado.slice(0, 90) + '…' : p.enunciado}</span>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <span style={{ background: `${tipoColor[p.tipo] ?? 'var(--text-3)'}22`, color: tipoColor[p.tipo] ?? 'var(--text-3)', borderRadius: 6, padding: '2px 8px', fontSize: '10px', fontWeight: 600 }}>{p.tipo}</span>
                    </td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-2)', fontSize: '11px' }}>{difLabel[p.dificultad] ?? p.dificultad}</td>
                    <td style={{ padding: '10px 16px', color: 'var(--text-2)' }}>{(p.oposiciones as any)?.nombre_corto ?? '—'}</td>
                    <td style={{ padding: '10px 16px' }}>
                      <button onClick={() => toggleActiva(p)} style={{ background: p.activa ? 'rgba(77,184,122,0.15)' : 'rgba(224,122,77,0.1)', color: p.activa ? '#4db87a' : '#e07a4d', border: 'none', borderRadius: 6, padding: '3px 10px', fontSize: '10px', fontWeight: 700, cursor: 'pointer' }}>
                        {p.activa ? 'Activa' : 'Inactiva'}
                      </button>
                    </td>
                    <td style={{ padding: '10px 16px' }}>
                      <button onClick={() => eliminar(p.id)} style={{ background: 'transparent', color: 'var(--text-3)', border: 'none', cursor: 'pointer', fontSize: '14px' }} title="Eliminar">🗑</button>
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
