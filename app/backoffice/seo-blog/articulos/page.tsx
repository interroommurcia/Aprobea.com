'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

type ArticleSection = { h2: string; content: string; highlight: string | null }
type FAQ = { question: string; answer: string }

type Article = {
  slug: string
  metaTitle: string
  metaDescription: string
  h1: string
  intro: string
  sections: ArticleSection[]
  cta: string
  faq: FAQ[]
  heroImage?: string
  heroImageThumb?: string
  heroImageCredit?: string
  heroImageCreditUrl?: string
  heroImageQuery: string
}

type SavedArticle = {
  id: string
  slug: string
  meta_title: string
  h1: string
  keyword: string | null
  estado: 'borrador' | 'publicado'
  created_at: string
  hero_image_thumb: string | null
}

function generateHTML(article: Article): string {
  const schemaOrg = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: article.h1,
        description: article.metaDescription,
        author: { '@type': 'Organization', name: 'Grupo Skyline', url: 'https://gruposkyline.com' },
        publisher: { '@type': 'Organization', name: 'Grupo Skyline', logo: { '@type': 'ImageObject', url: 'https://gruposkyline.com/logo.png' } },
        url: `https://gruposkyline.com/blog/${article.slug}`,
        ...(article.heroImage ? { image: article.heroImage } : {}),
      },
      {
        '@type': 'FAQPage',
        mainEntity: article.faq.map(f => ({
          '@type': 'Question', name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })),
      },
    ],
  }

  const sectionsHtml = article.sections.map(s => `
  <section>
    <h2>${s.h2}</h2>
    ${s.highlight ? `<blockquote class="highlight"><p>${s.highlight}</p></blockquote>` : ''}
    ${s.content.split('\n\n').map(p => `<p>${p}</p>`).join('\n    ')}
  </section>`).join('\n')

  const faqHtml = article.faq.map(f => `
    <div class="faq-item">
      <h3>${f.question}</h3>
      <p>${f.answer}</p>
    </div>`).join('\n')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${article.metaTitle}</title>
  <meta name="description" content="${article.metaDescription}">
  <link rel="canonical" href="https://gruposkyline.com/blog/${article.slug}">
  <meta property="og:title" content="${article.metaTitle}">
  <meta property="og:description" content="${article.metaDescription}">
  ${article.heroImage ? `<meta property="og:image" content="${article.heroImage}">` : ''}
  <script type="application/ld+json">${JSON.stringify(schemaOrg, null, 2)}</script>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;font-size:17px;line-height:1.7;color:#1a1a1a;max-width:760px;margin:0 auto;padding:1.5rem 1rem}
    h1{font-size:clamp(1.6rem,5vw,2.4rem);line-height:1.25;margin-bottom:1rem;font-weight:800}
    h2{font-size:1.4rem;font-weight:700;margin:2.5rem 0 0.75rem;color:#0d0d0d}
    h3{font-size:1.1rem;font-weight:600;margin:1.5rem 0 0.5rem;color:#0d0d0d}
    p{margin-bottom:1rem;font-size:17px}
    .hero-img{width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:12px;margin:1.5rem 0;display:block}
    .meta-desc{font-size:1.05rem;color:#555;margin-bottom:1.5rem;line-height:1.6}
    .highlight{background:#fff8e6;border-left:4px solid #C9A043;padding:1rem 1.25rem;border-radius:0 8px 8px 0;margin:1.5rem 0;font-style:italic;color:#333}
    .cta-box{background:#0d0d0d;color:#fff;padding:2rem;border-radius:12px;text-align:center;margin:3rem 0}
    .cta-box p{color:#ccc;margin-bottom:1rem}
    .cta-btn{display:inline-block;background:#C9A043;color:#0d0d0d;padding:14px 28px;border-radius:8px;font-weight:700;text-decoration:none;font-size:1rem;min-height:48px;line-height:1.2}
    .faq{margin:3rem 0}
    .faq h2{margin-bottom:1.5rem}
    .faq-item{border-bottom:1px solid #eee;padding:1.25rem 0}
    .faq-item h3{font-size:1rem;margin-bottom:0.5rem;color:#0d0d0d}
    .faq-item p{margin:0;color:#444;font-size:0.95rem}
    .credit{font-size:0.75rem;color:#999;margin-top:0.25rem}
    @media(max-width:390px){body{font-size:16px;padding:1rem 0.875rem}h1{font-size:1.6rem}h2{font-size:1.2rem}}
  </style>
</head>
<body>
  <article>
    <h1>${article.h1}</h1>
    <p class="meta-desc">${article.intro}</p>
    ${article.heroImage ? `<img class="hero-img" src="${article.heroImage}" alt="${article.h1}" loading="lazy" width="760" height="427">
    ${article.heroImageCredit ? `<p class="credit">Foto: <a href="${article.heroImageCreditUrl}" target="_blank" rel="noopener">${article.heroImageCredit}</a> · Unsplash</p>` : ''}` : ''}
    ${sectionsHtml}
    <div class="cta-box">
      <p>${article.cta}</p>
      <a class="cta-btn" href="https://gruposkyline.com/contacto">Hablar con Grupo Skyline</a>
    </div>
    <div class="faq">
      <h2>Preguntas frecuentes</h2>
      ${faqHtml}
    </div>
  </article>
</body>
</html>`
}

function generateMarkdown(article: Article): string {
  const sections = article.sections.map(s => {
    let md = `## ${s.h2}\n\n`
    if (s.highlight) md += `> ${s.highlight}\n\n`
    md += s.content
    return md
  }).join('\n\n')
  const faq = article.faq.map(f => `**${f.question}**\n${f.answer}`).join('\n\n')
  return `---\ntitle: "${article.metaTitle}"\ndescription: "${article.metaDescription}"\nslug: "${article.slug}"\nurl: "https://gruposkyline.com/blog/${article.slug}"\n---\n\n# ${article.h1}\n\n${article.intro}\n\n${sections}\n\n---\n\n**${article.cta}**\n\n---\n\n## Preguntas frecuentes\n\n${faq}\n`
}

export default function ArticulosPage() {
  const [material, setMaterial] = useState('')
  const [keyword, setKeyword] = useState('')
  const [tone, setTone] = useState<'profesional' | 'cercano'>('profesional')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [article, setArticle] = useState<Article | null>(null)
  const [savedId, setSavedId] = useState<string | null>(null)
  const [savedEstado, setSavedEstado] = useState<'borrador' | 'publicado' | null>(null)
  const [previewMode, setPreviewMode] = useState<'desktop' | 'mobile'>('mobile')
  const [copied, setCopied] = useState(false)
  const [savedArticles, setSavedArticles] = useState<SavedArticle[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const pdfRef = useRef<HTMLInputElement>(null)
  const [pdfName, setPdfName] = useState('')

  const loadList = useCallback(async () => {
    setLoadingList(true)
    const res = await fetch('/api/backoffice/articulos')
    if (res.ok) setSavedArticles(await res.json())
    setLoadingList(false)
  }, [])

  useEffect(() => { loadList() }, [loadList])

  async function generate() {
    if (!keyword.trim()) { setError('Introduce la keyword principal'); return }
    setError(''); setLoading(true); setArticle(null); setSavedId(null); setSavedEstado(null)
    const fd = new FormData()
    fd.append('keyword', keyword.trim()); fd.append('tone', tone)
    if (material.trim()) fd.append('material', material.trim())
    if (pdfRef.current?.files?.[0]) fd.append('pdf', pdfRef.current.files[0])
    try {
      const res = await fetch('/api/backoffice/articulos/generate', { method: 'POST', body: fd })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Error generando artículo'); return }
      setArticle(data)
    } catch { setError('Error de conexión') }
    finally { setLoading(false) }
  }

  async function saveArticle(publish: boolean) {
    if (!article) return
    setSaving(true)
    const res = await fetch('/api/backoffice/articulos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slug: article.slug,
        meta_title: article.metaTitle,
        meta_description: article.metaDescription,
        h1: article.h1,
        intro: article.intro,
        sections: article.sections,
        cta: article.cta,
        faq: article.faq,
        hero_image: article.heroImage,
        hero_image_thumb: article.heroImageThumb,
        hero_image_credit: article.heroImageCredit,
        hero_image_credit_url: article.heroImageCreditUrl,
        hero_image_query: article.heroImageQuery,
        keyword,
      }),
    })
    const data = await res.json()
    if (res.ok) {
      setSavedId(data.id)
      setSavedEstado('borrador')
      if (publish) await toggleEstado(data.id, 'publicado')
      else await loadList()
    }
    setSaving(false)
  }

  async function toggleEstado(id: string, estado: 'borrador' | 'publicado') {
    const res = await fetch('/api/backoffice/articulos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, estado }),
    })
    if (res.ok) {
      setSavedEstado(estado)
      await loadList()
    }
  }

  async function deleteArticle(id: string) {
    if (!confirm('¿Eliminar este artículo?')) return
    await fetch('/api/backoffice/articulos', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    await loadList()
    if (savedId === id) { setSavedId(null); setSavedEstado(null) }
  }

  function exportHTML() {
    if (!article) return
    const blob = new Blob([generateHTML(article)], { type: 'text/html' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob)
    a.download = `${article.slug}.html`; a.click()
  }

  async function copyMarkdown() {
    if (!article) return
    await navigator.clipboard.writeText(generateMarkdown(article))
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const previewHTML = article ? generateHTML(article) : ''

  return (
    <div style={{ padding: '2rem', maxWidth: '1400px', margin: '0 auto' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-0)', marginBottom: '0.35rem' }}>
          Generador de Artículos SEO
        </h1>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>
          Genera artículos optimizados para Google, Bing y ChatGPT sobre inversión inmobiliaria.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: article ? '380px 1fr' : '1fr', gap: '2rem', alignItems: 'start' }}>
        {/* ── Inputs ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="bo-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label className="bo-label">Keyword principal *</label>
              <input className="bo-input" placeholder="ej: activos de banco en subasta España" value={keyword} onChange={e => setKeyword(e.target.value)} style={{ marginTop: '0.4rem' }} />
            </div>
            <div>
              <label className="bo-label">Tono</label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
                {(['profesional', 'cercano'] as const).map(t => (
                  <button key={t} onClick={() => setTone(t)} style={{ flex: 1, padding: '8px', borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 500, transition: 'all 0.2s', border: tone === t ? '1.5px solid var(--gold-200)' : '1px solid var(--gold-border)', background: tone === t ? 'rgba(201,160,67,0.12)' : 'var(--bg-2)', color: tone === t ? 'var(--gold-100)' : 'var(--text-2)' }}>
                    {t === 'profesional' ? '🎩 Profesional' : '💬 Cercano'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="bo-label">Material de referencia</label>
              <textarea className="bo-input" rows={5} placeholder="Pega texto, estadísticas, URL o notas…" value={material} onChange={e => setMaterial(e.target.value)} style={{ marginTop: '0.4rem', resize: 'vertical', fontFamily: 'inherit', fontSize: '0.82rem' }} />
            </div>
            <div>
              <label className="bo-label">O sube un PDF</label>
              <div onClick={() => pdfRef.current?.click()} style={{ marginTop: '0.4rem', padding: '1rem', borderRadius: 'var(--radius)', cursor: 'pointer', border: '1.5px dashed var(--gold-border)', background: 'var(--bg-2)', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.8rem', transition: 'all 0.2s' }}>
                {pdfName ? `📄 ${pdfName}` : '📎 Haz clic para seleccionar PDF'}
              </div>
              <input ref={pdfRef} type="file" accept=".pdf" style={{ display: 'none' }} onChange={e => setPdfName(e.target.files?.[0]?.name || '')} />
            </div>
            {error && <div style={{ background: 'rgba(238,0,85,0.08)', border: '1px solid rgba(238,0,85,0.2)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem', fontSize: '0.82rem', color: '#ee0055' }}>{error}</div>}
            <button className="bo-btn bo-btn-primary" onClick={generate} disabled={loading} style={{ width: '100%', padding: '12px', fontSize: '0.9rem', fontWeight: 600 }}>
              {loading ? '⏳ Generando…' : '✨ Generar artículo'}
            </button>
          </div>

          {/* Acciones post-generación */}
          {article && (
            <div className="bo-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Metadatos SEO</div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: '3px' }}>Meta título ({article.metaTitle.length}/60)</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-0)', background: 'var(--bg-2)', padding: '8px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--gold-border)' }}>{article.metaTitle}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: '3px' }}>Meta descripción ({article.metaDescription.length}/155)</div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-0)', background: 'var(--bg-2)', padding: '8px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--gold-border)', lineHeight: 1.5 }}>{article.metaDescription}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginBottom: '3px' }}>URL</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--gold-200)', fontFamily: 'monospace', background: 'var(--bg-2)', padding: '8px 10px', borderRadius: 'var(--radius)', border: '1px solid var(--gold-border)' }}>
                  gruposkyline.com/blog/{article.slug}
                </div>
              </div>

              {/* Estado del artículo guardado */}
              {savedId && savedEstado && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', background: savedEstado === 'publicado' ? 'rgba(109,200,109,0.08)' : 'rgba(201,160,67,0.08)', borderRadius: 'var(--radius)', border: `1px solid ${savedEstado === 'publicado' ? 'rgba(109,200,109,0.2)' : 'rgba(201,160,67,0.2)'}` }}>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: savedEstado === 'publicado' ? '#6dc86d' : '#C9A043' }}>
                    {savedEstado === 'publicado' ? '● Publicado' : '○ Borrador'}
                  </span>
                  {savedEstado === 'publicado' && (
                    <a href={`/blog/${article.slug}`} target="_blank" rel="noopener" style={{ marginLeft: 'auto', fontSize: '0.72rem', color: 'var(--gold-200)' }}>Ver en web ↗</a>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button className="bo-btn bo-btn-ghost" onClick={exportHTML} style={{ flex: 1, fontSize: '0.78rem', padding: '8px' }}>⬇ HTML</button>
                <button className="bo-btn bo-btn-ghost" onClick={copyMarkdown} style={{ flex: 1, fontSize: '0.78rem', padding: '8px' }}>{copied ? '✓ Copiado' : '📋 MD'}</button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {!savedId ? (
                  <>
                    <button className="bo-btn bo-btn-ghost" onClick={() => saveArticle(false)} disabled={saving} style={{ flex: 1, fontSize: '0.8rem', padding: '9px' }}>
                      {saving ? '…' : '💾 Guardar borrador'}
                    </button>
                    <button className="bo-btn bo-btn-primary" onClick={() => saveArticle(true)} disabled={saving} style={{ flex: 1, fontSize: '0.8rem', padding: '9px', fontWeight: 600 }}>
                      {saving ? '…' : '🚀 Publicar'}
                    </button>
                  </>
                ) : savedEstado === 'borrador' ? (
                  <button className="bo-btn bo-btn-primary" onClick={() => toggleEstado(savedId, 'publicado')} style={{ width: '100%', fontSize: '0.85rem', padding: '10px', fontWeight: 600 }}>
                    🚀 Publicar en gruposkyline.com/blog
                  </button>
                ) : (
                  <button className="bo-btn bo-btn-ghost" onClick={() => toggleEstado(savedId, 'borrador')} style={{ width: '100%', fontSize: '0.8rem', padding: '9px' }}>
                    Despublicar
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ── Preview ── */}
        {article && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Vista previa</span>
              <div style={{ display: 'flex', gap: '4px' }}>
                {(['mobile', 'desktop'] as const).map(m => (
                  <button key={m} onClick={() => setPreviewMode(m)} style={{ padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem', border: previewMode === m ? '1.5px solid var(--gold-200)' : '1px solid var(--gold-border)', background: previewMode === m ? 'rgba(201,160,67,0.12)' : 'var(--bg-2)', color: previewMode === m ? 'var(--gold-100)' : 'var(--text-3)' }}>
                    {m === 'mobile' ? '📱 Mobile' : '🖥 Desktop'}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ background: 'var(--bg-2)', borderRadius: '16px', border: '1px solid var(--gold-border)', display: 'flex', justifyContent: 'center', padding: previewMode === 'mobile' ? '2rem 1rem' : '1.5rem', minHeight: '600px', overflow: 'hidden' }}>
              <div style={{ width: previewMode === 'mobile' ? '390px' : '100%', maxWidth: '100%', background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 4px 32px rgba(0,0,0,0.15)', transition: 'width 0.3s ease' }}>
                <iframe srcDoc={previewHTML} style={{ width: '100%', border: 'none', display: 'block', minHeight: '800px' }} title="Vista previa" sandbox="allow-same-origin" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Estado inicial */}
      {!article && !loading && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-3)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.4 }}>✍️</div>
          <div style={{ fontSize: '0.9rem', marginBottom: '0.5rem' }}>Introduce una keyword y material de referencia para comenzar</div>
          <div style={{ fontSize: '0.78rem' }}>El artículo incluye Schema.org, FAQ y estructura mobile-first optimizada para Bing/ChatGPT</div>
        </div>
      )}
      {loading && (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-3)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem', animation: 'spin 1s linear infinite', display: 'inline-block' }}>⚙️</div>
          <div style={{ fontSize: '0.9rem' }}>Claude está redactando el artículo…</div>
          <div style={{ fontSize: '0.78rem', marginTop: '0.5rem' }}>Suele tardar entre 20 y 40 segundos</div>
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}

      {/* ── Lista de artículos guardados ── */}
      <div style={{ marginTop: '3rem', borderTop: '0.5px solid var(--gold-border)', paddingTop: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-0)' }}>Artículos guardados</h2>
          <button onClick={loadList} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: '0.78rem' }}>↻ Actualizar</button>
        </div>

        {loadingList ? (
          <div style={{ color: 'var(--text-3)', fontSize: '0.82rem' }}>Cargando…</div>
        ) : savedArticles.length === 0 ? (
          <div style={{ color: 'var(--text-3)', fontSize: '0.82rem' }}>No hay artículos guardados aún.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {savedArticles.map(art => (
              <div key={art.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.85rem 1rem', background: 'var(--bg-1)', borderRadius: 'var(--radius)', border: '0.5px solid var(--gold-border)' }}>
                {art.hero_image_thumb && (
                  <img src={art.hero_image_thumb} alt={art.h1} style={{ width: '48px', height: '27px', objectFit: 'cover', borderRadius: '4px', flexShrink: 0 }} />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{art.h1}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '2px' }}>
                    /blog/{art.slug} · {new Date(art.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                </div>
                <span style={{ flexShrink: 0, fontSize: '0.7rem', fontWeight: 600, padding: '3px 8px', borderRadius: '6px', background: art.estado === 'publicado' ? 'rgba(109,200,109,0.12)' : 'rgba(201,160,67,0.1)', color: art.estado === 'publicado' ? '#6dc86d' : '#C9A043', border: `1px solid ${art.estado === 'publicado' ? 'rgba(109,200,109,0.2)' : 'rgba(201,160,67,0.2)'}` }}>
                  {art.estado === 'publicado' ? 'Publicado' : 'Borrador'}
                </span>
                <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                  {art.estado === 'publicado' ? (
                    <a href={`/blog/${art.slug}`} target="_blank" rel="noopener" style={{ fontSize: '0.72rem', color: 'var(--gold-200)', textDecoration: 'none', padding: '4px 8px', border: '1px solid var(--gold-border)', borderRadius: '4px' }}>Ver ↗</a>
                  ) : (
                    <button onClick={() => toggleEstado(art.id, 'publicado')} style={{ fontSize: '0.72rem', cursor: 'pointer', padding: '4px 8px', border: '1px solid var(--gold-border)', borderRadius: '4px', background: 'transparent', color: 'var(--gold-200)' }}>
                      Publicar
                    </button>
                  )}
                  {art.estado === 'publicado' && (
                    <button onClick={() => toggleEstado(art.id, 'borrador')} style={{ fontSize: '0.72rem', cursor: 'pointer', padding: '4px 8px', border: '1px solid var(--gold-border)', borderRadius: '4px', background: 'transparent', color: 'var(--text-3)' }}>
                      Despublicar
                    </button>
                  )}
                  <button onClick={() => deleteArticle(art.id)} style={{ fontSize: '0.72rem', cursor: 'pointer', padding: '4px 8px', border: '1px solid rgba(238,0,85,0.2)', borderRadius: '4px', background: 'transparent', color: '#ee0055' }}>
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
