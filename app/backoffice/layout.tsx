'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useTheme } from '@/components/ThemeProvider'

export default function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    if (pathname === '/backoffice') { setReady(true); return }
    fetch('/api/backoffice/clientes', { method: 'HEAD' }).then(r => {
      if (r.status === 401) router.replace('/backoffice')
      else setReady(true)
    })
  }, [pathname, router])

  // Close sidebar on route change
  useEffect(() => { setSidebarOpen(false) }, [pathname])

  if (!ready) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Cargando…</span>
    </div>
  )

  if (pathname === '/backoffice') return <>{children}</>

  const navItems = [
    { href: '/backoffice/dashboard', label: 'Dashboard', icon: '▦' },
    { href: '/backoffice/clientes', label: 'Clientes', icon: '👤' },
    { href: '/backoffice/participaciones', label: 'Participaciones', icon: '📊' },
    { href: '/backoffice/contabilidad', label: 'Contabilidad', icon: '💰' },
    { href: '/backoffice/analytics', label: 'Analytics', icon: '📈' },
    { href: '/backoffice/chat', label: 'Chat Privado', icon: '💬' },
    { href: '/backoffice/operaciones', label: 'Op. Estudiadas', icon: '📄' },
    { href: '/backoffice/rent-to-rent', label: 'Rent to Rent', icon: '🏠' },
    { href: '/backoffice/referidos', label: 'Referidos', icon: '🔗' },
    { href: '/backoffice/calendario', label: 'Calendario', icon: '📅' },
    { href: '/backoffice/pagos', label: 'Pagos', icon: '💳' },
    { href: '/backoffice/configuracion', label: 'Configuración', icon: '⚙' },
  ]

  const Sidebar = () => (
    <aside className={`bo-sidebar${sidebarOpen ? ' open' : ''}`}>
      <div style={{ padding: '0 1.5rem 2rem', borderBottom: '0.5px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.25rem' }}>
            <img src="/logo.png" alt="Grupo SkyLine Investment" style={{ height: '38px', width: 'auto', display: 'block' }} />
          </div>
          <div style={{ fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold-300)', marginTop: '4px' }}>
            Admin Panel
          </div>
        </div>
        {/* Mobile close button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="bo-hamburger"
          style={{ fontSize: '18px' }}
        >×</button>
      </div>
      <nav style={{ flex: 1, padding: '1.5rem 0', overflowY: 'auto' }}>
        {navItems.map(item => (
          <Link key={item.href} href={item.href} style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '0.65rem 1.5rem',
            fontSize: '0.83rem', textDecoration: 'none',
            color: pathname.startsWith(item.href) ? 'var(--gold-100)' : 'var(--text-2)',
            background: pathname.startsWith(item.href) ? 'rgba(201,160,67,0.08)' : 'transparent',
            borderLeft: pathname.startsWith(item.href) ? '2px solid var(--gold-200)' : '2px solid transparent',
            transition: 'all 0.2s',
          }}>
            <span style={{ fontSize: '13px', opacity: 0.7 }}>{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>
      <div style={{ padding: '1rem 1.5rem', borderTop: '0.5px solid var(--gold-border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          style={{ background: 'var(--gold-muted)', border: '0.5px solid var(--gold-border)', color: 'var(--gold-200)', padding: '7px 12px', borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: '11px', letterSpacing: '0.08em', textAlign: 'left', width: '100%' }}
        >
          {theme === 'dark' ? '☀️ Modo día' : '🌙 Modo noche'}
        </button>
        <Link href="/" style={{ fontSize: '0.78rem', color: 'var(--text-3)', textDecoration: 'none' }}>
          ← Volver a la web
        </Link>
      </div>
    </aside>
  )

  return (
    <div data-backoffice style={{ minHeight: '100vh', background: 'var(--bg-0)', display: 'flex' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="bo-overlay open" onClick={() => setSidebarOpen(false)} />
      )}

      <Sidebar />

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {/* Mobile top bar */}
        <div style={{ display: 'none', alignItems: 'center', gap: '12px', padding: '1rem 1.25rem', borderBottom: '0.5px solid var(--gold-border)', background: 'var(--bg-1)', position: 'sticky', top: 0, zIndex: 100 }}
          className="bo-mobile-bar">
          <button className="bo-hamburger" onClick={() => setSidebarOpen(true)} style={{ display: 'flex' }}>☰</button>
          <img src="/logo.png" alt="Grupo SkyLine Investment" style={{ height: '32px', width: 'auto', display: 'block' }} />
        </div>
        <style>{`
          @media (max-width: 768px) {
            .bo-mobile-bar { display: flex !important; }
          }
        `}</style>
        {children}
      </main>
    </div>
  )
}
