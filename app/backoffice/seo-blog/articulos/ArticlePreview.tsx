'use client'
import type { EditableArticle } from './ArticleEditor'

export type Template = 'clasico' | 'alternado' | 'moderno'
export type AdPlacement = 'ninguno' | 'tras-intro' | 'entre-secciones' | 'al-final' | 'tras-intro-y-final'

export const TEMPLATES: Record<Template, { label: string; desc: string }> = {
  clasico:   { label: 'Clásico',   desc: 'Columna única · serif · sin anuncios visibles' },
  alternado: { label: 'Alternado', desc: 'Imágenes izq/der · sans-serif' },
  moderno:   { label: 'Moderno',   desc: 'Compacto · Outfit · sidebar de anuncios' },
}

export const AD_PLACEMENTS: Record<AdPlacement, string> = {
  'ninguno':             'Sin anuncios',
  'tras-intro':          'Tras la introducción',
  'entre-secciones':     'Entre secciones',
  'al-final':            'Al final del artículo',
  'tras-intro-y-final':  'Tras intro + al final',
}

function AdSlot({ label }: { label: string }) {
  return (
    <div style={{
      border: '1.5px dashed #c9a043',
      borderRadius: '6px',
      padding: '12px 16px',
      margin: '1.5rem 0',
      background: 'rgba(201,160,67,0.06)',
      textAlign: 'center',
      fontSize: '0.72rem',
      color: '#c9a043',
      fontFamily: 'system-ui, sans-serif',
      letterSpacing: '0.08em',
      textTransform: 'uppercase',
      fontWeight: 600,
    }}>
      ▦ Anuncio AdSense · {label}
    </div>
  )
}

function renderSectionClassico(section: EditableArticle['sections'][number], i: number) {
  return (
    <section key={i} style={{ marginBottom: '2.5rem' }}>
      <h2 style={{ fontSize: 'clamp(1.1rem,3vw,1.4rem)', fontWeight: 700, lineHeight: 1.3, color: '#111', marginBottom: '1rem', fontFamily: 'Georgia, serif' }}>
        {section.h2 || <span style={{ color: '#ccc' }}>H2 vacío</span>}
      </h2>
      {section.image && (
        <img src={section.image} alt={section.h2} loading="lazy"
          style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: '4px', display: 'block', marginBottom: '1.25rem' }} />
      )}
      {section.highlight && (
        <blockquote style={{ background: '#f9f6f0', borderLeft: '3px solid #c9a043', padding: '1rem 1.25rem', borderRadius: '0 4px 4px 0', margin: '1.5rem 0', fontStyle: 'italic', color: '#555', fontSize: '0.95rem', lineHeight: 1.7 }}>
          {section.highlight}
        </blockquote>
      )}
      {section.content.split('\n\n').map((para, j) => (
        <p key={j} style={{ fontSize: '1rem', lineHeight: 1.85, color: '#333', marginBottom: '1.1rem' }}>{para}</p>
      ))}
    </section>
  )
}

