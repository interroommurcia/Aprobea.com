'use client'

import { useState, useEffect, useRef } from 'react'

/* ─── Contenido de cada panel ────────────────────────────────────────────── */
const SLIDES = [
  {
    key: 'cartera',
    accent: '#C9A043',
    bg: 'linear-gradient(160deg,#0d0a00 0%,#1a1100 60%,#0a0800 100%)',
    tag: 'Paso 01',
    stat: '+200M€',
    statSub: 'cartera gestionada',
    title: 'Cartera NPL',
    desc: 'Identificamos y adquirimos carteras de deuda non-performing a precio de descuento. El punto de entrada determina toda la rentabilidad futura de la operación.',
    tags: ['Deuda bancaria', 'Descuento máximo', 'Selección rigurosa'],
    icon: (
      <svg viewBox="0 0 64 64" width="56" height="56" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="8" y="16" width="48" height="38" rx="3"/>
        <path d="M8 26h48"/><path d="M18 16V10a3 3 0 0 1 3-3h22a3 3 0 0 1 3 3v6"/>
        <path d="M18 36h12M18 43h20"/>
      </svg>
    ),
  },
  {
    key: 'diligence',
    accent: '#4d9fd4',
    bg: 'linear-gradient(160deg,#030d18 0%,#071828 60%,#040c16 100%)',
    tag: 'Paso 02',
    stat: '100%',
    statSub: 'análisis propio',
    title: 'Due Diligence',
    desc: 'Cada activo pasa por evaluación jurídica, registral, urbanística y de mercado. Sin análisis exhaustivo no hay operación posible.',
    tags: ['Evaluación jurídica', 'Análisis registral', 'Valoración mercado'],
    icon: (
      <svg viewBox="0 0 64 64" width="56" height="56" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="28" cy="28" r="18"/>
        <path d="M40 40l16 16"/>
        <path d="M22 28h12M28 22v12"/>
      </svg>
    ),
  },
  {
    key: 'activo',
    accent: '#4db87a',
    bg: 'linear-gradient(160deg,#030e07 0%,#071a0c 60%,#040e07 100%)',
    tag: 'Paso 03',
    stat: '+500',
    statSub: 'activos gestionados',
    title: 'Activo Real',
    desc: 'El colateral inmobiliario respalda la inversión. Vivienda residencial, suelo, comercial e industrial distribuido en toda España.',
    tags: ['Residencial', 'Suelo', 'Comercial'],
    icon: (
      <svg viewBox="0 0 64 64" width="56" height="56" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 56h56"/><path d="M10 56V28L32 10l22 18v28"/>
        <path d="M22 56V40h20v16"/>
        <path d="M20 28h8M36 28h8"/>
      </svg>
    ),
  },
  {
    key: 'rentabilidad',
    accent: '#b07ed4',
    bg: 'linear-gradient(160deg,#080412 0%,#100820 60%,#080412 100%)',
    tag: 'Paso 04',
    stat: '15%',
    statSub: 'rentabilidad media anual',
    title: 'Rentabilidad',
    desc: 'La prima de descuento en la adquisición genera retornos muy superiores al mercado. El valor se captura desde el primer día.',
    tags: ['Prima de descuento', 'Retorno >15%', 'Sin correlación bursátil'],
    icon: (
      <svg viewBox="0 0 64 64" width="56" height="56" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="4,48 20,32 32,40 48,20 60,28"/>
        <polyline points="48,20 60,20 60,32"/>
        <circle cx="20" cy="32" r="3" fill="currentColor"/>
        <circle cx="32" cy="40" r="3" fill="currentColor"/>
        <circle cx="48" cy="20" r="3" fill="currentColor"/>
      </svg>
    ),
  },
  {
    key: 'proceso',
    accent: '#e06b5f',
    bg: 'linear-gradient(160deg,#0e0605 0%,#1e0b09 60%,#0e0605 100%)',
    tag: 'Paso 05',
    stat: '3 fases',
    statSub: 'identificar · adquirir · recuperar',
    title: 'Proceso NPL',
    desc: 'Un proceso estructurado que va desde la identificación y negociación de la cartera hasta la plena recuperación del valor del activo subyacente.',
    tags: ['Identificación', 'Adquisición', 'Recuperación'],
    icon: (
      <svg viewBox="0 0 64 64" width="56" height="56" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="32" r="8"/><circle cx="52" cy="32" r="8"/>
        <path d="M20 32h24"/><path d="M38 24l8 8-8 8"/>
        <path d="M12 20V10M52 44v10"/>
      </svg>
    ),
  },
  {
    key: 'inversor',
    accent: '#E8C97A',
    bg: 'linear-gradient(160deg,#07090e 0%,#0c1220 60%,#07090e 100%)',
    tag: 'Paso 06',
    stat: '98%',
    statSub: 'satisfacción inversores',
    title: 'Tu Inversión',
    desc: 'Acceso exclusivo a operaciones de alto rendimiento desde 50.000€. Capital privado e institucional con retornos superiores y colateral real.',
    tags: ['Desde 50.000€', 'Colateral real', 'Capital privado'],
    icon: (
      <svg viewBox="0 0 64 64" width="56" height="56" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="22" cy="20" r="8"/><circle cx="42" cy="20" r="8"/>
        <path d="M4 54c0-10 8-18 18-18"/><path d="M42 36c10 0 18 8 18 18"/>
        <path d="M22 36c5-2 10-2 20 0"/>
      </svg>
    ),
  },
]

