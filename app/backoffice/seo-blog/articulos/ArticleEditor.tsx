'use client'
import { useState } from 'react'
import { ArticlePreview, TEMPLATES, AD_PLACEMENTS, type Template, type AdPlacement } from './ArticlePreview'

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
  keyword?: string | null
  hero_image?: string | null
}

const BRAND_BANNER: Section = {
  h2: '¿Por qué confiar en Grupo Skyline?',
  content: 'Grupo Skyline lleva más de una década especializándose en la adquisición y gestión de activos inmobiliarios con descuento: embargos, daciones en pago, NPLs y créditos hipotecarios.\n\nNuestro equipo analiza cada operación con criterios estrictos de rentabilidad, seguridad jurídica y potencial de revalorización. Trabajamos con inversores privados que buscan rentabilidades netas superiores a las del mercado convencional.\n\nSi quieres conocer las operaciones activas o recibir análisis personalizados, contacta directamente con nuestro equipo en gruposkyline.es.',
  highlight: 'Grupo Skyline gestiona operaciones con rentabilidades netas medias del 30-45% en plazos de 12 a 24 meses.',
}

const INPUT = { background: 'var(--bg-2)', border: '1px solid var(--gold-border)', borderRadius: 'var(--radius)', color: 'var(--text-0)', padding: '7px 10px', fontSize: '0.8rem', width: '100%', fontFamily: 'inherit', boxSizing: 'border-box' as const }
const LABEL = { fontSize: '0.68rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase' as const, letterSpacing: '0.08em', marginBottom: '4px', display: 'block' }
const SECTION_BLOCK = { border: '1px solid var(--gold-border)', borderRadius: '8px', padding: '0.875rem', display: 'flex', flexDirection: 'column' as const, gap: '0.6rem', background: 'var(--bg-1)' }

