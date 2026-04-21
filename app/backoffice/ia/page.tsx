'use client'

import { useEffect, useState } from 'react'

type Doc = { id: string; nombre: string; created_at: string }
type Stats = {
  total_llamadas: number
  coste_mes: number
  cache_hits: number
  tokens_in: number
  tokens_out: number
  por_modelo: Record<string, { llamadas: number; coste: number }>
}

export default function IAAsistentePage() {
  const [protocolo, setProtocolo]   = useState('')
  const [docs, setDocs]             = useState<Doc[]>([])
  const [stats, setStats]           = useState<Stats | null>(null)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoContenido, setNuevoContenido] = useState('')
  const [addingDoc, setAddingDoc]   = useState(false)
  const [savingDoc, setSavingDoc]   = useState(false)

  useEffect(() => {
    Promise.all([
      fetch('/api/backoffice/config').then(r => r.ok ? r.json() : null),
      fetch('/api/backoffice/ia').then(r => r.ok ? r.json() : { documentos: [], stats: null }),
    ]).then(([cfg, ia]) => {
      setProtocolo((cfg as any)?.ia_protocolo ?? '')
      setDocs(ia.documentos ?? [])
      setStats(ia.stats ?? null)
      setLoading(false)
    })
  }, [])

  async function guardarProtocolo() {
    setSaving(true)
    const res = await fetch('/api/backoffice/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ia_protocolo: protocolo }),
    })
    setSaving(false)
    if (!res.ok) { const e = await res.json(); alert(e.error) }
    else alert('Protocolo guardado correctamente')
  }

  async function agregarDoc() {
    if (!nuevoNombre.trim() || !nuevoContenido.trim()) return
    setSavingDoc(true)
    const res = await fetch('/api/backoffice/ia', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nuevoNombre.trim(), contenido: nuevoContenido.trim() }),
    })
    if (res.ok) {
      const d = await res.json()
      setDocs(prev => [d, ...prev])
      setNuevoNombre(''); setNuevoContenido(''); setAddingDoc(false)
    } else { const e = await res.json(); alert(e.error) }
    setSavingDoc(false)
  }

  async function eliminarDoc(id: string) {
    if (!confirm('¿Eliminar este documento?')) return
    await fetch(`/api/backoffice/ia?id=${id}`, { method: 'DELETE' })
    setDocs(prev => prev.filter(d => d.id !== id))
  }

  if (loading) return <div style={{ padding: '3rem', color: 'var(--text-2)' }}>Cargando…</div>

  return (
    <div style={{ padding: '2.5rem 3rem', maxWidth: 900 }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.4rem' }}>Configuración del asistente</div>
        <h1 className="serif" style={{ fontSize: '2.2rem', fontWeight: 300, color: 'var(--text-0)' }}>IA Asistente</h1>
      </div>

      {/* Stats del mes */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
          {[
            { label: 'Llamadas este mes', value: stats.total_llamadas },
            { label: 'Coste mes (€)', value: stats.coste_mes.toFixed(4), color: '#e07a4d' },
            { label: 'Cache hits', value: `${stats.cache_hits} / ${stats.total_llamadas}`, color: '#4db87a' },
            { label: 'Tokens totales', value: (stats.tokens_in + stats.tokens_out).toLocaleString('es-ES') },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.5rem' }}>
              <div className="serif" style={{ fontSize: '1.4rem', fontWeight: 300, color: (s as any).color ?? 'var(--gold-100)' }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {stats && Object.keys(stats.por_modelo).length > 0 && (
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem', marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.1em' }}>Por modelo</div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            {Object.entries(stats.por_modelo).map(([modelo, d]) => (
              <div key={modelo} style={{ fontSize: '12px', color: 'var(--text-1)' }}>
                <span style={{ color: 'var(--gold-200)', fontWeight: 600 }}>{modelo}</span>
                <span style={{ color: 'var(--text-3)', marginLeft: 8 }}>{d.llamadas} llamadas · {d.coste.toFixed(4)} €</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Protocolo IA */}
      <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem 2rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-0)' }}>Protocolo del asistente</h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-3)' }}>Instrucciones de sistema que rigen el comportamiento de la IA.</p>
          </div>
          <button onClick={guardarProtocolo} disabled={saving}
            style={{ background: 'var(--gold-200)', color: 'var(--bg-0)', border: 'none', borderRadius: 'var(--radius)', padding: '8px 18px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', opacity: saving ? 0.6 : 1, whiteSpace: 'nowrap' }}>
            {saving ? 'Guardando…' : 'Guardar protocolo'}
          </button>
        </div>
        <textarea
          value={protocolo}
          onChange={e => setProtocolo(e.target.value)}
          rows={14}
          style={{ width: '100%', background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius)', color: 'var(--text-0)', padding: '12px 14px', fontSize: '12px', fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.6 }}
        />
      </div>

      {/* Documentos de conocimiento */}
      <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem 2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--text-0)' }}>Base de conocimiento</h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--text-3)' }}>Documentos que la IA consulta para responder con precisión ({docs.length} documentos).</p>
          </div>
          <button onClick={() => setAddingDoc(s => !s)}
            style={{ background: addingDoc ? 'transparent' : 'var(--bg-3)', color: addingDoc ? 'var(--text-2)' : 'var(--gold-200)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius)', padding: '7px 14px', fontSize: '12px', cursor: 'pointer' }}>
            {addingDoc ? '✕ Cancelar' : '+ Agregar documento'}
          </button>
        </div>

        {addingDoc && (
          <div style={{ background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius)', padding: '1.25rem', marginBottom: '1rem' }}>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Nombre del documento</label>
              <input value={nuevoNombre} onChange={e => setNuevoNombre(e.target.value)} placeholder="Ej: FAQ precios, Temario AGE…"
                style={{ width: '100%', background: 'var(--bg-0)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius)', color: 'var(--text-0)', padding: '8px 12px', fontSize: '13px', boxSizing: 'border-box' }} />
            </div>
            <div style={{ marginBottom: '0.75rem' }}>
              <label style={{ fontSize: '11px', color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Contenido (texto plano)</label>
              <textarea value={nuevoContenido} onChange={e => setNuevoContenido(e.target.value)} rows={6}
                style={{ width: '100%', background: 'var(--bg-0)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius)', color: 'var(--text-0)', padding: '8px 12px', fontSize: '12px', fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <button onClick={agregarDoc} disabled={savingDoc || !nuevoNombre.trim() || !nuevoContenido.trim()}
              style={{ background: 'var(--gold-200)', color: 'var(--bg-0)', border: 'none', borderRadius: 'var(--radius)', padding: '8px 18px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', opacity: savingDoc ? 0.6 : 1 }}>
              {savingDoc ? 'Guardando…' : 'Agregar documento'}
            </button>
          </div>
        )}

        {docs.length === 0 ? (
          <p style={{ color: 'var(--text-3)', fontSize: '13px', textAlign: 'center', padding: '1.5rem 0' }}>No hay documentos en la base de conocimiento</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {docs.map(doc => (
              <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius)', padding: '10px 14px' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-1)' }}>📄 {doc.nombre}</div>
                  <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: 2 }}>
                    {new Date(doc.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                  </div>
                </div>
                <button onClick={() => eliminarDoc(doc.id)}
                  style={{ background: 'transparent', color: 'var(--text-3)', border: 'none', cursor: 'pointer', fontSize: '14px', padding: '4px 8px' }} title="Eliminar">🗑</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