function easeInOutQuart(t: number) {
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2
}

export default function NPLCube3D({ lang = 'es' }: { lang?: 'es' | 'en' }) {
  const wrapperRef              = useRef<HTMLDivElement>(null)
  const [activeIdx, setActiveIdx] = useState(0)
  const [progress, setProgress]   = useState(0)   // 0→1 global dentro de la sección
  const [textKey, setTextKey]     = useState(0)    // para re-montar la animación de texto

  const SCROLL_PER_SLIDE = 120  // vh por slide
  const TOTAL_VH         = SCROLL_PER_SLIDE * SLIDES.length

  useEffect(() => {
    const onScroll = () => {
      const el = wrapperRef.current
      if (!el) return
      const rect       = el.getBoundingClientRect()
      const scrollable = el.offsetHeight - window.innerHeight
      if (scrollable <= 0) return
      const prog = Math.max(0, Math.min(1, -rect.top / scrollable))
      setProgress(prog)

      const rawIdx = prog * (SLIDES.length - 1)
      const newIdx = Math.min(Math.round(rawIdx), SLIDES.length - 1)
      setActiveIdx(prev => {
        if (prev !== newIdx) setTextKey(k => k + 1)
        return newIdx
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const slide = SLIDES[activeIdx]

  /* Ángulo de cada panel para el efecto 3D:
     - Panel activo    → rotateX(0°)   visible
     - Paneles pasados → rotateX(-90°) "caídos" hacia atrás (piso)
     - Paneles futuros → rotateX(90°)  esperando desde abajo
     Con transform-origin: center bottom el eje de giro es el borde inferior */
  function getRotateX(idx: number): number {
    const rawIdx  = progress * (SLIDES.length - 1)
    const segIdx  = Math.floor(rawIdx)
    const segProg = easeInOutQuart(rawIdx - segIdx)

    if (idx < segIdx) return -90   // pasados: girados hacia atrás (planos)
    if (idx > segIdx + 1) return 90  // futuros: esperando desde abajo

    if (idx === segIdx) {
      // Panel saliente: 0 → -90
      return -segProg * 90
    }
    // Panel entrante (idx === segIdx + 1): 90 → 0
    return 90 - segProg * 90
  }

  function getOpacity(idx: number): number {
    const rawIdx  = progress * (SLIDES.length - 1)
    const segIdx  = Math.floor(rawIdx)
    if (idx < segIdx || idx > segIdx + 1) return 0.0
    return 1
  }

  return (
    <>
      {/* ── Wrapper de scroll ── */}
      <div ref={wrapperRef} style={{ height: `${TOTAL_VH}vh`, position: 'relative' }}>

        {/* ── Sticky viewer ── */}
        <div style={{
          position: 'sticky', top: 0, height: '100vh', overflow: 'hidden',
          display: 'flex', flexDirection: 'column',
          background: '#060709',
        }}>

          {/* Glow background que cambia con el slide */}
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: `radial-gradient(ellipse 80% 60% at 50% 80%, ${slide.accent}0c 0%, transparent 65%)`,
            transition: 'background 0.9s ease',
          }} />

          {/* ── Grid: texto izquierda + paneles derecha ── */}
          <div style={{
            flex: 1, display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            maxWidth: '1200px', width: '100%',
            margin: '0 auto', padding: '0 3rem',
            alignItems: 'center', position: 'relative', zIndex: 1,
          }} className="npl-flip-grid">

            {/* ── TEXTO ── */}
            <div style={{ paddingRight: '3rem' }}>
              <div style={{
                fontSize: '10px', letterSpacing: '0.25em', textTransform: 'uppercase',
                color: 'var(--gold-200)', marginBottom: '1.25rem',
              }}>
                {lang === 'es' ? 'Anatomía de una operación NPL' : 'Anatomy of an NPL deal'}
              </div>

              {/* Número de paso animado */}
              <div key={`tag-${textKey}`} style={{
                display: 'inline-block', fontSize: '10px', letterSpacing: '0.18em',
                textTransform: 'uppercase', color: slide.accent,
                border: `1px solid ${slide.accent}44`,
                padding: '4px 14px', borderRadius: '20px', marginBottom: '1.25rem',
                animation: 'nplFadeUp 0.35s ease both',
              }}>
                {slide.tag}
              </div>

              {/* Título */}
              <h2 key={`title-${textKey}`} className="serif" style={{
                fontSize: 'clamp(2rem, 3.5vw, 2.8rem)', fontWeight: 300,
                color: 'var(--text-0)', lineHeight: 1.15, marginBottom: '1rem',
                animation: 'nplFadeUp 0.38s 0.04s ease both',
              }}>
                {slide.title}
              </h2>

              {/* Stat */}
              <div key={`stat-${textKey}`} style={{
                display: 'flex', alignItems: 'baseline', gap: '10px',
                marginBottom: '1.25rem',
                animation: 'nplFadeUp 0.38s 0.08s ease both',
              }}>
                <span style={{
                  fontSize: '2.2rem', fontWeight: 700, color: slide.accent,
                  fontFamily: "'Outfit',sans-serif", lineHeight: 1,
                }}>
                  {slide.stat}
                </span>
                <span style={{ fontSize: '10px', color: slide.accent, opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                  {slide.statSub}
                </span>
              </div>

              {/* Descripción */}
              <p key={`desc-${textKey}`} style={{
                fontSize: '0.92rem', color: 'var(--text-2)', lineHeight: 1.8,
                maxWidth: '400px', marginBottom: '1.75rem',
                animation: 'nplFadeUp 0.4s 0.1s ease both',
              }}>
                {slide.desc}
              </p>

              {/* Tags */}
              <div key={`tags-${textKey}`} style={{
                display: 'flex', flexWrap: 'wrap', gap: '8px',
                animation: 'nplFadeUp 0.4s 0.15s ease both',
              }}>
                {slide.tags.map(t => (
                  <span key={t} style={{
                    fontSize: '10px', padding: '5px 13px', borderRadius: '20px',
                    border: `1px solid ${slide.accent}33`,
                    background: `${slide.accent}0d`,
                    color: slide.accent, letterSpacing: '0.06em',
                  }}>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* ── ESCENA 3D ── */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              height: '100%', position: 'relative',
            }}>
              {/* Perspectiva — "50vw" como admdesign */}
              <div style={{
                perspective: '50vw',
                perspectiveOrigin: 'center center',
                width: '460px', height: '340px',
                position: 'relative',
              }}>
                {SLIDES.map((s, i) => {
                  const rotX   = getRotateX(i)
                  const opac   = getOpacity(i)
                  const visible = opac > 0

                  return (
                    <div
                      key={s.key}
                      style={{
                        position: 'absolute', inset: 0,
                        transformStyle: 'preserve-3d',
                        transformOrigin: 'center bottom',  // ← clave del efecto admdesign
                        transform: `rotateX(${rotX}deg)`,
                        transition: 'transform 0.05s linear',
                        willChange: 'transform',
                        opacity: visible ? 1 : 0,
                        pointerEvents: visible ? 'auto' : 'none',
                        background: s.bg,
                        border: `1px solid ${s.accent}33`,
                        borderRadius: '16px',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', justifyContent: 'center',
                        padding: '2.5rem 2rem',
                        textAlign: 'center', gap: '10px',
                        boxShadow: `0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px ${s.accent}15`,
                      }}
                    >
                      {/* Línea superior */}
                      <div style={{
                        position: 'absolute', top: 0, left: '15%', right: '15%', height: '2px',
                        background: `linear-gradient(90deg,transparent,${s.accent},transparent)`,
                        borderRadius: '1px',
                      }} />

                      <div style={{ color: s.accent, marginBottom: '4px' }}>{s.icon}</div>

                      <div style={{
                        fontSize: '2.4rem', fontWeight: 700, color: s.accent,
                        fontFamily: "'Outfit',sans-serif", lineHeight: 1, letterSpacing: '-0.02em',
                      }}>
                        {s.stat}
                      </div>
                      <div style={{
                        fontSize: '8px', letterSpacing: '0.14em', textTransform: 'uppercase',
                        color: s.accent, opacity: 0.55,
                      }}>
                        {s.statSub}
                      </div>

                      <div style={{ width: '36px', height: '1px', background: `${s.accent}44`, margin: '4px 0' }} />

                      <div style={{
                        fontSize: '1rem', fontWeight: 600, color: '#F5F0E8', letterSpacing: '0.02em',
                      }}>
                        {s.title}
                      </div>

                      {/* Etiquetas en el panel */}
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '6px' }}>
                        {s.tags.map(t => (
                          <span key={t} style={{
                            fontSize: '9px', padding: '3px 10px', borderRadius: '10px',
                            background: `${s.accent}18`, color: s.accent,
                            border: `1px solid ${s.accent}33`, letterSpacing: '0.06em',
                          }}>
                            {t}
                          </span>
                        ))}
                      </div>

                      {/* Línea inferior */}
                      <div style={{
                        position: 'absolute', bottom: 0, left: '15%', right: '15%', height: '1px',
                        background: `linear-gradient(90deg,transparent,${s.accent}44,transparent)`,
                        borderRadius: '1px',
                      }} />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── Dots de progreso (abajo) ── */}
          <div style={{
            position: 'absolute', bottom: '2.5rem', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', gap: '10px', alignItems: 'center', zIndex: 2,
          }}>
            {SLIDES.map((s, i) => (
              <div key={s.key} style={{
                width: activeIdx === i ? '32px' : '8px',
                height: '8px', borderRadius: '4px',
                background: activeIdx === i ? s.accent : 'rgba(255,255,255,0.12)',
                transition: 'all 0.4s cubic-bezier(0.34,1.56,0.64,1)',
              }} />
            ))}
          </div>

          {/* ── Barra de progreso ── */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            height: '2px', background: 'rgba(255,255,255,0.04)',
          }}>
            <div style={{
              height: '100%', width: `${progress * 100}%`,
              background: `linear-gradient(90deg,#C9A043,${slide.accent})`,
              transition: 'width 0.05s linear, background 0.6s ease',
            }} />
          </div>

          {/* ── Hint scroll ── */}
          <div style={{
            position: 'absolute', bottom: '2.5rem', right: '3rem',
            fontSize: '10px', color: 'rgba(255,255,255,0.2)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
            opacity: progress > 0.95 ? 0 : 1, transition: 'opacity 0.5s',
          }}>
            <div style={{
              width: '1px', height: '40px',
              background: 'linear-gradient(180deg,transparent,rgba(201,160,67,0.4))',
              animation: 'nplScrollLine 1.8s ease-in-out infinite',
            }} />
            <span style={{ letterSpacing: '0.15em', textTransform: 'uppercase', fontSize: '8px' }}>scroll</span>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes nplFadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes nplScrollLine {
          0%,100% { transform: scaleY(1); opacity: 0.4; }
          50%      { transform: scaleY(0.5); opacity: 1; }
        }
        @media (max-width: 768px) {
          .npl-flip-grid {
            grid-template-columns: 1fr !important;
            padding: 0 1.5rem !important;
            gap: 2rem !important;
          }
        }
      `}</style>
    </>
  )
}
