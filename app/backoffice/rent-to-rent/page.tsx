'use client'

import { useEffect, useState } from 'react'

type RentEntry = {
  id: string
  titulo: string
  descripcion: string
  video_url: string | null
  ubicacion: string | null
  rentabilidad: string | null
  precio_alquiler: number | null
  precio_subarrendamiento: number | null
  activa: boolean
  created_at: string
}

function getEmbedUrl(url: string): string | null {
  if (!url) return null
  // YouTube
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  // Vimeo
  const vm = url.match(/vimeo\.com\/(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`
  return null
}

export default function RentToRentPage() {
  const [entries, setEntries] = useState<RentEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState(false)
  const [error, setError] = useState('')
  const [preview, setPreview] = useState<RentEntry | null>(null)
  const [form, setForm] = useState({
    titulo: '', descripcion: '', video_url: '', ubicacion: '',
    rentabilidad: '', precio_alquiler: '', precio_subarrendamiento: '',
  })

  function load() {
    fetch('/api/backoffice/rent-to-rent')
      .then(r => r.json())
      .then(d => { setEntries(Array.isArray(d) ? d : []); setLoading(false) })
  }

  useEffect(() => { load() }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo) { setError('El título es obligatorio'); return }
    setSaving(true); setError('')
    const res = await fetch('/api/backoffice/rent-to-rent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    if (res.ok) {
      setForm({ titulo: '', descripcion: '', video_url: '', ubicacion: '', rentabilidad: '', precio_alquiler: '', precio_subarrendamiento: '' })
      setOk(true); setTimeout(() => setOk(false), 3000)
      load()
    } else {
      const d = await res.json(); setError(d.error || 'Error')
    }
    setSaving(false)
  }

  async function toggleActiva(e: RentEntry) {
    await fetch('/api/backoffice/rent-to-rent', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: e.id, activa: !e.activa }),
    })
    setEntries(prev => prev.map(x => x.id === e.id ? { ...x, activa: !x.activa } : x))
  }

  async function deleteEntry(e: RentEntry) {
    if (!confirm(`¿Eliminar "${e.titulo}"?`)) return
    await fetch('/api/backoffice/rent-to-rent', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: e.id }),
    })
    setEntries(prev => prev.filter(x => x.id !== e.id))
    if (preview?.id === e.id) setPreview(null)
  }

  const embedUrl = getEmbedUrl(form.video_url)

  return (
    <div style={{ padding: '2.5rem 3rem', maxWidth: '960px' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.5rem' }}>Backoffice</div>
        <h1 className="serif" style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--text-0)' }}>Gestión de Rent to Rent</h1>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', marginTop: '4px' }}>Publica oportunidades de rent to rent con vídeo para tus clientes.</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '2rem', marginBottom: '2.5rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '1.5rem' }}>Nueva entrada</div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: '6px' }}>Título *</label>
            <input value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ej: Piso céntrico en Murcia — R2R con alto rendimiento" style={{ width: '100%', background: 'var(--bg-0)', border: '0.5px solid var(--gold-border)', color: 'var(--text-0)', padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: '0.85rem', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: '6px' }}>Ubicación</label>
            <input value={form.ubicacion} onChange={e => setForm(f => ({ ...f, ubicacion: e.target.value }))} placeholder="Ej: Murcia, Cartagena…" style={{ width: '100%', background: 'var(--bg-0)', border: '0.5px solid var(--gold-border)', color: 'var(--text-0)', padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: '0.85rem', boxSizing: 'border-box' }} />
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: '6px' }}>Descripción</label>
          <textarea value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} rows={3} placeholder="Describe la oportunidad…" style={{ width: '100%', background: 'var(--bg-0)', border: '0.5px solid var(--gold-border)', color: 'var(--text-0)', padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: '0.85rem', resize: 'vertical', boxSizing: 'border-box' }} />
        </div>

        {/* Video URL */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: '6px' }}>URL de vídeo (YouTube o Vimeo)</label>
          <input value={form.video_url} onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))} placeholder="https://www.youtube.com/watch?v=..." style={{ width: '100%', background: 'var(--bg-0)', border: `0.5px solid ${embedUrl ? 'var(--gold-200)' : 'var(--gold-border)'}`, color: 'var(--text-0)', padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: '0.85rem', boxSizing: 'border-box' }} />
          {embedUrl && (
            <div style={{ marginTop: '1rem', borderRadius: 'var(--radius)', overflow: 'hidden', aspectRatio: '16/9', maxWidth: '560px' }}>
              <iframe src={embedUrl} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <label style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: '6px' }}>Rentabilidad estimada</label>
            <input value={form.rentabilidad} onChange={e => setForm(f => ({ ...f, rentabilidad: e.target.value }))} placeholder="Ej: 8-12% anual" style={{ width: '100%', background: 'var(--bg-0)', border: '0.5px solid var(--gold-border)', color: 'var(--text-0)', padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: '0.85rem', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: '6px' }}>Precio alquiler (€/mes)</label>
            <input type="number" value={form.precio_alquiler} onChange={e => setForm(f => ({ ...f, precio_alquiler: e.target.value }))} placeholder="800" style={{ width: '100%', background: 'var(--bg-0)', border: '0.5px solid var(--gold-border)', color: 'var(--text-0)', padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: '0.85rem', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: '6px' }}>Subarrendamiento (€/mes)</label>
            <input type="number" value={form.precio_subarrendamiento} onChange={e => setForm(f => ({ ...f, precio_subarrendamiento: e.target.value }))} placeholder="1.200" style={{ width: '100%', background: 'var(--bg-0)', border: '0.5px solid var(--gold-border)', color: 'var(--text-0)', padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: '0.85rem', boxSizing: 'border-box' }} />
          </div>
        </div>

        {error && <p style={{ fontSize: '0.8rem', color: '#e05', marginBottom: '1rem' }}>{error}</p>}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button type="submit" disabled={saving} style={{ background: 'var(--gold-200)', color: 'var(--bg-0)', border: 'none', padding: '11px 28px', borderRadius: 'var(--radius)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 600 }}>
            {saving ? 'Publicando…' : 'Publicar entrada →'}
          </button>
          {ok && <span style={{ fontSize: '0.78rem', color: '#6dc86d' }}>✓ Entrada publicada</span>}
        </div>
      </form>

      {/* Lista */}
      <div>
        <div style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '1rem' }}>
          {entries.length} entradas · {entries.filter(e => e.activa).length} activas
        </div>
        {loading ? <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Cargando…</p>
          : entries.length === 0 ? <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Aún no hay entradas.</p>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {entries.map(e => (
                <div key={e.id} style={{ background: 'var(--bg-2)', border: `0.5px solid ${e.activa ? 'var(--gold-border)' : 'rgba(62,59,53,0.3)'}`, borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.75rem', opacity: e.activa ? 1 : 0.5 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 500, color: 'var(--text-0)', fontSize: '0.9rem' }}>{e.titulo}</div>
                      <div style={{ display: 'flex', gap: '1rem', marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-3)' }}>
                        {e.ubicacion && <span>📍 {e.ubicacion}</span>}
                        {e.rentabilidad && <span>📈 {e.rentabilidad}</span>}
                        {e.video_url && <span>🎥 Con vídeo</span>}
                        {e.precio_alquiler && e.precio_subarrendamiento && (
                          <span>💰 {e.precio_alquiler}€ → {e.precio_subarrendamiento}€/mes</span>
                        )}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0 }}>
                      <button onClick={() => setPreview(preview?.id === e.id ? null : e)} style={{ fontSize: '10px', color: 'var(--gold-200)', background: 'transparent', border: '0.5px solid var(--gold-border)', padding: '4px 10px', borderRadius: 'var(--radius)', cursor: 'pointer' }}>
                        {preview?.id === e.id ? 'Cerrar' : 'Preview'}
                      </button>
                      <button onClick={() => toggleActiva(e)} style={{ fontSize: '10px', color: e.activa ? '#6dc86d' : 'var(--text-3)', background: 'transparent', border: `0.5px solid ${e.activa ? '#6dc86d' : 'rgba(62,59,53,0.5)'}`, padding: '4px 10px', borderRadius: 'var(--radius)', cursor: 'pointer' }}>
                        {e.activa ? 'Activa' : 'Oculta'}
                      </button>
                      <button onClick={() => deleteEntry(e)} style={{ fontSize: '10px', color: '#e05', background: 'transparent', border: '0.5px solid rgba(238,0,85,0.3)', padding: '4px 10px', borderRadius: 'var(--radius)', cursor: 'pointer' }}>
                        Eliminar
                      </button>
                    </div>
                  </div>
                  {preview?.id === e.id && e.video_url && getEmbedUrl(e.video_url) && (
                    <div style={{ marginTop: '1rem', borderRadius: 'var(--radius)', overflow: 'hidden', aspectRatio: '16/9', maxWidth: '640px' }}>
                      <iframe src={getEmbedUrl(e.video_url)!} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
      </div>
    </div>
  )
}
