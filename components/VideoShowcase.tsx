'use client'

import { useState, useEffect, useRef } from 'react'

const SCENES = [
  {
    num: '01',
    tag: 'Due diligence',
    title: 'Análisis de carteras',
    desc: 'Evaluación técnica y jurídica de cada activo. Nada pasa sin el análisis previo del equipo.',
    bg: 'radial-gradient(ellipse 120% 80% at 30% 60%, #1a1000 0%, #060709 70%)',
  },
  {
    num: '02',
    tag: 'Visitas al activo',
    title: 'Inspección sobre el terreno',
    desc: 'Visitas presenciales a cada inmueble con equipo técnico propio antes de cualquier decisión.',
    bg: 'radial-gradient(ellipse 120% 80% at 70% 40%, #001018 0%, #060709 70%)',
  },
  {
    num: '03',
    tag: 'Coordinación de obras',
    title: 'Reformas para revalorizar',
    desc: 'Gestión integral de la rehabilitación: arquitectos, constructores y plazos bajo control.',
    bg: 'radial-gradient(ellipse 120% 80% at 20% 70%, #100a00 0%, #060709 70%)',
  },
  {
    num: '04',
    tag: 'Informes',
    title: 'Redacción de informes',
    desc: 'Documentación exhaustiva de cada operación entregada a los inversores con total transparencia.',
    bg: 'radial-gradient(ellipse 120% 80% at 80% 30%, #050010 0%, #060709 70%)',
  },
  {
    num: '05',
    tag: 'Inversores',
    title: 'Reuniones estratégicas',
    desc: 'Coordinación continua con inversores y socios para alinear objetivos en cada fase.',
    bg: 'radial-gradient(ellipse 120% 80% at 50% 80%, #0a0800 0%, #060709 70%)',
  },
]

const SCENE_DURATION = 4000   // ms por escena
const FADE_DURATION  = 600    // ms de fade

