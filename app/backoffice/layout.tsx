'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { useTheme } from '@/components/ThemeProvider'

type CitaPendiente = {
  id: string
  created_at: string
  tipo: string
  fecha_propuesta: string | null
  hora_propuesta: string | null
  mensaje: string
  clientes: { nombre: string; apellidos: string; email: string } | null
}

export default function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const [ready, setReady] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { theme, setTheme } = useTheme()

  // Notificaciones de citas pendientes
  const [citasPendientes, setCitasPendientes] = useState<CitaPendiente[]>([])
  const [leadsNuevos, setLeadsNuevos] = useState(0)
  const [showNotifBell, setShowNotifBell] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (pathname === '/backoffice') { setReady(true); return }
    fetch('/api/backoffice/clientes', { method: 'HEAD' }).then(r => {
      if (r.status === 401) router.replace('/backoffice')
      else setReady(true)
    })
  }, [pathname, router])

  // Cargar citas pendientes cada 60s
  useEffect(() => {
    if (!ready || pathname === '/backoffice') return
    function loadCitas() {
      fetch('/api/backoffice/citas?estado=pendiente')
        .then(r => r.ok ? r.json() : [])
        .then(d => setCitasPendientes(Array.isArray(d) ? d : []))
    }
    loadCitas()
    // Cargar leads nuevos
    fetch('/api/backoffice/leads')
      .then(r => r.ok ? r.json() : [])
      .then(d => setLeadsNuevos(Array.isArray(d) ? d.filter((l: any) => l.estado === 'nuevo').length : 0))
    const interval = setInterval(loadCitas, 60000)
    return () => clearInterval(interval)
  }, [ready, pathname])

  // Click fuera cierra el dropdown
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setShowNotifBell(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

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
    { href: '/backoffice/citas', label: 'Citas', icon: '📞' },
    { href: '/backoffice/leads', label: 'Leads SKYLLER', icon: '📥' },
    { href: '/backoffice/ia', label: 'IA Asistente', icon: '🤖' },
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
        <button onClick={() => setSidebarOpen(false)} className="bo-hamburger" style={{ fontSize: '18px' }}>×</button>
      </div>
      <nav style={{ flex: 1, padding: '1.5rem 0', overflowY: 'auto' }}>
        {navItems.map(item => {
          const esCitas = item.href === '/backoffice/citas'
          return (
            <Link key={item.href} href={item.href} style={{
              display: 'flex', alignItems: 'center', gap: '10px',
              padding: '0.65rem 1.5rem', fontSize: '0.83rem', textDecoration: 'none',
              color: pathname.startsWith(item.href) ? 'var(--gold-100)' : 'var(--text-2)',
              background: pathname.startsWith(item.href) ? 'rgba(201,160,67,0.08)' : 'transparent',
              borderLeft: pathname.startsWith(item.href) ? '2px solid var(--gold-200)' : '2px solid transparent',
              transition: 'all 0.2s', position: 'relative',
            }}>
              <span style={{ fontSize: '13px', opacity: 0.7 }}>{item.icon}</span>
              {item.label}
              {esCitas && citasPendientes.length > 0 && (
                <span style={{ marginLeft: 'auto', background: '#C9A043', color: '#0a0a0a', borderRadius: '10px', padding: '1px 7px', fontSize: '10px', fontWeight: 700 }}>
                  {citasPendientes.length}
                </span>
              )}
              {item.href === '/backoffice/leads' && leadsNuevos > 0 && (
                <span style={{ marginLeft: 'auto', background: '#4da6d4', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '10px', fontWeight: 700 }}>
                  {leadsNuevos}
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
        <Link href="/" style={{ fontSize: '0.78rem', color: 'var(--text-3)', textDecoration: 'none' }}>
          ← Volver a la web
        </Link>
      </div>
    </aside>
  )

  return (
    <div data-backoffice style={{ minHeight: '100vh', background: 'var(--bg-0)', display: 'flex' }}>
      {sidebarOpen && <div className="bo-overlay open" onClick={() => setSidebarOpen(false)} />}

      <Sidebar />

      <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        {/* Top bar (mobile + campana de notificaciones) */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '0.85rem 1.5rem', borderBottom: '0.5px solid var(--gold-border)', background: 'var(--bg-1)', position: 'sticky', top: 0, zIndex: 100 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button className="bo-hamburger" onClick={() => setSidebarOpen(true)} style={{ display: 'flex' }}>☰</button>
            <img src="/logo.png" alt="Grupo SkyLine Investment" style={{ height: '32px', width: 'auto', display: 'block' }} />
          </div>

          {/* ── CAMPANA DE NOTIFICACIONES ── */}
          <div ref={bellRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowNotifBell(v => !v)}
              style={{ position: 'relative', background: citasPendientes.length > 0 ? 'rgba(201,160,67,0.1)' : 'var(--bg-2)', border: `0.5px solid ${citasPendientes.length > 0 ? 'rgba(201,160,67,0.4)' : 'var(--gold-border)'}`, borderRadius: '10px', padding: '8px 14px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s' }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={citasPendientes.length > 0 ? '#C9A043' : 'var(--text-2)'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              {citasPendientes.length > 0 && (
                <>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#C9A043' }}>
                    {citasPendientes.length} llamada{citasPendientes.length > 1 ? 's' : ''} pendiente{citasPendientes.length > 1 ? 's' : ''}
                  </span>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#C9A043', animation: 'pulse 2s infinite', flexShrink: 0 }} />
                </>
              )}
              {citasPendientes.length === 0 && (
                <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Sin alertas</span>
              )}
            </button>

            {/* Dropdown de citas pendientes */}
            {showNotifBell && (
              <div style={{ position: 'absolute', right: 0, top: '48px', width: '360px', background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)', zIndex: 300, overflow: 'hidden' }}>
                <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid var(--gold-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-0)' }}>📞 Solicitudes de llamada</div>
                  {citasPendientes.length > 0 && (
                    <span style={{ background: '#C9A043', color: '#0a0a0a', borderRadius: '10px', padding: '2px 8px', fontSize: '10px', fontWeight: 700 }}>
                      {citasPendientes.length} nueva{citasPendientes.length > 1 ? 's' : ''}
                    </span>
                  )}
                </div>

                <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                  {citasPendientes.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '12px' }}>
                      Sin solicitudes pendientes
                    </div>
                  ) : citasPendientes.map(cita => (
                    <div key={cita.id} style={{ padding: '0.9rem 1.25rem', borderBottom: '0.5px solid rgba(201,160,67,0.07)', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(201,160,67,0.08)', border: '0.5px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', flexShrink: 0 }}>📞</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-0)', marginBottom: '2px' }}>
                          {cita.clientes ? `${cita.clientes.nombre} ${cita.clientes.apellidos}` : 'Cliente'}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-2)', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {cita.mensaje}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--text-3)', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          {cita.fecha_propuesta && <span>📅 {new Date(cita.fecha_propuesta + 'T00:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}{cita.hora_propuesta ? ` · ${cita.hora_propuesta}` : ''}</span>}
                          <span>{new Date(cita.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <Link href="/backoffice/citas" onClick={() => setShowNotifBell(false)}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '0.85rem', background: 'rgba(201,160,67,0.05)', borderTop: '0.5px solid var(--gold-border)', color: 'var(--gold-200)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600, textDecoration: 'none' }}>
                  Gestionar todas →
                </Link>
              </div>
            )}
          </div>
        </div>

        <style>{`
          @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        `}</style>
        {children}
      </main>
    </div>
  )
}
