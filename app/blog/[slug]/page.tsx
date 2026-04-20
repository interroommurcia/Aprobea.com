import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { ViewTracker, CtaLink } from './ViewTracker'

type Section = { h2: string; content: string; highlight: string | null; image?: string }
type FAQ = { question: string; answer: string }

type Articulo = {
  id: string
  slug: string
  meta_title: string
  meta_description: string
  h1: string
  intro: string
  sections: Section[]
  cta: string
  faq: FAQ[]
  hero_image: string | null
  hero_image_credit: string | null
  hero_image_credit_url: string | null
  keyword: string | null
  created_at: string
}

async function getArticulo(slug: string): Promise<Articulo | null> {
  const { data } = await supabaseAdmin
    .from('articulos')
    .select('*')
    .eq('slug', slug)
    .eq('estado', 'publicado')
    .single()
  return data ?? null
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const art = await getArticulo(slug)
  if (!art) return { title: 'Artículo no encontrado' }

  const schemaOrg = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: art.h1,
        description: art.meta_description,
        author: { '@type': 'Organization', name: 'Grupo Skyline', url: 'https://gruposkyline.es' },
        publisher: { '@type': 'Organization', name: 'Grupo Skyline', logo: { '@type': 'ImageObject', url: 'https://gruposkyline.es/logo.png' } },
        url: `https://gruposkyline.es/blog/${art.slug}`,
        datePublished: art.created_at,
        ...(art.hero_image ? { image: art.hero_image } : {}),
      },
      {
        '@type': 'FAQPage',
        mainEntity: art.faq?.map(f => ({
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        })) ?? [],
      },
    ],
  }

  return {
    title: art.meta_title,
    description: art.meta_description,
    alternates: { canonical: `https://gruposkyline.es/blog/${art.slug}` },
    openGraph: {
      title: art.meta_title,
      description: art.meta_description,
      type: 'article',
      url: `https://gruposkyline.es/blog/${art.slug}`,
      publishedTime: art.created_at,
      ...(art.hero_image ? { images: [{ url: art.hero_image, width: 1200, height: 675, alt: art.h1 }] } : {}),
    },
    other: { 'script:ld+json': JSON.stringify(schemaOrg) },
  }
}

export default async function ArticuloPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const art = await getArticulo(slug)
  if (!art) notFound()

  const fecha = new Date(art.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <main style={{ minHeight: '100vh', background: '#fff', color: '#1a1a1a', fontFamily: 'Georgia, "Times New Roman", serif' }}>
      <ViewTracker slug={art.slug} />
      <article style={{ maxWidth: '720px', margin: '0 auto', padding: '4rem 1.5rem 6rem' }}>

        {/* Categoría + fecha */}
        <div style={{ fontSize: '0.75rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#888', marginBottom: '1.5rem', fontFamily: 'system-ui, sans-serif' }}>
          {art.keyword ?? 'Inversión inmobiliaria'} &nbsp;·&nbsp; {fecha}
        </div>

        {/* H1 */}
        <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.6rem)', fontWeight: 700, lineHeight: 1.2, marginBottom: '1.5rem', color: '#111', fontFamily: 'Georgia, serif' }}>
          {art.h1}
        </h1>

        {/* Intro */}
        <p style={{ fontSize: '1.15rem', lineHeight: 1.75, color: '#444', marginBottom: '2.5rem', fontStyle: 'italic', borderLeft: '3px solid #ddd', paddingLeft: '1.25rem' }}>
          {art.intro}
        </p>

        {/* Hero image */}
        {art.hero_image && (
          <div style={{ marginBottom: '2.5rem' }}>
            <img src={art.hero_image} alt={art.h1} loading="eager"
              style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: '4px', display: 'block' }} />
            {art.hero_image_credit && (
              <p style={{ fontSize: '0.7rem', color: '#aaa', marginTop: '6px', fontFamily: 'system-ui, sans-serif' }}>
                Foto: <a href={art.hero_image_credit_url ?? '#'} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>{art.hero_image_credit}</a> · Unsplash
              </p>
            )}
          </div>
        )}

        {/* Sections */}
        {art.sections?.map((section, i) => (
          <section key={i} style={{ marginBottom: '2.5rem' }}>
            <h2 style={{ fontSize: 'clamp(1.2rem, 3vw, 1.5rem)', fontWeight: 700, lineHeight: 1.3, color: '#111', marginBottom: '1rem', fontFamily: 'Georgia, serif' }}>
              {section.h2}
            </h2>

            {section.image && (
              <img src={section.image} alt={section.h2} loading="lazy"
                style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: '4px', display: 'block', marginBottom: '1.25rem' }} />
            )}

            {section.highlight && (
              <blockquote style={{ background: '#f9f6f0', borderLeft: '3px solid #c9a043', padding: '1rem 1.25rem', borderRadius: '0 4px 4px 0', margin: '1.5rem 0', fontStyle: 'italic', color: '#555', fontSize: '1rem', lineHeight: 1.7 }}>
                {section.highlight}
              </blockquote>
            )}

            {section.content.split('\n\n').map((para, j) => (
              <p key={j} style={{ fontSize: '1rem', lineHeight: 1.85, color: '#333', marginBottom: '1.1rem' }}>
                {para}
              </p>
            ))}
          </section>
        ))}

        {/* CTA inline — parece editorial, no publicitario */}
        {art.cta && (
          <div style={{ background: '#f5f0e8', borderRadius: '6px', padding: '1.75rem 2rem', margin: '3rem 0', borderLeft: '4px solid #c9a043' }}>
            <p style={{ fontSize: '0.97rem', color: '#444', marginBottom: '1rem', lineHeight: 1.7, fontFamily: 'system-ui, sans-serif' }}>
              {art.cta}
            </p>
            <CtaLink slug={art.slug} href="https://gruposkyline.es/contacto"
              style={{ display: 'inline-block', background: '#1a1a1a', color: '#fff', padding: '12px 24px', borderRadius: '4px', fontWeight: 600, textDecoration: 'none', fontSize: '0.88rem', fontFamily: 'system-ui, sans-serif' }}>
              Contactar con Grupo Skyline →
            </CtaLink>
          </div>
        )}

        {/* FAQ */}
        {art.faq?.length > 0 && (
          <section style={{ marginTop: '3rem', paddingTop: '2rem', borderTop: '1px solid #eee' }}>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700, color: '#111', marginBottom: '1.5rem', fontFamily: 'Georgia, serif' }}>
              Preguntas frecuentes
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {art.faq.map((item, i) => (
                <div key={i} style={{ borderBottom: '1px solid #f0f0f0', padding: '1.25rem 0' }}>
                  <h3 style={{ fontSize: '0.97rem', fontWeight: 700, color: '#111', marginBottom: '0.5rem', lineHeight: 1.4, fontFamily: 'system-ui, sans-serif' }}>
                    {item.question}
                  </h3>
                  <p style={{ fontSize: '0.92rem', color: '#555', lineHeight: 1.75, margin: 0, fontFamily: 'system-ui, sans-serif' }}>
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer editorial */}
        <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '1px solid #eee', fontFamily: 'system-ui, sans-serif' }}>
          <p style={{ fontSize: '0.78rem', color: '#aaa', lineHeight: 1.6 }}>
            Publicado con información proporcionada por{' '}
            <a href="https://gruposkyline.es" target="_blank" rel="noopener noreferrer" style={{ color: '#888', textDecoration: 'underline' }}>
              Grupo Skyline
            </a>
            , empresa especializada en inversión en activos inmobiliarios y créditos hipotecarios en España.
          </p>
        </div>

      </article>
    </main>
  )
}
