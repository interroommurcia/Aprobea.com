import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase-admin'

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
  if (!art) return { title: 'Artículo no encontrado — Grupo Skyline' }

  const schemaOrg = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Article',
        headline: art.h1,
        description: art.meta_description,
        author: { '@type': 'Organization', name: 'Grupo Skyline', url: 'https://gruposkyline.com' },
        publisher: { '@type': 'Organization', name: 'Grupo Skyline', logo: { '@type': 'ImageObject', url: 'https://gruposkyline.com/logo.png' } },
        url: `https://gruposkyline.com/blog/${art.slug}`,
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
    alternates: { canonical: `https://gruposkyline.com/blog/${art.slug}` },
    openGraph: {
      title: art.meta_title,
      description: art.meta_description,
      type: 'article',
      url: `https://gruposkyline.com/blog/${art.slug}`,
      publishedTime: art.created_at,
      authors: ['Grupo Skyline'],
      ...(art.hero_image ? { images: [{ url: art.hero_image, width: 1200, height: 675, alt: art.h1 }] } : {}),
    },
    other: {
      'script:ld+json': JSON.stringify(schemaOrg),
    },
  }
}

export default async function ArticuloPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const art = await getArticulo(slug)
  if (!art) notFound()

  return (
    <main style={{
      minHeight: '100vh', background: 'var(--bg-0, #0a0a0a)',
      color: 'var(--text-0, #f0e8d8)', fontFamily: 'var(--font-outfit, sans-serif)',
    }}>
      {/* Header */}
      <div style={{ borderBottom: '0.5px solid rgba(201,160,67,0.2)', padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <img src="/logo.png" alt="Grupo Skyline" style={{ height: '36px', width: 'auto' }} />
        </Link>
        <Link href="/blog" style={{ fontSize: '0.75rem', color: 'rgba(201,160,67,0.7)', textDecoration: 'none', letterSpacing: '0.1em' }}>
          ← Blog
        </Link>
      </div>

      <article style={{ maxWidth: '760px', margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>
        {/* Keyword + fecha */}
        <div style={{ fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,160,67,0.65)', marginBottom: '1.25rem' }}>
          {art.keyword ?? 'Inversión inmobiliaria'} · {new Date(art.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>

        {/* H1 */}
        <h1 style={{
          fontFamily: 'var(--font-cormorant, serif)',
          fontSize: 'clamp(1.9rem, 5vw, 2.75rem)',
          fontWeight: 600, lineHeight: 1.2, marginBottom: '1.5rem', color: '#f0e8d8',
        }}>
          {art.h1}
        </h1>

        {/* Intro */}
        <p style={{ fontSize: '1.05rem', lineHeight: 1.8, color: 'rgba(240,232,216,0.75)', marginBottom: '2rem' }}>
          {art.intro}
        </p>

        {/* Hero image */}
        {art.hero_image && (
          <div style={{ marginBottom: '2.5rem' }}>
            <img
              src={art.hero_image}
              alt={art.h1}
              loading="eager"
              style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: '12px', display: 'block' }}
            />
            {art.hero_image_credit && (
              <p style={{ fontSize: '0.7rem', color: 'rgba(240,232,216,0.3)', marginTop: '6px' }}>
                Foto:{' '}
                <a href={art.hero_image_credit_url ?? '#'} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit' }}>
                  {art.hero_image_credit}
                </a>{' '}· Unsplash
              </p>
            )}
          </div>
        )}

        {/* Sections */}
        {art.sections?.map((section, i) => (
          <section key={i} style={{ marginBottom: '2.5rem' }}>
            <h2 style={{
              fontFamily: 'var(--font-cormorant, serif)',
              fontSize: 'clamp(1.3rem, 3vw, 1.7rem)',
              fontWeight: 600, lineHeight: 1.3,
              color: '#f0e8d8', marginBottom: '1rem',
              paddingBottom: '0.5rem',
              borderBottom: '0.5px solid rgba(201,160,67,0.15)',
            }}>
              {section.h2}
            </h2>

            {section.image && (
              <img
                src={section.image}
                alt={section.h2}
                loading="lazy"
                style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: '10px', display: 'block', marginBottom: '1.25rem' }}
              />
            )}

            {section.highlight && (
              <blockquote style={{
                background: 'rgba(201,160,67,0.06)', borderLeft: '3px solid #C9A043',
                padding: '1rem 1.25rem', borderRadius: '0 8px 8px 0',
                margin: '1.25rem 0', fontStyle: 'italic',
                color: 'rgba(240,232,216,0.8)', fontSize: '0.95rem', lineHeight: 1.7,
              }}>
                {section.highlight}
              </blockquote>
            )}

            {section.content.split('\n\n').map((para, j) => (
              <p key={j} style={{ fontSize: '1rem', lineHeight: 1.8, color: 'rgba(240,232,216,0.72)', marginBottom: '1rem' }}>
                {para}
              </p>
            ))}
          </section>
        ))}

        {/* CTA */}
        {art.cta && (
          <div style={{
            background: 'rgba(201,160,67,0.07)', border: '1px solid rgba(201,160,67,0.2)',
            borderRadius: '16px', padding: '2rem', textAlign: 'center', margin: '3rem 0',
          }}>
            <p style={{ fontSize: '1rem', color: 'rgba(240,232,216,0.8)', marginBottom: '1.25rem', lineHeight: 1.7 }}>
              {art.cta}
            </p>
            <Link
              href="/#contacto"
              style={{
                display: 'inline-block', background: '#C9A043', color: '#0a0a0a',
                padding: '14px 32px', borderRadius: '8px', fontWeight: 700,
                textDecoration: 'none', fontSize: '0.9rem', minHeight: '48px',
                lineHeight: '20px', letterSpacing: '0.05em',
              }}
            >
              Hablar con Grupo Skyline
            </Link>
          </div>
        )}

        {/* FAQ */}
        {art.faq?.length > 0 && (
          <section style={{ marginTop: '3rem' }}>
            <h2 style={{
              fontFamily: 'var(--font-cormorant, serif)',
              fontSize: 'clamp(1.3rem, 3vw, 1.7rem)',
              fontWeight: 600, color: '#f0e8d8', marginBottom: '1.5rem',
            }}>
              Preguntas frecuentes
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
              {art.faq.map((item, i) => (
                <div key={i} style={{ borderBottom: '0.5px solid rgba(201,160,67,0.12)', padding: '1.25rem 0' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: '#f0e8d8', marginBottom: '0.5rem', lineHeight: 1.4 }}>
                    {item.question}
                  </h3>
                  <p style={{ fontSize: '0.92rem', color: 'rgba(240,232,216,0.62)', lineHeight: 1.75, margin: 0 }}>
                    {item.answer}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Footer nav */}
        <div style={{ marginTop: '4rem', paddingTop: '2rem', borderTop: '0.5px solid rgba(201,160,67,0.12)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <Link href="/blog" style={{ fontSize: '0.8rem', color: 'rgba(201,160,67,0.7)', textDecoration: 'none' }}>
            ← Volver al blog
          </Link>
          <Link href="/" style={{ fontSize: '0.8rem', color: 'rgba(201,160,67,0.7)', textDecoration: 'none' }}>
            gruposkyline.com
          </Link>
        </div>
      </article>
    </main>
  )
}
