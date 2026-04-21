'use client'

import { useEffect, useRef, useState } from 'react'

export default function Home() {
  const [scrolled, setScrolled] = useState(false)
  const [openModal, setOpenModal] = useState<'registro' | null>(null)
  const [form, setForm] = useState({ nombre: '', email: '', password: '', oposicion: '' })
  const [formLoading, setFormLoading] = useState(false)
  const [formDone, setFormDone] = useState(false)
  const [formError, setFormError] = useState('')
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Canvas particles
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    type P = { x: number; y: number; r: number; a: number; s: number; o: number }
    const particles: P[] = []
    let rafId: number
    const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight }
    resize()
    window.addEventListener('resize', resize)
    for (let i = 0; i < 60; i++) {
      particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, r: Math.random() * 1.2 + 0.3, a: Math.random() * Math.PI * 2, s: Math.random() * 0.25 + 0.05, o: Math.random() * 0.4 + 0.1 })
    }
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += Math.cos(p.a) * p.s; p.y += Math.sin(p.a) * p.s
        if (p.x < 0) p.x = canvas.width; if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height; if (p.y > canvas.height) p.y = 0
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(29,158,117,${p.o})`; ctx.fill()
      })
      rafId = requestAnimationFrame(draw)
    }
    draw()
    return () => { cancelAnimationFrame(rafId); window.removeEventListener('resize', resize) }
  }, [])

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.1 }
    )
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  // Nav scroll
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = openModal ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [openModal])

  async function handleRegistro(e: React.FormEvent) {
    e.preventDefault()
    setFormLoading(true); setFormError('')
    try {
      const res = await fetch('/api/auth/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error al registrarse')
      setFormDone(true)
    } catch (err: any) {
      setFormError(err.message)
    } finally {
      setFormLoading(false)
    }
  }

  return (
    <>
      {/* NAV */}
      <nav className="site-nav" style={{ background: scrolled ? 'rgba(6,7,9,0.98)' : 'rgba(6,7,9,0.7)', backdropFilter: 'blur(12px)' }}>
        <a className="nav-logo" href="#">
          <span className="serif" style={{ fontSize: '1.6rem', fontWeight: 300, color: 'var(--gold-100)', letterSpacing: '-0.02em' }}>Aprobea</span>
          <span style={{ fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase', color: 'var(--text-3)', marginLeft: '2px', alignSelf: 'flex-end', marginBottom: '3px' }}>.com</span>
        </a>
        <div className="nav-right">
          <a href="/login" className="btn-nav btn-nav-login">Iniciar sesión</a>
          <a href="/login" className="btn-nav" style={{ background: 'var(--gold-200)', color: '#000', fontWeight: 600, border: 'none' }}>
            Empezar gratis
          </a>
        </div>
      </nav>

      {/* HERO */}
      <section id="hero">
        <canvas id="hero-canvas" ref={canvasRef} />
        <div className="hero-inner">
          <div className="hero-tag">BOE Radar · IA Tutor · Exámenes Adaptativos</div>
          <h1 className="hero-h1">
            <span>Tu próxima<br />oposición,<br /><em>aprobada.</em></span>
          </h1>
          <p className="hero-sub">
            La plataforma más avanzada para preparar oposiciones en España. IA que te corrige, aprende de tus fallos y te guía hasta el aprobado.
          </p>
          <div className="hero-ctas">
            <a href="/login" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>Empezar gratis →</a>
            <button className="btn-outline" onClick={() => document.getElementById('como-funciona')?.scrollIntoView({ behavior: 'smooth' })}>
              Ver cómo funciona
            </button>
          </div>
          <div style={{ display: 'flex', gap: '2rem', marginTop: '3rem', flexWrap: 'wrap' }}>
            {[['12.400+', 'Opositores activos'], ['340+', 'Oposiciones cubiertas'], ['2.1M+', 'Preguntas en el banco'], ['89%', 'Tasa de mejora']].map(([n, l]) => (
              <div key={l}>
                <div className="serif" style={{ fontSize: '1.6rem', fontWeight: 300, color: 'var(--gold-100)' }}>{n}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.06em' }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="scroll-hint"><div className="scroll-line" /><span>Descubrir</span></div>
      </section>

      {/* FEATURES PRINCIPALES */}
      <section id="features" style={{ padding: '7rem 2rem', background: 'var(--bg-0)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="section-tag reveal">Motor de estudio inteligente</div>
          <h2 className="section-h2 serif reveal">Estudia menos.<br /><em>Aprueba más.</em></h2>
          <p className="section-intro reveal">Cada sesión de estudio está optimizada por IA. El sistema aprende de tus fallos y adapta el contenido en tiempo real.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.5rem', marginTop: '4rem' }} className="features-grid">
            {[
              {
                icon: '📡',
                title: 'BOE Radar',
                desc: 'Monitoreo automático 24/7 del BOE estatal y todos los BOES autonómicos. Alertas instantáneas de nuevas convocatorias, bases, y actualizaciones de temarios.',
                tags: ['BOE Estatal', '17 BOES Autonómicos', 'Alertas email'],
              },
              {
                icon: '🧠',
                title: 'IA Tutor Personalizado',
                desc: 'Cada corrección incluye explicación detallada basada en el temario oficial. La IA recuerda todos tus fallos y construye baterías de repaso adaptadas.',
                tags: ['Claude AI', 'Memoria persistente', 'RAG sobre temario'],
              },
              {
                icon: '📊',
                title: 'Exámenes Adaptativos (IRT)',
                desc: 'Algoritmo Item Response Theory que ajusta la dificultad a tu nivel real. No pierdas tiempo con lo que ya dominas ni te frustres con lo que no puedes aún.',
                tags: ['IRT Algorithm', 'Dificultad dinámica', 'Simulacros reales'],
              },
              {
                icon: '🗺️',
                title: 'Mapa de Conocimiento',
                desc: 'Visualiza tu dominio de cada tema en tiempo real. Detecta brechas de conocimiento y recibe recomendaciones de qué estudiar hoy.',
                tags: ['Heat map', 'Progreso por tema', 'Gaps detector'],
              },
              {
                icon: '🃏',
                title: 'Spaced Repetition',
                desc: 'Flashcards con algoritmo SM-2. El sistema decide cuándo repetir cada concepto para maximizar la retención a largo plazo con el mínimo tiempo.',
                tags: ['SM-2', 'Retención óptima', 'Flashcards IA'],
              },
              {
                icon: '📅',
                title: 'Plan de Estudio IA',
                desc: 'Dinos tu fecha de examen y horas disponibles. La IA genera un plan semana a semana, ajustado a tu progreso y con recordatorios automáticos.',
                tags: ['Personalizado', 'Calendario export', 'Ajuste dinámico'],
              },
            ].map(f => (
              <div key={f.title} className="reveal service-card" style={{ cursor: 'default' }}>
                <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{f.icon}</div>
                <div className="service-title serif">{f.title}</div>
                <p className="service-desc">{f.desc}</p>
                <div className="service-tags">{f.tags.map(t => <span key={t} className="tag">{t}</span>)}</div>
              </div>
            ))}
          </div>
        </div>
        <style>{`@media(max-width:900px){.features-grid{grid-template-columns:1fr 1fr!important}}@media(max-width:600px){.features-grid{grid-template-columns:1fr!important}}`}</style>
      </section>

      {/* ANALYTICS / DASHBOARD PREVIEW */}
      <section style={{ padding: '7rem 2rem', background: 'linear-gradient(180deg,#060709 0%,#07090d 100%)', overflow: 'hidden' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
            <div className="section-tag reveal" style={{ display: 'inline-block' }}>Analytics de rendimiento</div>
            <h2 className="section-h2 serif reveal">Sabe exactamente<br /><em>dónde estás.</em></h2>
            <p className="section-intro reveal" style={{ maxWidth: '500px', margin: '0 auto' }}>
              Dashboard completo con tu progreso, puntos débiles, tendencia de acierto y comparativa anónima con otros opositores.
            </p>
          </div>

          {/* Dashboard mockup */}
          <div className="reveal dash-mockup-wrap">
            <div style={{ maxWidth: '960px', margin: '0 auto', borderRadius: '14px', overflow: 'hidden', border: '1px solid rgba(29,158,117,0.2)', boxShadow: '0 40px 120px rgba(0,0,0,0.7)' }}>
              {/* Browser bar */}
              <div style={{ background: '#0d0f13', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['#e05252','#e0a752','#52c152'].map(c => <div key={c} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c, opacity: 0.7 }} />)}
                </div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '5px', padding: '4px 12px', fontSize: '10px', color: 'rgba(255,255,255,0.3)', fontFamily: 'monospace' }}>
                  app.aprobea.com/dashboard
                </div>
              </div>
              {/* Dashboard UI */}
              <div style={{ background: '#0a0c10', display: 'flex', height: '500px' }}>
                {/* Sidebar */}
                <div style={{ width: '190px', flexShrink: 0, background: '#07090c', borderRight: '1px solid rgba(255,255,255,0.05)', padding: '16px 0', display: 'flex', flexDirection: 'column' }}>
                  <div style={{ padding: '0 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '10px' }}>
                    <span className="serif" style={{ fontSize: '1.1rem', color: 'var(--gold-100)', fontWeight: 300 }}>Aprobea</span>
                  </div>
                  {[['▦','Dashboard',true],['📚','Mis Oposiciones',false],['📝','Exámenes',false],['📊','Mi Progreso',false],['📡','BOE Radar',false],['📅','Plan de Estudio',false],['🃏','Flashcards',false]].map(([icon,label,active]) => (
                    <div key={String(label)} style={{ padding: '7px 16px', display: 'flex', alignItems: 'center', gap: '8px', background: active ? 'rgba(29,158,117,0.08)' : 'transparent', borderLeft: active ? '2px solid #1D9E75' : '2px solid transparent' }}>
                      <span style={{ fontSize: '11px', opacity: 0.7 }}>{icon}</span>
                      <span style={{ fontSize: '10px', color: active ? '#1D9E75' : 'rgba(255,255,255,0.35)', fontWeight: active ? 600 : 400 }}>{label as string}</span>
                    </div>
                  ))}
                </div>
                {/* Main */}
                <div style={{ flex: 1, padding: '18px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
                  {/* KPIs */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
                    {[['87%','Acierto hoy','#4db87a'],['Tema 14','Próximo repaso','#1D9E75'],['23 días','Racha activa','#e07a4d'],['Pos. #47','Ranking semana','#4d9fd4']].map(([v,l,c]) => (
                      <div key={String(l)} style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '8px', padding: '10px' }}>
                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '4px' }}>{l as string}</div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: c as string }}>{v as string}</div>
                      </div>
                    ))}
                  </div>
                  {/* Temas heat map */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '9px', color: 'rgba(29,158,117,0.7)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '10px' }}>Dominio por temas · Administrativo General</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                      {[92,88,45,71,33,95,12,67,78,54,88,23,91,44,82,60,15,73,89,51].map((pct, i) => (
                        <div key={i} title={`Tema ${i+1}: ${pct}%`} style={{ width: '24px', height: '24px', borderRadius: '4px', background: pct > 80 ? 'rgba(77,184,122,0.7)' : pct > 60 ? 'rgba(29,158,117,0.6)' : pct > 30 ? 'rgba(224,122,77,0.6)' : 'rgba(200,60,60,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7px', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>
                          {i+1}
                        </div>
                      ))}
                    </div>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                      {[['#4db87a40','Dominado'],['rgba(29,158,117,0.6)','En progreso'],['rgba(224,122,77,0.6)','Débil'],['rgba(200,60,60,0.5)','Sin iniciar']].map(([c,l]) => (
                        <div key={String(l)} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: c as string }} />
                          <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.3)' }}>{l as string}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Últimos exámenes */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ fontSize: '9px', color: 'rgba(29,158,117,0.7)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '8px' }}>Últimos exámenes</div>
                    {[['Simulacro Admvo. Gral — Bloque I','25/06/2025','87%','#4db87a'],['Repaso fallos — Temas 3,7,14','24/06/2025','71%','#1D9E75'],['Test adaptativo — Constitución Española','23/06/2025','58%','#e07a4d']].map(([n,d,p,c]) => (
                      <div key={String(n)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                        <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: c as string, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>{n as string}</div>
                          <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.25)' }}>{d as string}</div>
                        </div>
                        <div style={{ fontSize: '11px', color: c as string, fontWeight: 700 }}>{p as string}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CÓMO FUNCIONA */}
      <section id="como-funciona" style={{ padding: '7rem 2rem', background: 'var(--bg-0)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div className="section-tag reveal">Proceso</div>
          <h2 className="section-h2 serif reveal">4 pasos hasta<br /><em>el aprobado.</em></h2>
          <div className="proceso-steps reveal" style={{ marginTop: '4rem' }}>
            {[
              ['01', 'Elige tu oposición', 'Selecciona de nuestro catálogo de +340 oposiciones estatales y autonómicas. Activa las alertas BOE para no perder ninguna actualización.'],
              ['02', 'Sube o accede al temario', 'Sube tu PDF del temario oficial y la IA lo procesa automáticamente. Generamos preguntas, resúmenes y flashcards por cada tema.'],
              ['03', 'Estudia con IA adaptativa', 'Exámenes que se ajustan a tu nivel. Correcciones con explicación detallada. Plan de estudio personalizado con tu fecha de examen.'],
              ['04', 'Mejora semana a semana', 'El sistema detecta tus puntos débiles y los ataca. Analytics en tiempo real. Compárate anónimamente con otros opositores.'],
            ].map(([n, t, d]) => (
              <div key={n} className="proceso-step">
                <div className="paso-num serif">{n}</div>
                <div className="paso-title">{t}</div>
                <p className="paso-desc">{d}</p>
                {n !== '04' && <div className="paso-connector" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BOE RADAR SECTION */}
      <section style={{ padding: '7rem 2rem', background: 'linear-gradient(180deg,#07090d,#060709)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5rem', alignItems: 'center' }} className="boe-grid">
          <div>
            <div className="section-tag reveal" style={{ display: 'inline-block' }}>BOE Radar — 24/7</div>
            <h2 className="section-h2 serif reveal" style={{ textAlign: 'left', marginBottom: '1.5rem' }}>Nunca te pierdas<br />una <em>convocatoria.</em></h2>
            <p style={{ color: 'var(--text-2)', lineHeight: 1.8, fontSize: '0.92rem', marginBottom: '2rem' }} className="reveal">
              Nuestro sistema rastrea automáticamente el BOE estatal y los 17 boletines autonómicos. Cuando sale una convocatoria que te interesa, recibes un email en minutos con el resumen generado por IA.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {['BOE estatal + 17 autonómicos rastreados diariamente', 'Resumen automático de cada publicación con IA', 'Alertas personalizadas por cuerpo, categoría o palabra clave', 'Historial completo de convocatorias y bases'].map(f => (
                <div key={f} className="reveal" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <span style={{ color: 'var(--gold-100)', marginTop: '2px', flexShrink: 0 }}>✓</span>
                  <span style={{ fontSize: '0.88rem', color: 'var(--text-2)' }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
          {/* BOE feed mockup */}
          <div className="reveal" style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4db87a', animation: 'pulse 2s infinite', display: 'inline-block' }} />
              BOE Radar · En vivo
            </div>
            {[
              { tipo: 'convocatoria', titulo: 'Convocatoria 45 plazas Cuerpo Técnico AGE', fuente: 'BOE', fecha: 'Hace 2h', color: '#4db87a' },
              { tipo: 'bases', titulo: 'Bases específicas — Policía Local Murcia', fuente: 'BORM', fecha: 'Hace 5h', color: '#1D9E75' },
              { tipo: 'resultado', titulo: 'Relación aprobados OPE Enfermería SERMAS', fuente: 'BOCM', fecha: 'Ayer', color: '#4d9fd4' },
              { tipo: 'temario', titulo: 'Actualización temario auxiliar administrativo AGE', fuente: 'BOE', fecha: 'Ayer', color: '#e07a4d' },
              { tipo: 'convocatoria', titulo: 'OPE extraordinaria 120 plazas Mossos d\'Esquadra', fuente: 'DOGC', fecha: '2 días', color: '#4db87a' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '12px', padding: '0.75rem 0', borderBottom: i < 4 ? '0.5px solid rgba(29,158,117,0.08)' : 'none' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, flexShrink: 0, marginTop: '5px' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-1)', fontWeight: 500, lineHeight: 1.4, marginBottom: '3px' }}>{item.titulo}</div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ fontSize: '9px', padding: '1px 6px', borderRadius: '4px', background: `${item.color}20`, color: item.color, fontWeight: 600 }}>{item.tipo}</span>
                    <span style={{ fontSize: '9px', color: 'var(--text-3)' }}>{item.fuente}</span>
                    <span style={{ fontSize: '9px', color: 'var(--text-3)' }}>· {item.fecha}</span>
                  </div>
                </div>
              </div>
            ))}
            <button style={{ width: '100%', marginTop: '1rem', padding: '10px', background: 'rgba(29,158,117,0.06)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius)', color: 'var(--gold-200)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
              Ver todas las publicaciones →
            </button>
          </div>
        </div>
        <style>{`@media(max-width:768px){.boe-grid{grid-template-columns:1fr!important;gap:3rem!important}}`}</style>
      </section>

      {/* PRICING */}
      <section id="precios" style={{ padding: '7rem 2rem', background: 'var(--bg-0)' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div className="section-tag reveal" style={{ textAlign: 'center', display: 'block' }}>Planes</div>
          <h2 className="section-h2 serif reveal">Elige tu nivel<br />de <em>preparación.</em></h2>
          <div className="register-grid" style={{ marginTop: '3rem' }}>

            {/* FREE */}
            <div className="register-card reveal">
              <span className="reg-badge">Explorador · Gratuito</span>
              <h3 className="reg-title serif">Gratis</h3>
              <p className="reg-desc">Empieza sin coste. Accede al BOE radar, haz hasta 20 preguntas al día y explora nuestra plataforma.</p>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius)', padding: '0.9rem 1rem', margin: '1rem 0' }}>
                <div className="serif" style={{ fontSize: '1.8rem', fontWeight: 300, color: 'var(--text-0)' }}>0€</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Sin tarjeta · Para siempre</div>
              </div>
              <ul className="reg-features">
                <li>BOE Radar (últimas 48h)</li>
                <li>20 preguntas / día</li>
                <li>1 oposición</li>
                <li>Dashboard básico</li>
                <li style={{ opacity: 0.35, textDecoration: 'line-through' }}>IA Tutor personalizado</li>
                <li style={{ opacity: 0.35, textDecoration: 'line-through' }}>Exámenes adaptativos IRT</li>
                <li style={{ opacity: 0.35, textDecoration: 'line-through' }}>Plan de estudio IA</li>
              </ul>
              <a href="/login" className="btn-register" style={{ display: 'block', width: '100%', textAlign: 'center', background: 'transparent', border: '0.5px solid var(--gold-border)', color: 'var(--text-1)', fontSize: '0.82rem', letterSpacing: '0.06em', padding: '14px', borderRadius: '10px', textDecoration: 'none' }}>
                Crear cuenta gratis →
              </a>
            </div>

            {/* PRO */}
            <div className="register-card featured reveal">
              <span className="reg-badge">Pro · Más popular</span>
              <h3 className="reg-title serif">Pro</h3>
              <p className="reg-desc">Todo lo que necesitas para preparar tu oposición de forma profesional con IA a tu lado.</p>
              <div style={{ background: 'rgba(29,158,117,0.06)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius)', padding: '1rem', margin: '1rem 0' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '3px' }}>
                  <span className="serif" style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--gold-100)' }}>19,99€</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>/ mes</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Cancela cuando quieras</div>
              </div>
              <ul className="reg-features">
                <li>BOE Radar completo + alertas</li>
                <li>Preguntas ilimitadas</li>
                <li>Todas las oposiciones</li>
                <li>IA Tutor con memoria</li>
                <li>Exámenes adaptativos IRT</li>
                <li>Plan de estudio IA</li>
                <li>Flashcards + Spaced Repetition</li>
                <li>Analytics avanzado</li>
              </ul>
              <a href="/login" className="btn-register btn-register-gold" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                Empezar con Pro →
              </a>
            </div>

            {/* ELITE */}
            <div className="register-card reveal">
              <span className="reg-badge">Elite · Todo incluido</span>
              <h3 className="reg-title serif">Elite</h3>
              <p className="reg-desc">Para el opositor que va en serio. Predicción de preguntas, simulacros oficiales y acceso anticipado a novedades.</p>
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 'var(--radius)', padding: '1rem', margin: '1rem 0' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '3px' }}>
                  <span className="serif" style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--text-0)' }}>34,99€</span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-2)' }}>/ mes</span>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Todo lo de Pro, más:</div>
              </div>
              <ul className="reg-features">
                <li>Todo lo del plan Pro</li>
                <li>Predicción de temas por IA</li>
                <li>Simulacros en condiciones reales</li>
                <li>Modo examen oral (voz)</li>
                <li>Comunidad premium + ranking</li>
                <li>Acceso anticipado a funciones</li>
                <li>Soporte prioritario</li>
              </ul>
              <a href="/login" className="btn-register btn-register-outline" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                Empezar con Elite →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF */}
      <section style={{ padding: '6rem 2rem', background: 'linear-gradient(180deg,#07090d,#060709)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <div className="section-tag reveal" style={{ textAlign: 'center', display: 'block' }}>Opositores que ya confían en Aprobea</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.5rem', marginTop: '3rem' }} className="reviews-grid">
            {[
              { nombre: 'Laura M.', cuerpo: 'Auxiliar Administrativo AGE', texto: 'Llevo 6 meses estudiando con Aprobea. El sistema de detección de fallos es increíble — ya no estudio lo que sé, solo lo que necesito mejorar.', nota: '95% de acierto en simulacros' },
              { nombre: 'Carlos P.', cuerpo: 'Policía Nacional', texto: 'El BOE Radar me salvó. Me avisó de la convocatoria en menos de 30 minutos. Los planes de estudio de la IA son muy precisos y realistas.', nota: 'Plan personalizado 6 semanas' },
              { nombre: 'Ana T.', cuerpo: 'Oposiciones Sanidad SERMAS', texto: 'El temario se procesa solo. Subes el PDF y en minutos tienes 200 preguntas del tema. Me ahorra horas de trabajo de las que no dispongo.', nota: '2.300 preguntas generadas' },
            ].map(r => (
              <div key={r.nombre} className="reveal eco-card" style={{ cursor: 'default' }}>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
                  {Array(5).fill(0).map((_, i) => <span key={i} style={{ color: 'var(--gold-100)', fontSize: '12px' }}>★</span>)}
                </div>
                <p style={{ fontSize: '0.87rem', color: 'var(--text-1)', lineHeight: 1.7, fontStyle: 'italic', marginBottom: '1.25rem' }}>"{r.texto}"</p>
                <div style={{ borderTop: '0.5px solid var(--gold-border)', paddingTop: '0.875rem' }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-0)' }}>{r.nombre}</div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>{r.cuerpo}</div>
                  <div style={{ fontSize: '10px', color: 'var(--gold-200)', marginTop: '4px', letterSpacing: '0.06em' }}>{r.nota}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <style>{`@media(max-width:768px){.reviews-grid{grid-template-columns:1fr!important}}`}</style>
      </section>

      {/* CTA FINAL */}
      <section style={{ padding: '8rem 2rem', background: 'var(--bg-0)', textAlign: 'center' }}>
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <div className="section-tag reveal" style={{ display: 'inline-block' }}>Empieza hoy</div>
          <h2 className="section-h2 serif reveal">Tu siguiente paso<br />hacia el <em>aprobado.</em></h2>
          <p className="section-intro reveal">Únete a más de 12.000 opositores que ya estudian con IA. Sin compromisos, sin tarjeta de crédito.</p>
          <div className="reveal" style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap', marginTop: '2.5rem' }}>
            <a href="/login" className="btn-primary" style={{ fontSize: '1rem', padding: '16px 40px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Crear cuenta gratuita →
            </a>
            <a href="/login" className="btn-outline" style={{ fontSize: '1rem', padding: '16px 40px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
              Ya tengo cuenta
            </a>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '1.5rem', letterSpacing: '0.05em' }}>
            Gratis para siempre · Sin tarjeta · Cancela cuando quieras
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-grid">
          <div className="footer-brand">
            <span className="serif" style={{ fontSize: '1.8rem', fontWeight: 300, color: 'var(--gold-100)' }}>Aprobea<span style={{ fontSize: '0.9rem', color: 'var(--text-3)' }}>.com</span></span>
            <p style={{ marginTop: '1rem' }}>La plataforma más avanzada de España para preparar oposiciones. IA, BOE Radar y exámenes adaptativos.</p>
          </div>
          <div className="footer-col">
            <h4>Plataforma</h4>
            <a href="#">BOE Radar</a>
            <a href="#">Exámenes IA</a>
            <a href="#">Plan de Estudio</a>
            <a href="#">Flashcards</a>
            <a href="#">Ranking</a>
          </div>
          <div className="footer-col">
            <h4>Oposiciones</h4>
            <a href="#">Administración AGE</a>
            <a href="#">Cuerpos de Seguridad</a>
            <a href="#">Sanidad</a>
            <a href="#">Educación</a>
            <a href="#">Hacienda</a>
          </div>
          <div className="footer-col">
            <h4>Legal</h4>
            <a href="#">Privacidad</a>
            <a href="#">Términos de uso</a>
            <a href="#">Cookies</a>
            <a href="/login">Acceder</a>
            <a href="/backoffice">Admin</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© 2025 Aprobea.com · Todos los derechos reservados.</span>
          <span>Madrid, España · aprobea.com</span>
        </div>
      </footer>

      {/* MODAL REGISTRO */}
      <div className={`modal-overlay${openModal === 'registro' ? ' active' : ''}`} onClick={e => { if (e.target === e.currentTarget) { setOpenModal(null); setFormDone(false); setFormError('') } }}>
        <div className="modal" style={{ maxWidth: '480px' }}>
          <button className="modal-close" onClick={() => { setOpenModal(null); setFormDone(false); setFormError('') }}>×</button>
          <div className="reg-badge" style={{ marginBottom: '1.5rem' }}>Registro gratuito</div>
          <h2 className="modal-title serif">Empieza a estudiar</h2>
          <p className="modal-sub">Crea tu cuenta gratis. Sin tarjeta de crédito.</p>

          {formDone ? (
            <div style={{ textAlign: 'center', padding: '2rem 0' }}>
              <div style={{ width: '56px', height: '56px', border: '1px solid var(--gold-200)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '22px', color: 'var(--gold-100)' }}>✓</div>
              <h3 className="serif" style={{ fontSize: '1.5rem', fontWeight: 400, marginBottom: '0.75rem' }}>¡Cuenta creada!</h3>
              <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', lineHeight: 1.7, maxWidth: '280px', margin: '0 auto 2rem' }}>Revisa tu email para confirmar tu cuenta y empieza a estudiar.</p>
              <a href="/login" style={{ display: 'inline-block', padding: '12px 32px', background: 'var(--gold-200)', color: '#000', borderRadius: 'var(--radius)', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
                Ir al login →
              </a>
            </div>
          ) : (
            <form onSubmit={handleRegistro}>
              <div className="form-group">
                <label className="form-label">Nombre</label>
                <input type="text" className="form-input" placeholder="Tu nombre" required value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" className="form-input" placeholder="tu@email.com" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <input type="password" className="form-input" placeholder="Mínimo 8 caracteres" required minLength={8} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">¿Qué oposición preparas?</label>
                <input type="text" className="form-input" placeholder="Ej: Auxiliar Administrativo, Policía Local…" value={form.oposicion} onChange={e => setForm(f => ({ ...f, oposicion: e.target.value }))} />
              </div>
              {formError && <p style={{ color: '#e05', fontSize: '0.82rem', marginBottom: '1rem' }}>{formError}</p>}
              <button type="submit" className="form-submit" disabled={formLoading} style={{ opacity: formLoading ? 0.7 : 1 }}>
                {formLoading ? 'Creando cuenta…' : 'Crear cuenta gratuita →'}
              </button>
              <p className="form-disclaimer">Al registrarte aceptas nuestros <a href="#" style={{ color: 'var(--gold-200)' }}>Términos de uso</a> y <a href="#" style={{ color: 'var(--gold-200)' }}>Política de privacidad</a>.</p>
            </form>
          )}
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </>
  )
}
