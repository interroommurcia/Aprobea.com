'use client'
import { useState } from 'react'

type Section = { h2: string; content: string; highlight: string | null; imagePrompt?: string; image?: string }
type FAQ = { question: string; answer: string }

export type EditableArticle = {
  id: string
  slug: string
  meta_title: string
  meta_description: string
  h1: string
  intro: string
  sections: Section[]
  cta: string
  faq: FAQ[]
}

const BRAND_BANNER: Section = {
  h2: '¿Por qué confiar en Grupo Skyline?',
  content: 'Grupo Skyline lleva más de una década especializándose en la adquisición y gestión de activos inmobiliarios con descuento: embargos, daciones en pago, NPLs y créditos hipotecarios.\n\nNuestro equipo analiza cada operación con criterios estrictos de rentabilidad, seguridad jurídica y potencial de revalorización. Trabajamos con inversores privados que buscan rentabilidades netas superiores a las del mercado convencional.\n\nSi quieres conocer las operaciones activas o recibir análisis personalizados, contacta directamente con nuestro equipo en gruposkyline.es.',
  highlight: 'Grupo Skyline gestiona operaciones con rentabilidades netas medias del 30-45% en plazos de 12 a 24 meses.',
}

const INPUT = { background: 'var(--bg-2)', border: '1px solid var(--gold-border)', borderRadius: 'var(--radius)', color: 'var(--text-0)', padding: '8px 10px', fontSize: '0.82rem', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box' as const }
const LABEL = { fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '4px', display: 'block' }

export function ArticleEditor({ article: initial, onClose, onSaved }: {
  article: EditableArticle
  onClose: () => void
  onSaved: () => void
}) {
  const [art, setArt] = useState<EditableArticle>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function setField<K extends keyof EditableArticle>(key: K, val: EditableArticle[K]) {
    setArt(a => ({ ...a, [key]: val }))
  }

  function setSection(i: number, key: keyof Section, val: string | null) {
    setArt(a => ({ ...a, sections: a.sections.map((s, idx) => idx === i ? { ...s, [key]: val } : s) }))
  }

  function setFaq(i: number, key: keyof FAQ, val: string) {
    setArt(a => ({ ...a, faq: a.faq.map((f, idx) => idx === i ? { ...f, [key]: val } : f) }))
  }

  function addSection() {
    setArt(a => ({ ...a, sections: [...a.sections, { h2: '', content: '', highlight: null }] }))
  }

  function removeSection(i: number) {
    setArt(a => ({ ...a, sections: a.sections.filter((_, idx) => idx !== i) }))
  }

  function addFaq() {
    setArt(a => ({ ...a, faq: [...a.faq, { question: '', answer: '' }] }))
  }

  function removeFaq(i: number) {
    setArt(a => ({ ...a, faq: a.faq.filter((_, idx) => idx !== i) }))
  }

  function addBrandBanner() {
    setArt(a => ({ ...a, sections: [...a.sections, { ...BRAND_BANNER }] }))
  }

  async function save() {
    setSaving(true)
    setError('')
    const res = await fetch('/api/backoffice/articulos', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        id: art.id,
        slug: art.slug,
        meta_title: art.meta_title,
        meta_description: art.meta_description,
        h1: art.h1,
        intro: art.intro,
        sections: art.sections,
        cta: art.cta,
        faq: art.faq,
      }),
    })
    if (!res.ok) {
      const d = await res.json()
      setError(d.error || 'Error guardando')
    } else {
      onSaved()
      onClose()
    }
    setSaving(false)
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '2rem 1rem', overflowY: 'auto' }}>
      <div style={{ background: 'var(--bg-0)', border: '1px solid var(--gold-border)', borderRadius: '16px', width: '100%', maxWidth: '780px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-0)' }}>Editar artículo</h2>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={addBrandBanner} style={{ fontSize: '0.75rem', padding: '6px 12px', border: '1.5px solid var(--gold-border)', borderRadius: '6px', background: 'rgba(201,160,67,0.1)', color: 'var(--gold-100)', cursor: 'pointer', fontWeight: 600 }}>
              + Banner de marca
            </button>
            <button onClick={onClose} style={{ fontSize: '0.75rem', padding: '6px 12px', border: '1px solid var(--gold-border)', borderRadius: '6px', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer' }}>
              Cancelar
            </button>
            <button onClick={save} disabled={saving} style={{ fontSize: '0.75rem', padding: '6px 14px', borderRadius: '6px', background: '#C9A043', color: '#0a0a0a', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>
        </div>

        {error && <div style={{ background: 'rgba(238,0,85,0.08)', border: '1px solid rgba(238,0,85,0.2)', borderRadius: 'var(--radius)', padding: '0.6rem 1rem', fontSize: '0.82rem', color: '#ee0055' }}>{error}</div>}

        {/* SEO */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div>
            <label style={LABEL}>Meta título <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>({art.meta_title.length}/60)</span></label>
            <input style={INPUT} value={art.meta_title} onChange={e => setField('meta_title', e.target.value)} />
          </div>
          <div>
            <label style={LABEL}>Slug</label>
            <input style={INPUT} value={art.slug} onChange={e => setField('slug', e.target.value)} />
          </div>
        </div>
        <div>
          <label style={LABEL}>Meta descripción <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>({art.meta_description.length}/155)</span></label>
          <textarea style={{ ...INPUT, resize: 'vertical' }} rows={2} value={art.meta_description} onChange={e => setField('meta_description', e.target.value)} />
        </div>

        {/* Contenido principal */}
        <div>
          <label style={LABEL}>H1 — Título principal</label>
          <input style={INPUT} value={art.h1} onChange={e => setField('h1', e.target.value)} />
        </div>
        <div>
          <label style={LABEL}>Introducción</label>
          <textarea style={{ ...INPUT, resize: 'vertical' }} rows={4} value={art.intro} onChange={e => setField('intro', e.target.value)} />
        </div>

        {/* Secciones */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <label style={{ ...LABEL, marginBottom: 0 }}>Secciones ({art.sections.length})</label>
            <button onClick={addSection} style={{ fontSize: '0.72rem', padding: '4px 10px', border: '1px solid var(--gold-border)', borderRadius: '6px', background: 'transparent', color: 'var(--gold-200)', cursor: 'pointer' }}>+ Añadir sección</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {art.sections.map((s, i) => (
              <div key={i} style={{ border: '1px solid var(--gold-border)', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', background: 'var(--bg-1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 600 }}>Sección {i + 1}</span>
                  <button onClick={() => removeSection(i)} style={{ fontSize: '0.7rem', color: '#ee0055', background: 'transparent', border: 'none', cursor: 'pointer' }}>✕ Eliminar</button>
                </div>
                <div>
                  <label style={LABEL}>H2</label>
                  <input style={INPUT} value={s.h2} onChange={e => setSection(i, 'h2', e.target.value)} />
                </div>
                <div>
                  <label style={LABEL}>Contenido</label>
                  <textarea style={{ ...INPUT, resize: 'vertical' }} rows={4} value={s.content} onChange={e => setSection(i, 'content', e.target.value)} />
                </div>
                <div>
                  <label style={LABEL}>Destacado (opcional)</label>
                  <input style={INPUT} value={s.highlight ?? ''} onChange={e => setSection(i, 'highlight', e.target.value || null)} placeholder="Dato clave o estadística…" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div>
          <label style={LABEL}>CTA</label>
          <textarea style={{ ...INPUT, resize: 'vertical' }} rows={2} value={art.cta} onChange={e => setField('cta', e.target.value)} />
        </div>

        {/* FAQ */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <label style={{ ...LABEL, marginBottom: 0 }}>FAQ ({art.faq.length})</label>
            <button onClick={addFaq} style={{ fontSize: '0.72rem', padding: '4px 10px', border: '1px solid var(--gold-border)', borderRadius: '6px', background: 'transparent', color: 'var(--gold-200)', cursor: 'pointer' }}>+ Añadir pregunta</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {art.faq.map((f, i) => (
              <div key={i} style={{ border: '1px solid var(--gold-border)', borderRadius: '10px', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', background: 'var(--bg-1)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-3)', fontWeight: 600 }}>Pregunta {i + 1}</span>
                  <button onClick={() => removeFaq(i)} style={{ fontSize: '0.7rem', color: '#ee0055', background: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>
                </div>
                <input style={INPUT} value={f.question} onChange={e => setFaq(i, 'question', e.target.value)} placeholder="Pregunta…" />
                <textarea style={{ ...INPUT, resize: 'vertical' }} rows={2} value={f.answer} onChange={e => setFaq(i, 'answer', e.target.value)} placeholder="Respuesta…" />
              </div>
            ))}
          </div>
        </div>

        {/* Footer save */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '0.5rem', borderTop: '0.5px solid var(--gold-border)' }}>
          <button onClick={onClose} style={{ fontSize: '0.82rem', padding: '9px 18px', border: '1px solid var(--gold-border)', borderRadius: '6px', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={save} disabled={saving} style={{ fontSize: '0.82rem', padding: '9px 20px', borderRadius: '6px', background: '#C9A043', color: '#0a0a0a', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}
