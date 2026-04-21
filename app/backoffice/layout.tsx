'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useTheme } from '@/components/ThemeProvider'

export default function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, setTheme } = useTheme()
  const [alertas, setAlertas] = useState(0)

  useEffect(() => {
    if (pathname === '/backoffice') { setReady(true); return }
    fetch('/api/backoffice/clientes', { method: 'HEAD' }).then(r => {
      if (r.status === 401) router.replace('/backoffice')
      else setReady(true)
    })
  }, [pathname, router])

  useEffect(() => {
    if (!ready || pathname === '/backoffice') return
    fetch('/api/backoffice/boe?pendiente=1').then(r => r.ok ? r.json() : { count: 0 }).then(d => setAlertas(d.count ?? 0))
    const iv = setInterval(() => {
      fetch('/api/backoffice/boe?pendiente=1').then(r => r.ok ? r.json() : { count: 0 }).then(d => setAlertas(d.count ?? 0))
    }, 60000)
    return () => clearInterval(iv)
  }, [ready, pathname])

  useEffect(() => { setSidebarOpen(false) }, [pathname])

  if (!ready) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Cargando…</span>
    </div>
  )

  if (pathname === '/backoffice') return <>{children}</>

  const navItems = [
    { href: '/backoffice/dashboard',    label: 'Dashboard',        icon: '▦' },
    { href: '/backoffice/usuarios',     label: 'Usuarios',         icon: '👤' },
    { href: '/backoffice/oposiciones',  label: 'Oposiciones',      icon: '📚' },
    { href: '/backoffice/preguntas',    label: 'Banco Preguntas',  icon: '❓' },
    { href: '/backoffice/documentos',   label: 'Documentos',       icon: '📄', sub: true },
    { href: '/backoffice/examenes',     label: 'Exámenes',         icon: '📝' },
    { href: '/backoffice/boe',          label: 'BOE Radar',        icon: '📡' },
    { href: '/backoffice/analytics',    label: 'Analytics',        icon: '📈' },
    { href: '/backoffice/ia',           label: 'IA Asistente',     icon: '🤖' },
    { href: '/backoffice/ia-uso',       label: 'Consumo IA',       icon: '💡', sub: true },
    { href: '/backoffice/pagos',        label: 'Pagos',            icon: '💳' },
    { href: '/backoffice/seo-blog',     label: 'SEO / Blog',       icon: '✍️' },
    { href: '/backoffice/configuracion',label: 'Configuración',    icon: '⚙' },
  ]

  const Sidebar = () => (
    <aside className={`bo-sidebar${sidebarOpen ? ' open' : ''}`}>
      <div style={{ padding: '0 1.5rem 2rem', borderBottom: '0.5px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <span className="serif" style={{ fontSize: '1.4rem', fontWeight: 300, color: 'var(--gold-100)' }}>Aprobea</span>
          <div style={{ fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold-300)', marginTop: '4px' }}>Admin Panel</div>
        </div>
        <button onClick={() => setSidebarOpen(false)} className="bo-hamburger" style={{ fontSize: '18px' }}>×</button>
      </div>
      <nav style={{ flex: 1, padding: '1.5rem 0', overflowY: 'auto' }}>
        {navItems.map(item => {
          const isSub    = (item as any).sub === true
          const isActive = pathname.startsWith(item.href)
          const isBoe    = item.href === '/backoffice/boe'
          return (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: isSub ? '0.45rem 1.5rem 0.45rem 2.5rem' : '0.65rem 1.5rem',
              fontSize: isSub ? '0.77rem' : '0.83rem', textDecoration: 'none',
              color: isActive ? 'var(--gold-100)' : isSub ? 'var(--text-3)' : 'var(--text-2)',
              background: isActive ? 'rgba(201,160,67,0.08)' : 'transparent',
              borderLeft: isActive ? '2px solid var(--gold-200)' : '2px solid transparent',
              transition: 'all 0.2s', position: 'relative',
            }}>
              <span style={{ fontSize: isSub ? '11px' : '13px', opacity: 0.7 }}>{item.icon}</span>
              {item.label}
              {isBoe && alertas > 0 && (
                <span style={{ marginLeft: 'auto', background: '#4d9fd4', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '10px', fontWeight: 700 }}>
                  {alertas}
                </span>
              )}
            </Link>
          )
        })}
      </nav>
      <div style={{ padding: '1rem 1.5rem', borderTop: '0.5px solid var(--gold-border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          style={{ background: 'var(--gold-muted)', border: '0.5px solid var(--gold-border)', color: 'var(--gold-200)', padding: '7px 12px', borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: '11px', letterSpacing: '0.08em', textAlign: 'left', width: '100%' }}
        >
          {theme === 'dark' ? '☀️ Modo día' : '🌙 Modo noche'}
        </button>
        <Link href="/" style={{ fontSize: '0.78rem', color: 'var(--text-3)', textDecoration: 'none' }}>← Volver a la web</Link>
      </div>
    </aside>
  )

  return (
    <div data-backoffice style={{ minHeight: '100vh', background: 'var(--bg-0)', display: 'flex' }}>
      {sidebarOpen && <div className="bo-overlay open" onClick={() => setSidebarOpen(false)} />}
      <Sidebar />
      <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '0.85rem 1.5rem', borderBottom: '0.5px solid var(--gold-border)', background: 'var(--bg-1)', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="bo-hamburger" onClick={() => setSidebarOpen(true)} style={{ display: 'flex' }}>☰</button>
            <span className="serif" style={{ fontSize: '1.2rem', fontWeight: 300, color: 'var(--gold-100)' }}>Aprobea <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>Admin</span></span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
            {alertas > 0 && <span style={{ background: 'rgba(77,159,212,0.15)', border: '0.5px solid rgba(77,159,212,0.3)', color: '#4d9fd4', padding: '4px 10px', borderRadius: '8px', fontSize: '10px', fontWeight: 600 }}>📡 {alertas} pub. BOE sin procesar</span>}
          </div>
        </div>
        {children}
      </main>
    </div>
  )
}