function renderSectionAlternado(section: EditableArticle['sections'][number], i: number) {
  const isEven = i % 2 === 0
  return (
    <section key={i} style={{ marginBottom: '2.5rem' }}>
      <h2 style={{ fontSize: 'clamp(1.1rem,3vw,1.35rem)', fontWeight: 700, lineHeight: 1.3, color: '#111', marginBottom: '1rem', fontFamily: 'system-ui, sans-serif' }}>
        {section.h2 || <span style={{ color: '#ccc' }}>H2 vacío</span>}
      </h2>
      {section.image ? (
        <div style={{ display: 'flex', flexDirection: isEven ? 'row' : 'row-reverse', gap: '1.25rem', alignItems: 'flex-start' }}>
          <img src={section.image} alt={section.h2} loading="lazy"
            style={{ width: '40%', aspectRatio: '4/3', objectFit: 'cover', borderRadius: '6px', flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            {section.highlight && (
              <blockquote style={{ background: '#f9f6f0', borderLeft: '3px solid #c9a043', padding: '0.75rem 1rem', borderRadius: '0 4px 4px 0', margin: '0 0 1rem', fontStyle: 'italic', color: '#555', fontSize: '0.9rem', lineHeight: 1.7 }}>
                {section.highlight}
              </blockquote>
            )}
            {section.content.split('\n\n').map((para, j) => (
              <p key={j} style={{ fontSize: '0.95rem', lineHeight: 1.8, color: '#333', marginBottom: '0.9rem', fontFamily: 'system-ui, sans-serif' }}>{para}</p>
            ))}
          </div>
        </div>
      ) : (
        <>
          {section.highlight && (
            <blockquote style={{ background: '#f9f6f0', borderLeft: '3px solid #c9a043', padding: '0.75rem 1rem', borderRadius: '0 4px 4px 0', margin: '0 0 1rem', fontStyle: 'italic', color: '#555', fontSize: '0.9rem', lineHeight: 1.7 }}>
              {section.highlight}
            </blockquote>
          )}
          {section.content.split('\n\n').map((para, j) => (
            <p key={j} style={{ fontSize: '0.95rem', lineHeight: 1.8, color: '#333', marginBottom: '0.9rem', fontFamily: 'system-ui, sans-serif' }}>{para}</p>
          ))}
        </>
      )}
    </section>
  )
}

function renderSectionModerno(section: EditableArticle['sections'][number], i: number) {
  return (
    <section key={i} style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1.15rem', fontWeight: 700, lineHeight: 1.3, color: '#111', marginBottom: '0.75rem', fontFamily: '"Outfit", system-ui, sans-serif', borderBottom: '1px solid #f0f0f0', paddingBottom: '0.5rem' }}>
        {section.h2 || <span style={{ color: '#ccc' }}>H2 vacío</span>}
      </h2>
      {section.image && (
        <img src={section.image} alt={section.h2} loading="lazy"
          style={{ width: '100%', aspectRatio: '21/9', objectFit: 'cover', borderRadius: '6px', display: 'block', marginBottom: '1rem' }} />
      )}
      {section.highlight && (
        <div style={{ background: '#1a1a1a', color: '#c9a043', padding: '0.75rem 1.25rem', borderRadius: '6px', margin: '1rem 0', fontSize: '0.9rem', fontStyle: 'italic', lineHeight: 1.6 }}>
          {section.highlight}
        </div>
      )}
      {section.content.split('\n\n').map((para, j) => (
        <p key={j} style={{ fontSize: '0.93rem', lineHeight: 1.8, color: '#444', marginBottom: '0.85rem', fontFamily: '"Outfit", system-ui, sans-serif' }}>{para}</p>
      ))}
    </section>
  )
}

export function ArticlePreview({
  article,
  template,
  adPlacement,
}: {
  article: EditableArticle
  template: Template
  adPlacement: AdPlacement
}) {
  const art = article
  const fecha = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

  const showAd = (pos: AdPlacement) => adPlacement === pos || adPlacement === 'tras-intro-y-final'

  const isModerno = template === 'moderno'
  const isAlternado = template === 'alternado'

  const bodyFont = isModerno
    ? '"Outfit", system-ui, sans-serif'
    : isAlternado
    ? 'system-ui, sans-serif'
    : 'Georgia, "Times New Roman", serif'

  const renderSection = isModerno
    ? renderSectionModerno
    : isAlternado
    ? renderSectionAlternado
    : renderSectionClassico

  return (
    <div style={{ minHeight: '100%', background: '#fff', color: '#1a1a1a', fontFamily: bodyFont }}>
      <article style={{ maxWidth: isModerno ? '680px' : '720px', margin: '0 auto', padding: '3rem 1.5rem 5rem' }}>

        {/* Categoría + fecha */}
        <div style={{ fontSize: '0.72rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888', marginBottom: '1.25rem', fontFamily: 'system-ui, sans-serif' }}>
          {art.keyword || 'Inversión inmobiliaria'} · {fecha}
        </div>

        {/* H1 */}
        <h1 style={{
          fontSize: 'clamp(1.6rem, 4vw, 2.4rem)',
          fontWeight: 700,
          lineHeight: 1.2,
          marginBottom: '1.25rem',
          color: '#111',
          fontFamily: isModerno ? '"Outfit", system-ui, sans-serif' : isAlternado ? 'system-ui, sans-serif' : 'Georgia, serif',
        }}>
          {art.h1 || <span style={{ color: '#ccc' }}>Título del artículo</span>}
        </h1>

        {/* Intro */}
        <p style={{
          fontSize: '1.1rem',
          lineHeight: 1.75,
          color: '#444',
          marginBottom: '2rem',
          fontStyle: isModerno ? 'normal' : 'italic',
          borderLeft: isModerno ? 'none' : '3px solid #ddd',
          paddingLeft: isModerno ? 0 : '1.25rem',
          background: isModerno ? '#f9f9f9' : 'transparent',
          padding: isModerno ? '1rem 1.25rem' : undefined,
          borderRadius: isModerno ? '6px' : undefined,
        }}>
          {art.intro || <span style={{ color: '#ccc' }}>Introducción…</span>}
        </p>

        {/* Ad tras intro */}
        {(showAd('tras-intro') || showAd('tras-intro-y-final')) && adPlacement !== 'al-final' && adPlacement !== 'entre-secciones' && (
          <AdSlot label="tras la introducción" />
        )}
        {adPlacement === 'tras-intro-y-final' && <AdSlot label="tras la introducción" />}
        {adPlacement === 'tras-intro' && <AdSlot label="tras la introducción" />}

        {/* Hero image */}
        {art.hero_image && (
          <div style={{ marginBottom: '2rem' }}>
            <img src={art.hero_image} alt={art.h1}
              style={{ width: '100%', aspectRatio: isModerno ? '21/9' : '16/9', objectFit: 'cover', borderRadius: isModerno ? '8px' : '4px', display: 'block' }} />
          </div>
        )}

        {/* Sections */}
        {art.sections?.map((section, i) => (
          <div key={i}>
            {renderSection(section, i)}
            {adPlacement === 'entre-secciones' && i < art.sections.length - 1 && i % 2 === 1 && (
              <AdSlot label={`entre secciones ${i + 1}/${i + 2}`} />
            )}
          </div>
        ))}

        {/* CTA */}
        {art.cta && (
          <div style={{
            background: isModerno ? '#1a1a1a' : '#f5f0e8',
            borderRadius: '6px',
            padding: '1.5rem 1.75rem',
            margin: '2.5rem 0',
            borderLeft: isModerno ? 'none' : '4px solid #c9a043',
          }}>
            <p style={{ fontSize: '0.95rem', color: isModerno ? '#ccc' : '#444', marginBottom: '1rem', lineHeight: 1.7, fontFamily: 'system-ui, sans-serif' }}>
              {art.cta}
            </p>
            <span style={{
              display: 'inline-block',
              background: isModerno ? '#c9a043' : '#1a1a1a',
              color: isModerno ? '#1a1a1a' : '#fff',
              padding: '10px 20px',
              borderRadius: '4px',
              fontWeight: 600,
              fontSize: '0.85rem',
              fontFamily: 'system-ui, sans-serif',
            }}>
              Contactar con Grupo Skyline →
            </span>
          </div>
        )}

        {/* Ad al final */}
        {(adPlacement === 'al-final' || adPlacement === 'tras-intro-y-final') && (
          <AdSlot label="al final del artículo" />
        )}

        {/* FAQ */}
        {art.faq?.length > 0 && (
          <section style={{ marginTop: '2.5rem', paddingTop: '1.75rem', borderTop: '1px solid #eee' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#111', marginBottom: '1.25rem', fontFamily: isModerno ? '"Outfit", system-ui, sans-serif' : isAlternado ? 'system-ui, sans-serif' : 'Georgia, serif' }}>
              Preguntas frecuentes
            </h2>
            {art.faq.map((item, i) => (
              <div key={i} style={{ borderBottom: '1px solid #f0f0f0', padding: '1rem 0' }}>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111', marginBottom: '0.4rem', lineHeight: 1.4, fontFamily: 'system-ui, sans-serif' }}>{item.question}</h3>
                <p style={{ fontSize: '0.9rem', color: '#555', lineHeight: 1.75, margin: 0, fontFamily: 'system-ui, sans-serif' }}>{item.answer}</p>
              </div>
            ))}
          </section>
        )}

        {/* Footer */}
        <div style={{ marginTop: '3rem', paddingTop: '1.5rem', borderTop: '1px solid #eee', fontFamily: 'system-ui, sans-serif' }}>
          <p style={{ fontSize: '0.75rem', color: '#aaa', lineHeight: 1.6 }}>
            Publicado con información proporcionada por <span style={{ color: '#888', textDecoration: 'underline' }}>Grupo Skyline</span>, empresa especializada en inversión en activos inmobiliarios y créditos hipotecarios en España.
          </p>
        </div>

      </article>
    </div>
  )
}