export function ArticleEditor({ article: initial, onClose, onSaved }: {
  article: EditableArticle
  onClose: () => void
  onSaved: () => void
}) {
  const [art, setArt] = useState<EditableArticle>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [template, setTemplate] = useState<Template>('clasico')
  const [adPlacement, setAdPlacement] = useState<AdPlacement>('ninguno')
  const [activeTab, setActiveTab] = useState<'seo' | 'contenido' | 'diseno'>('contenido')

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

  const tabBtn = (tab: typeof activeTab, label: string) => (
    <button
      onClick={() => setActiveTab(tab)}
      style={{
        fontSize: '0.72rem', fontWeight: 600, padding: '5px 12px', border: 'none', borderRadius: '5px', cursor: 'pointer',
        background: activeTab === tab ? 'var(--gold-100)' : 'transparent',
        color: activeTab === tab ? '#0a0a0a' : 'var(--text-3)',
      }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', flexDirection: 'column', background: 'var(--bg-0)' }}>

      {/* Top bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--gold-border)', background: 'var(--bg-1)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-0)' }}>Editor de artículo</span>
          <div style={{ display: 'flex', gap: '3px', background: 'var(--bg-2)', borderRadius: '7px', padding: '3px' }}>
            {tabBtn('contenido', 'Contenido')}
            {tabBtn('seo', 'SEO')}
            {tabBtn('diseno', 'Diseño & Anuncios')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {error && <span style={{ fontSize: '0.75rem', color: '#ee0055' }}>{error}</span>}
          <button onClick={addBrandBanner} style={{ fontSize: '0.72rem', padding: '6px 10px', border: '1.5px solid var(--gold-border)', borderRadius: '6px', background: 'rgba(201,160,67,0.1)', color: 'var(--gold-100)', cursor: 'pointer', fontWeight: 600 }}>
            + Banner marca
          </button>
          <button onClick={onClose} style={{ fontSize: '0.72rem', padding: '6px 10px', border: '1px solid var(--gold-border)', borderRadius: '6px', background: 'transparent', color: 'var(--text-3)', cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={save} disabled={saving} style={{ fontSize: '0.72rem', padding: '6px 14px', borderRadius: '6px', background: '#C9A043', color: '#0a0a0a', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>

      {/* Split panel */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* LEFT — Editor */}
        <div style={{ width: '420px', flexShrink: 0, overflowY: 'auto', borderRight: '1px solid var(--gold-border)', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* TAB: SEO */}
          {activeTab === 'seo' && (
            <>
              <div>
                <label style={LABEL}>Meta título <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>({art.meta_title.length}/60)</span></label>
                <input style={INPUT} value={art.meta_title} onChange={e => setField('meta_title', e.target.value)} />
              </div>
              <div>
                <label style={LABEL}>Slug</label>
                <input style={INPUT} value={art.slug} onChange={e => setField('slug', e.target.value)} />
              </div>
              <div>
                <label style={LABEL}>Meta descripción <span style={{ fontWeight: 400, color: 'var(--text-3)' }}>({art.meta_description.length}/155)</span></label>
                <textarea style={{ ...INPUT, resize: 'vertical' }} rows={3} value={art.meta_description} onChange={e => setField('meta_description', e.target.value)} />
              </div>
              <div>
                <label style={LABEL}>Keyword / Categoría</label>
                <input style={INPUT} value={art.keyword ?? ''} onChange={e => setField('keyword', e.target.value || null)} />
              </div>
            </>
          )}

          {/* TAB: Contenido */}
          {activeTab === 'contenido' && (
            <>
              <div>
                <label style={LABEL}>H1 — Título principal</label>
                <input style={INPUT} value={art.h1} onChange={e => setField('h1', e.target.value)} />
              </div>
              <div>
                <label style={LABEL}>Introducción</label>
                <textarea style={{ ...INPUT, resize: 'vertical' }} rows={3} value={art.intro} onChange={e => setField('intro', e.target.value)} />
              </div>

              {/* Secciones */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <label style={{ ...LABEL, marginBottom: 0 }}>Secciones ({art.sections.length})</label>
                  <button onClick={addSection} style={{ fontSize: '0.68rem', padding: '3px 8px', border: '1px solid var(--gold-border)', borderRadius: '5px', background: 'transparent', color: 'var(--gold-200)', cursor: 'pointer' }}>+ Añadir</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {art.sections.map((s, i) => (
                    <div key={i} style={SECTION_BLOCK}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontWeight: 600 }}>Sección {i + 1}</span>
                        <button onClick={() => removeSection(i)} style={{ fontSize: '0.68rem', color: '#ee0055', background: 'transparent', border: 'none', cursor: 'pointer' }}>✕ Eliminar</button>
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
                        <label style={LABEL}>Destacado</label>
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <label style={{ ...LABEL, marginBottom: 0 }}>FAQ ({art.faq.length})</label>
                  <button onClick={addFaq} style={{ fontSize: '0.68rem', padding: '3px 8px', border: '1px solid var(--gold-border)', borderRadius: '5px', background: 'transparent', color: 'var(--gold-200)', cursor: 'pointer' }}>+ Añadir</button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {art.faq.map((f, i) => (
                    <div key={i} style={SECTION_BLOCK}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-3)', fontWeight: 600 }}>Pregunta {i + 1}</span>
                        <button onClick={() => removeFaq(i)} style={{ fontSize: '0.68rem', color: '#ee0055', background: 'transparent', border: 'none', cursor: 'pointer' }}>✕</button>
                      </div>
                      <input style={INPUT} value={f.question} onChange={e => setFaq(i, 'question', e.target.value)} placeholder="Pregunta…" />
                      <textarea style={{ ...INPUT, resize: 'vertical' }} rows={2} value={f.answer} onChange={e => setFaq(i, 'answer', e.target.value)} placeholder="Respuesta…" />
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* TAB: Diseño & Anuncios */}
          {activeTab === 'diseno' && (
            <>
              <div>
                <label style={LABEL}>Plantilla de artículo</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                  {(Object.entries(TEMPLATES) as [Template, typeof TEMPLATES[Template]][]).map(([key, t]) => (
                    <button
                      key={key}
                      onClick={() => setTemplate(key)}
                      style={{
                        padding: '10px 14px',
                        border: `1.5px solid ${template === key ? '#c9a043' : 'var(--gold-border)'}`,
                        borderRadius: '8px',
                        background: template === key ? 'rgba(201,160,67,0.1)' : 'var(--bg-1)',
                        cursor: 'pointer',
                        textAlign: 'left',
                      }}
                    >
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: template === key ? '#c9a043' : 'var(--text-0)' }}>{t.label}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '2px' }}>{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={LABEL}>Posición de anuncios</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
                  {(Object.entries(AD_PLACEMENTS) as [AdPlacement, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => setAdPlacement(key)}
                      style={{
                        padding: '8px 12px',
                        border: `1.5px solid ${adPlacement === key ? '#c9a043' : 'var(--gold-border)'}`,
                        borderRadius: '6px',
                        background: adPlacement === key ? 'rgba(201,160,67,0.1)' : 'var(--bg-1)',
                        cursor: 'pointer',
                        textAlign: 'left',
                        fontSize: '0.78rem',
                        color: adPlacement === key ? '#c9a043' : 'var(--text-1)',
                        fontWeight: adPlacement === key ? 600 : 400,
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', background: 'var(--bg-2)', padding: '10px 12px', borderRadius: '6px', lineHeight: 1.6 }}>
                Los bloques dorados en el preview indican dónde aparecerán los anuncios de AdSense. No se muestran hasta que Google apruebe tu sitio.
              </div>
            </>
          )}

        </div>

        {/* RIGHT — Live Preview */}
        <div style={{ flex: 1, overflowY: 'auto', background: '#e8e8e8', padding: '1.5rem' }}>
          <div style={{ fontSize: '0.68rem', color: '#999', textAlign: 'center', marginBottom: '0.75rem', fontFamily: 'system-ui, sans-serif', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            Preview en tiempo real · {TEMPLATES[template].label}
          </div>
          <div style={{ maxWidth: '780px', margin: '0 auto', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}>
            <ArticlePreview article={art} template={template} adPlacement={adPlacement} />
          </div>
        </div>

      </div>
    </div>
  )
}