export default function VideoShowcase({
  videoSrc,
  lang = 'es',
}: {
  videoSrc?: string
  lang?: 'es' | 'en'
}) {
  const [active, setActive]       = useState(0)
  const [visible, setVisible]     = useState(true)
  const [barWidth, setBarWidth]   = useState(0)
  const barRef   = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  /* ── Auto-avance de escenas ────────────────────────────────────────────── */
  useEffect(() => {
    let bar = 0
    const step = 30  // ms entre actualizaciones de la barra
    const increment = (step / SCENE_DURATION) * 100

    barRef.current = setInterval(() => {
      bar += increment
      setBarWidth(Math.min(bar, 100))
    }, step)

    timerRef.current = setInterval(() => {
      bar = 0
      setBarWidth(0)
      setVisible(false)
      setTimeout(() => {
        setActive(prev => (prev + 1) % SCENES.length)
        setVisible(true)
      }, FADE_DURATION)
    }, SCENE_DURATION)

    return () => {
      if (barRef.current)  clearInterval(barRef.current)
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const goTo = (i: number) => {
    if (barRef.current)  clearInterval(barRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    setVisible(false)
    setBarWidth(0)
    setTimeout(() => { setActive(i); setVisible(true) }, FADE_DURATION)

    // Reiniciar ciclo
    let bar = 0
    const step = 30
    const increment = (step / SCENE_DURATION) * 100
    barRef.current = setInterval(() => {
      bar += increment
      setBarWidth(Math.min(bar, 100))
    }, step)
    timerRef.current = setInterval(() => {
      bar = 0
      setBarWidth(0)
      setVisible(false)
      setTimeout(() => {
        setActive(prev => (prev + 1) % SCENES.length)
        setVisible(true)
      }, FADE_DURATION)
    }, SCENE_DURATION)
  }

  const scene = SCENES[active]

  return (
    <section style={{
      position: 'relative',
      height: '100vh',
      minHeight: '600px',
      overflow: 'hidden',
      background: '#060709',
    }}>

      {/* ── Vídeo de fondo (cuando exista) ── */}
      {videoSrc && (
        <video
          ref={videoRef}
          src={videoSrc}
          autoPlay muted loop playsInline
          style={{
            position: 'absolute', inset: 0,
            width: '100%', height: '100%',
            objectFit: 'cover',
            opacity: 0.45,
          }}
        />
      )}

      {/* ── Fondo animado (placeholder sin vídeo) ── */}
      {!videoSrc && (
        <div style={{
          position: 'absolute', inset: 0,
          background: scene.bg,
          transition: `background ${FADE_DURATION * 1.5}ms ease`,
        }}>
          {/* Partículas decorativas */}
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `
              radial-gradient(1px 1px at 20% 30%, rgba(201,160,67,0.4) 0%, transparent 100%),
              radial-gradient(1px 1px at 80% 70%, rgba(201,160,67,0.3) 0%, transparent 100%),
              radial-gradient(1.5px 1.5px at 50% 50%, rgba(201,160,67,0.2) 0%, transparent 100%),
              radial-gradient(1px 1px at 10% 80%, rgba(201,160,67,0.35) 0%, transparent 100%),
              radial-gradient(1px 1px at 90% 20%, rgba(201,160,67,0.25) 0%, transparent 100%)
            `,
          }} />
          {/* Líneas de profundidad */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(201,160,67,0.012) 3px, rgba(201,160,67,0.012) 4px)',
            animation: 'scanlines 8s linear infinite',
          }} />
        </div>
      )}

      {/* ── Overlay degradado superior e inferior ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(180deg, rgba(6,7,9,0.75) 0%, rgba(6,7,9,0.1) 35%, rgba(6,7,9,0.1) 65%, rgba(6,7,9,0.92) 100%)',
      }} />

      {/* ── Overlay lateral izquierdo ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'linear-gradient(90deg, rgba(6,7,9,0.7) 0%, transparent 50%)',
      }} />

      {/* ── Grano cinematográfico ── */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.03,
        backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\'/%3E%3C/svg%3E")',
        backgroundRepeat: 'repeat',
        backgroundSize: '256px 256px',
      }} />

      {/* ── Contenido principal ── */}
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', flexDirection: 'column',
        justifyContent: 'flex-end',
        padding: 'clamp(2rem, 5vw, 5rem)',
        maxWidth: '900px',
      }}>

        {/* Texto de escena */}
        <div style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(20px)',
          transition: `opacity ${FADE_DURATION}ms ease, transform ${FADE_DURATION}ms ease`,
        }}>
          {/* Tag */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: '10px',
            marginBottom: '1.25rem',
          }}>
            <span style={{
              fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase',
              color: '#C9A043', border: '1px solid rgba(201,160,67,0.4)',
              padding: '5px 14px', borderRadius: '20px',
              background: 'rgba(201,160,67,0.08)',
            }}>
              {scene.tag}
            </span>
            <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.2em' }}>
              {scene.num} / 0{SCENES.length}
            </span>
          </div>

          {/* Título */}
          <h2 className="serif" style={{
            fontSize: 'clamp(2.2rem, 5vw, 4rem)',
            fontWeight: 300,
            color: '#F5F0E8',
            lineHeight: 1.1,
            marginBottom: '1rem',
            letterSpacing: '-0.01em',
          }}>
            {scene.title}
          </h2>

          {/* Descripción */}
          <p style={{
            fontSize: 'clamp(0.85rem, 1.5vw, 1rem)',
            color: 'rgba(245,240,232,0.55)',
            lineHeight: 1.7,
            maxWidth: '480px',
            marginBottom: '2.5rem',
          }}>
            {scene.desc}
          </p>
        </div>

        {/* ── Controles de escena ── */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          {SCENES.map((s, i) => (
            <button
              key={s.num}
              onClick={() => goTo(i)}
              style={{
                background: 'none', border: 'none', padding: 0,
                cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '6px',
              }}
            >
              {/* Barra de progreso por escena */}
              <div style={{
                width: i === active ? '60px' : '24px',
                height: '2px',
                background: 'rgba(255,255,255,0.12)',
                borderRadius: '1px',
                overflow: 'hidden',
                transition: 'width 0.4s ease',
                position: 'relative',
              }}>
                {i === active && (
                  <div style={{
                    position: 'absolute', top: 0, left: 0, height: '100%',
                    width: `${barWidth}%`,
                    background: '#C9A043',
                    borderRadius: '1px',
                    transition: 'width 0.03s linear',
                  }} />
                )}
                {i < active && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(201,160,67,0.5)' }} />
                )}
              </div>
              {/* Número */}
              <span style={{
                fontSize: '9px', color: i === active ? '#C9A043' : 'rgba(255,255,255,0.2)',
                letterSpacing: '0.12em', transition: 'color 0.3s',
              }}>
                {s.num}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Logo marca de agua (esquina superior derecha) ── */}
      <div style={{
        position: 'absolute', top: '2rem', right: '2.5rem',
        opacity: 0.18,
      }}>
        <img src="/logo.png" alt="" style={{ height: '36px', width: 'auto' }} />
      </div>

      {/* ── Texto vertical derecha ── */}
      <div style={{
        position: 'absolute', right: '2.5rem', top: '50%',
        transform: 'translateY(-50%) rotate(90deg)',
        transformOrigin: 'center center',
        fontSize: '9px', letterSpacing: '0.25em', textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.15)',
        whiteSpace: 'nowrap',
      }}>
        {lang === 'es' ? 'Gestión de activos · Capital privado · España' : 'Asset management · Private capital · Spain'}
      </div>

      {/* ── Sin vídeo: mensaje para el admin ── */}
      {!videoSrc && (
        <div style={{
          position: 'absolute', top: '2rem', left: '50%', transform: 'translateX(-50%)',
          fontSize: '9px', color: 'rgba(255,255,255,0.12)', letterSpacing: '0.15em',
          textTransform: 'uppercase', whiteSpace: 'nowrap',
        }}>
          · Añade tu vídeo en VideoShowcase videoSrc="…" ·
        </div>
      )}

      <style>{`
        @keyframes scanlines {
          0%   { background-position: 0 0; }
          100% { background-position: 0 100px; }
        }
      `}</style>
    </section>
  )
}
