'use client'

import { useTheme } from '@/components/ThemeProvider'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ConfiguracionUsuarioPage() {
  const { theme, lang, setTheme, setLang } = useTheme()
  const router = useRouter()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0)' }}>
      {/* Nav */}
      <nav style={{ borderBottom: '0.5px solid var(--gold-border)', padding: '0 3rem', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: 'var(--bg-0)', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'block' }}>
            <img src="/logo.png" alt="Grupo SkyLine Investment" style={{ height: '40px', width: 'auto', display: 'block' }} />
          </Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link href="/dashboard" style={{ fontSize: '0.82rem', color: 'var(--text-2)', textDecoration: 'none' }}>← Mi cuenta</Link>
          <button onClick={handleLogout} style={{ background: 'transparent', border: '0.5px solid var(--gold-border)', color: 'var(--gold-200)', padding: '6px 16px', borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: '0.78rem', letterSpacing: '0.08em' }}>Salir</button>
        </div>
      </nav>

      <div style={{ maxWidth: '640px', margin: '0 auto', padding: '3rem 2rem' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.5rem' }}>Mi cuenta</div>
          <h1 className="serif" style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--text-0)' }}>Preferencias</h1>
        </div>

        {/* Modo */}
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '2rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '1.25rem' }}>Apariencia</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {([['dark', '🌙 Modo noche'], ['light', '☀️ Modo día']] as [string, string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setTheme(val as 'dark' | 'light')}
                style={{
                  padding: '1rem',
                  background: theme === val ? 'var(--gold-muted)' : 'var(--bg-0)',
                  border: `0.5px solid ${theme === val ? 'var(--gold-200)' : 'var(--gold-border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  color: theme === val ? 'var(--gold-100)' : 'var(--text-2)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  fontWeight: theme === val ? 500 : 300,
                  transition: 'all 0.2s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Idioma */}
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '2rem' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '1.25rem' }}>Idioma</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            {([['es', '🇪🇸 Español'], ['en', '🇬🇧 English']] as [string, string][]).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setLang(val as 'es' | 'en')}
                style={{
                  padding: '1rem',
                  background: lang === val ? 'var(--gold-muted)' : 'var(--bg-0)',
                  border: `0.5px solid ${lang === val ? 'var(--gold-200)' : 'var(--gold-border)'}`,
                  borderRadius: 'var(--radius-lg)',
                  color: lang === val ? 'var(--gold-100)' : 'var(--text-2)',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  fontWeight: lang === val ? 500 : 300,
                  transition: 'all 0.2s',
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '1rem' }}>
            {lang === 'es' ? 'El idioma se aplicará en tu próxima sesión.' : 'Language will be applied on your next session.'}
          </p>
        </div>
      </div>
    </div>
  )
}
