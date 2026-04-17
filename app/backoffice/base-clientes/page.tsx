'use client'

import { useState, useEffect, useRef } from 'react'

type Cliente = {
  id: string
  nombre: string | null
  apellidos: string | null
  email: string | null
  telefono: string | null
  empresa: string | null
  ciudad: string | null
  notas: string | null
  created_at: string
}

export default function BaseClientesPage() {
  const [clientes, setClientes]     = useState<Cliente[]>([])
  const [loading, setLoading]       = useState(true)
  const [uploading, setUploading]   = useState(false)
  const [search, setSearch]         = useState('')
  const [searchDebounced, setSearchDebounced] = useState('')
  const [uploadMsg, setUploadMsg]   = useState('')
  const [replace, setReplace]       = useState(true)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [editForm, setEditForm]     = useState<Partial<Cliente>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  // Debounce del buscador
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(search), 350)
    return () => clearTimeout(t)
  }, [search])

  function load(q?: string) {
    setLoading(true)
    const url = q ? `/api/backoffice/base-clientes?q=${encodeURIComponent(q)}` : '/api/backoffice/base-clientes'
    fetch(url)
      .then(r => r.json())
      .then(d => { setClientes(Array.isArray(d) ? d : []); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { load() }, [])
  useEffect(() => { load(searchDebounced || undefined) }, [searchDebounced])

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true); setUploadMsg('')

    const fd = new FormData()
    fd.append('excel', file)
    fd.append('replace', replace ? 'true' : 'false')

    const res = await fetch('/api/backoffice/base-clientes', { method: 'POST', body: fd })
    const data = await res.json()

    if (res.ok) {
      setUploadMsg(`✓ ${data.count} contactos importados desde "${data.hoja}"`)
      load()
    } else {
      setUploadMsg(`⚠ ${data.error ?? 'Error al importar'}`)
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function deleteCliente(id: string) {
    if (!confirm('¿Eliminar este contacto?')) return
    await fetch('/api/backoffice/base-clientes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setClientes(prev => prev.filter(c => c.id !== id))
  }

  async function deleteAll() {
    if (!confirm(`¿Eliminar TODOS los contactos (${clientes.length})? Esta acción no se puede deshacer.`)) return
    await fetch('/api/backoffice/base-clientes', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ todos: true }),
    })
    setClientes([])
  }

  async function saveEdit() {
    if (!editingId) return
    await fetch('/api/backoffice/base-clientes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingId, ...editForm }),
    })
    setClientes(prev => prev.map(c => c.id === editingId ? { ...c, ...editForm } : c))
    setEditingId(null)
  }

  const filtered = clientes // Ya viene filtrado del servidor

  return (
    <div style={{ padding: '2rem', maxWidth: '1100px' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'flex-start', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div>
          <div className="bo-section-title" style={{ marginBottom: '0.35rem' }}>Base de contactos</div>
          <div style={{ fontSize: '12px', color: 'var(--text-3)' }}>
            {clientes.length} contactos importados · La IA privada puede consultar esta base
          </div>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          {clientes.length > 0 && (
            <button onClick={deleteAll}
              style={{ padding: '7px 14px', borderRadius: '8px', background: 'transparent', border: '0.5px solid #c0392b', color: '#e05656', fontSize: '11px', cursor: 'pointer' }}>
              🗑 Borrar todo
            </button>
          )}
        </div>
      </div>

      {/* ── Upload ─────────────────────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', padding: '1.5rem', marginBottom: '2rem' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-0)', marginBottom: '1rem' }}>
          📂 Importar desde Excel (.xlsx, .xls, .csv)
        </div>

        <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '1rem', lineHeight: 1.7 }}>
          El archivo puede tener cualquier estructura. Se detectan automáticamente columnas como:
          <strong style={{ color: 'var(--text-2)' }}> nombre, apellidos, email, telefono, empresa, ciudad, notas</strong>
          {' '}(o equivalentes en inglés).
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '9px 18px', borderRadius: '10px',
            background: uploading ? 'var(--bg-3)' : 'linear-gradient(135deg,#C9A043,#a07828)',
            color: '#0a0a0a', fontSize: '12px', fontWeight: 700,
            cursor: uploading ? 'wait' : 'pointer', transition: 'all 0.2s',
          }}>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleUpload} style={{ display: 'none' }} disabled={uploading} />
            {uploading ? '⏳ Importando…' : '↑ Seleccionar archivo'}
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12px', color: 'var(--text-2)' }}>
            <input type="checkbox" checked={replace} onChange={e => setReplace(e.target.checked)} />
            Reemplazar base actual
          </label>

          {uploadMsg && (
            <div style={{ fontSize: '11px', color: uploadMsg.startsWith('✓') ? '#6dc86d' : '#e8a020' }}>
              {uploadMsg}
            </div>
          )}
        </div>
      </div>

      {/* ── Buscador ────────────────────────────────────────────────────────── */}
      {clientes.length > 0 && (
        <div style={{ marginBottom: '1.25rem' }}>
          <input
            className="bo-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍 Buscar por nombre, email, teléfono, empresa…"
            style={{ maxWidth: '420px' }}
          />
        </div>
      )}

      {/* ── Tabla ───────────────────────────────────────────────────────────── */}
      {loading ? (
        <div style={{ color: 'var(--text-3)', fontSize: '13px', padding: '2rem 0' }}>Cargando…</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-3)' }}>
          <div style={{ fontSize: '32px', marginBottom: '1rem' }}>📁</div>
          <div style={{ fontSize: '14px', marginBottom: '0.5rem' }}>No hay contactos importados</div>
          <div style={{ fontSize: '12px' }}>Sube un archivo Excel para comenzar</div>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--gold-border)' }}>
                {['Nombre', 'Email', 'Teléfono', 'Empresa', 'Ciudad', 'Notas', ''].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 600 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.04)', transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>

                  {editingId === c.id ? (
                    // Fila de edición
                    <>
                      {(['nombre', 'email', 'telefono', 'empresa', 'ciudad', 'notas'] as const).map(field => (
                        <td key={field} style={{ padding: '6px 8px' }}>
                          <input
                            className="bo-input"
                            style={{ fontSize: '11px', padding: '4px 8px' }}
                            value={(editForm as any)[field] ?? c[field] ?? ''}
                            onChange={e => setEditForm(f => ({ ...f, [field]: e.target.value }))}
                          />
                        </td>
                      ))}
                      <td style={{ padding: '6px 8px', whiteSpace: 'nowrap' }}>
                        <button onClick={saveEdit} style={{ background: 'var(--gold-200)', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', color: '#0a0a0a', marginRight: '6px' }}>✓</button>
                        <button onClick={() => setEditingId(null)} style={{ background: 'var(--bg-3)', border: 'none', borderRadius: '6px', padding: '4px 10px', fontSize: '11px', cursor: 'pointer', color: 'var(--text-2)' }}>✕</button>
                      </td>
                    </>
                  ) : (
                    // Fila normal
                    <>
                      <td style={{ padding: '8px 12px', color: 'var(--text-0)', fontWeight: 500 }}>
                        {[c.nombre, c.apellidos].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-2)' }}>{c.email || '—'}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-2)' }}>{c.telefono || '—'}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-2)' }}>{c.empresa || '—'}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-2)' }}>{c.ciudad || '—'}</td>
                      <td style={{ padding: '8px 12px', color: 'var(--text-3)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.notas || '—'}
                      </td>
                      <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>
                        <button
                          onClick={() => { setEditingId(c.id); setEditForm({}) }}
                          style={{ background: 'none', border: 'none', color: 'var(--gold-200)', cursor: 'pointer', fontSize: '12px', marginRight: '8px' }}
                          title="Editar"
                        >✏️</button>
                        <button
                          onClick={() => deleteCliente(c.id)}
                          style={{ background: 'none', border: 'none', color: '#e05656', cursor: 'pointer', fontSize: '12px' }}
                          title="Eliminar"
                        >🗑</button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
