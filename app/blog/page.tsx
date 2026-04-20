import type { Metadata } from 'next'
import Link from 'next/link'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const metadata: Metadata = {
  title: 'Blog de inversión inmobiliaria — Grupo Skyline',
  description: 'Artículos sobre inversión inmobiliaria, activos de banco, créditos hipotecarios y NPLs. Aprende a rentabilizar tu capital con Grupo Skyline.',
  openGraph: {
    title: 'Blog — Grupo Skyline',
    description: 'Guías y análisis sobre inversión en activos inmobiliarios y créditos hipotecarios en España.',
    type: 'website',
    url: 'https://gruposkyline.com/blog',
  },
}

type ArticuloResumen = {
  id: string
  slug: string
  meta_title: string
  meta_description: string
  h1: string
  keyword: string | null
  hero_image: string | null
  hero_image_thumb: string | null
  created_at: string
}

async function getArticulos(): Promise<ArticuloResumen[]> {
  const { data } = await supabaseAdmin
    .from('articulos')
    .select('id, slug, meta_title, meta_description, h1, keyword, hero_image, hero_image_thumb, created_at')
    .eq('estado', 'publicado')
    .order('created_at', { ascending: false })
  return data ?? []
}

export default async function BlogPage() {
  const articulos = await getArticulos()

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
        <span style={{ fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(201,160,67,0.7)' }}>
          Blog · Inversión Inmobiliaria
        </span>
      </div>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '3rem 1.5rem 6rem' }}>
        <div style={{ marginBottom: '3rem' }}>
          <h1 style={{
            fontFamily: 'var(--font-cormorant, serif)', fontSize: 'clamp(2rem, 5vw, 3rem)',
            fontWeight: 600, lineHeight: 1.2, marginBottom: '0.75rem',
            color: '#f0e8d8',
          }}>
            Inversión inmobiliaria,<br />explicada con claridad
          </h1>
          <p style={{ fontSize: '1rem', color: 'rgba(240,232,216,0.6)', maxWidth: '520px', lineHeight: 1.7 }}>
            Guías, análisis y estrategias para invertir en activos de banco, embargos y créditos hipotecarios en España.
          </p>
        </div>

        {articulos.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '5rem 2rem', color: 'rgba(240,232,216,0.3)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✍️</div>
            <p>Próximamente — los primeros artículos están en camino.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '1.5rem' }}>
            {articulos.map(art => (
              <Link key={art.id} href={`/blog/${art.slug}`} style={{ textDecoration: 'none' }}>
                <article style={{
                  display: 'grid', gridTemplateColumns: art.hero_image_thumb ? '1fr 180px' : '1fr',
                  gap: '1.5rem', alignItems: 'center',
                  background: 'rgba(201,160,67,0.03)', border: '0.5px solid rgba(201,160,67,0.12)',
                  borderRadius: '16px', padding: '1.75rem', transition: 'all 0.2s',
                }}>
                  <div>
                    <div style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(201,160,67,0.6)', marginBottom: '0.6rem' }}>
                      {art.keyword ?? 'Inversión inmobiliaria'} · {new Date(art.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </div>
                    <h2 style={{
                      fontFamily: 'var(--font-cormorant, serif)', fontSize: 'clamp(1.25rem, 3vw, 1.55rem)',
                      fontWeight: 600, lineHeight: 1.3, color: '#f0e8d8', marginBottom: '0.75rem',
                    }}>
                      {art.h1}
                    </h2>
                    <p style={{ fontSize: '0.88rem', color: 'rgba(240,232,216,0.55)', lineHeight: 1.65, margin: 0 }}>
                      {art.meta_description}
                    </p>
                    <span style={{ display: 'inline-block', marginTop: '1rem', fontSize: '0.78rem', color: '#C9A043', fontWeight: 500 }}>
                      Leer artículo →
                    </span>
                  </div>
                  {art.hero_image_thumb && (
                    <img
                      src={art.hero_image_thumb}
                      alt={art.h1}
                      loading="lazy"
                      style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', borderRadius: '10px', display: 'block' }}
                    />
                  )}
                </article>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
