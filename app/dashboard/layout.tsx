'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useTheme } from '@/components/ThemeProvider'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [perfil, setPerfil] = useState<any>(null)
  const [notifCount, setNotifCount] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.replace('/login'); return }
      setUser(data.user)
      supabase.from('perfiles').select('*').eq('id', data.user.id).single()
        .then(({ data: p }) => setPerfil(p))
      supabase.from('notificaciones_usuario').select('id', { count: 'exact', head: true }).eq('user_id', data.user.id).eq('leida', false)
        .then(({ count }) => setNotifCount(count ?? 0))
    })
  }, [router])

  useEffect(() => { setSidebarOpen(false) }, [pathname])

  if (!user) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: 'var(--text-2)', fontSize: '0.85rem' }}>Cargando…</span>
    </div>
  )

  const nav = [
    { href: '/dashboard',                label: 'Inicio',          icon: '▦' },
    { href: '/dashboard/oposiciones',    label: 'Mis Oposiciones', icon: '📚' },
    { href: '/dashboard/examenes',       label: 'Exámenes',        icon: '📝' },
    { href: '/dashboard/progreso',       label: 'Mi Progreso',     icon: '📊' },
    { href: '/dashboard/boe-radar',      label: 'BOE Radar',       icon: '📡' },
    { href: '/dashboard/plan-estudio',   label: 'Plan de Estudio', icon: '📅' },
    { href: '/dashboard/flashcards',     label: 'Flashcards',      icon: '🃏' },
    { href: '/dashboard/ranking',        label: 'Ranking',         icon: '🏆' },
    { href: '/dashboard/configuracion',  label: 'Configuración',   icon: '⚙' },
  ]

  const initials = (perfil?.nombre?.[0] ?? user.email?.[0] ?? '?').toUpperCase()
  const planColor: Record<string, string> = { free: 'var(--text-3)', basico: '#4d9fd4', pro: 'var(--gold-100)', elite: '#e07a4d' }

  const Sidebar = () => (
    <aside className={`bo-sidebar${sidebarOpen ? ' open' : ''}`}>
      <div style={{ padding: '0 1.5rem 1.5rem', borderBottom: '0.5px solid var(--gold-border)' }}>
        <span className="serif" style={{ fontSize: '1.4rem', fontWeight: 300, color: 'var(--gold-100)' }}>Aprobea</span>
      </div>
      <nav style={{ flex: 1, padding: '1rem 0', overflowY: 'auto' }}>
        {nav.map(item => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          return (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: '10px', padding: '0.65rem 1.5rem',
              fontSize: '0.83rem', textDecoration: 'none',
              color: isActive ? 'var(--gold-100)' : 'var(--text-2)',
              background: isActive ? 'rgba(201,160,67,0.08)' : 'transparent',
              borderLeft: isActive ? '2px solid var(--gold-200)' : '2px solid transparent',
              transition: 'all 0.2s',
            }}>
              <span style={{ fontSize: '13px', opacity: 0.7 }}>{item.icon}</span>
              {item.label}
            </Link>
          )
        })}
      </nav>
      <div style={{ padding: '1rem 1.5rem', borderTop: '0.5px solid var(--gold-border)', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {/* Perfil */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: 'linear-gradient(135deg,var(--gold-200),#8B6E2D)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: '#060709', fontWeight: 700, flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '11px', color: 'var(--text-0)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {perfil?.nombre ?? user.email?.split('@')[0]}
            </div>
            <div style={{ fontSize: '9px', color: planColor[perfil?.plan ?? 'free'], textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {perfil?.plan ?? 'free'}
            </div>
          </div>
        </div>
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          style={{ background: 'var(--gold-muted)', border: '0.5px solid var(--gold-border)', color: 'var(--gold-200)', padding: '7px 12px', borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: '11px', textAlign: 'left', width: '100%' }}
        >
          {theme === 'dark' ? '☀️ Modo día' : '🌙 Modo noche'}
        </button>
        <button
          onClick={async () => { await supabase.auth.signOut(); router.push('/') }}
          style={{ background: 'transparent', border: '0.5px solid rgba(255,255,255,0.08)', color: 'var(--text-3)', padding: '7px 12px', borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: '11px', textAlign: 'left', width: '100%' }}
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  )

  return (
    <div data-backoffice style={{ minHeight: '100vh', background: 'var(--bg-0)', display: 'flex' }}>
      {sidebarOpen && <div className="bo-overlay open" onClick={() => setSidebarOpen(false)} />}
      <Sidebar />
      <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {/* Topbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '0.85rem 1.5rem', borderBottom: '0.5px solid var(--gold-border)', background: 'var(--bg-1)', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="bo-hamburger" onClick={() => setSidebarOpen(true)} style={{ display: 'flex' }}>☰</button>
            <span className="serif" style={{ fontSize: '1.1rem', fontWeight: 300, color: 'var(--gold-100)' }}>Aprobea</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {notifCount > 0 && (
              <div style={{ background: 'rgba(201,160,67,0.1)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', padding: '4px 10px', fontSize: '11px', color: 'var(--gold-200)' }}>
                🔔 {notifCount}
              </div>
            )}
            {perfil?.plan && perfil.plan !== 'pro' && perfil.plan !== 'elite' && (
              <a href="/dashboard/configuracion" style={{ background: 'var(--gold-200)', color: '#000', padding: '5px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 600, textDecoration: 'none', letterSpacing: '0.04em' }}>
                Mejorar plan ↑
              </a>
            )}
          </div>
        </div>
        {children}
      </main>
    </div>
  )
}
