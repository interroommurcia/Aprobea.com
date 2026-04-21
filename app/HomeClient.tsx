'use client'

import { useRef, useState, useEffect } from 'react'
import {
  motion,
  useScroll,
  useTransform,
  useInView,
  type Variants,
} from 'framer-motion'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts'

/* ─── Tokens ─────────────────────────────────────────────────────── */
const C = {
  bg0: '#040906',
  bg1: '#070E09',
  bg2: '#0C1810',
  bg3: '#112218',
  green: '#1D9E75',
  green2: '#25C48F',
  greenBorder: 'rgba(29,158,117,0.22)',
  greenGlow: 'rgba(29,158,117,0.09)',
  greenShadow: 'rgba(29,158,117,0.28)',
  text0: '#EDF5F1',
  text1: '#7AA898',
  text2: '#3D6050',
  text3: '#1E3428',
}

/* ─── Motion variants ────────────────────────────────────────────── */
const vFadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.65, ease: [0.22, 1, 0.36, 1] } },
}
const vStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09 } },
}

/* ─── Helpers ────────────────────────────────────────────────────── */
function Reveal({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.12 })
  return (
    <motion.div ref={ref} variants={vFadeUp} initial="hidden" animate={inView ? 'show' : 'hidden'} transition={{ delay }} style={style}>
      {children}
    </motion.div>
  )
}

function StaggerGrid({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.06 })
  return (
    <motion.div ref={ref} variants={vStagger} initial="hidden" animate={inView ? 'show' : 'hidden'} style={style}>
      {children}
    </motion.div>
  )
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0 }}>
      <circle cx="9" cy="9" r="8.5" fill={C.greenGlow} stroke={C.green} strokeOpacity="0.5" />
      <path d="M5.5 9.5L8 12L12.5 6.5" stroke={C.green} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      display: 'inline-block',
      fontSize: '0.7rem',
      color: C.green,
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
      border: `1px solid ${C.greenBorder}`,
      borderRadius: 50,
      padding: '5px 16px',
      marginBottom: 20,
      fontWeight: 700,
      fontFamily: 'var(--font-poppins, system-ui)',
      background: C.greenGlow,
    }}>
      {children}
    </span>
  )
}

function Heading({ children, size = 'lg' }: { children: React.ReactNode; size?: 'lg' | 'xl' }) {
  return (
    <h2 style={{
      fontFamily: 'var(--font-poppins, system-ui)',
      fontSize: size === 'xl' ? 'clamp(2.4rem, 5.5vw, 4rem)' : 'clamp(1.9rem, 3.8vw, 3rem)',
      fontWeight: 800,
      lineHeight: 1.12,
      letterSpacing: '-0.03em',
    }}>
      {children}
    </h2>
  )
}

function Counter({ to, suffix = '' }: { to: number; suffix?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const [count, setCount] = useState(0)
  useEffect(() => {
    if (!inView) return
    let start = 0
    const raf = (ts: number) => {
      if (!start) start = ts
      const p = Math.min((ts - start) / 1600, 1)
      setCount(Math.floor((1 - Math.pow(1 - p, 3)) * to))
      if (p < 1) requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)
  }, [inView, to])
  return <span ref={ref}>{count.toLocaleString('es-ES')}{suffix}</span>
}

/* ─── Logo icon ──────────────────────────────────────────────────── */
function LogoIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden>
      <rect width="32" height="32" rx="9" fill="#1D9E75" />
      <polyline points="7.5,16.5 13,22.5 24.5,10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  )
}

/* ─── Data ───────────────────────────────────────────────────────── */
const weeklyData = [
  { day: 'Lun', acierto: 58 }, { day: 'Mar', acierto: 67 }, { day: 'Mié', acierto: 64 },
  { day: 'Jue', acierto: 75 }, { day: 'Vie', acierto: 81 }, { day: 'Sáb', acierto: 86 }, { day: 'Dom', acierto: 91 },
]
const topicData = [
  { tema: 'Const.', ratio: 90 }, { tema: 'LRBRL', ratio: 74 }, { tema: 'TREBEP', ratio: 68 },
  { tema: 'LPAC', ratio: 88 }, { tema: 'Admin.', ratio: 55 }, { tema: 'Presup.', ratio: 79 },
]
const heatmap = [92, 88, 45, 71, 33, 95, 12, 67, 78, 54, 88, 23, 91, 44, 82, 60, 15, 73, 89, 51]

const features = [
  { icon: '📡', title: 'BOE Radar 24/7', desc: 'Seguimiento automático del BOE estatal y los 17 boletines autonómicos. Alertas en minutos cuando sale tu convocatoria, con resumen IA incluido.' },
  { icon: '🧠', title: 'IA Tutor con Memoria', desc: 'Cada corrección incluye explicación basada en el temario oficial. La IA recuerda todos tus fallos y construye baterías de repaso adaptadas.' },
  { icon: '📊', title: 'Exámenes Adaptativos IRT', desc: 'Algoritmo Item Response Theory que ajusta la dificultad a tu nivel real. No pierdas tiempo con lo que ya dominas.' },
  { icon: '🗺️', title: 'Mapa de Conocimiento', desc: 'Visualiza tu dominio de cada tema en tiempo real. Detecta brechas y recibe recomendaciones precisas de qué estudiar hoy.' },
  { icon: '🃏', title: 'Spaced Repetition SM-2', desc: 'Flashcards con algoritmo SM-2. El sistema decide cuándo repetir cada concepto para maximizar la retención a largo plazo.' },
  { icon: '📅', title: 'Plan de Estudio IA', desc: 'Dinos tu fecha de examen y horas disponibles. Plan semana a semana ajustado a tu progreso con recordatorios automáticos.' },
]

const steps = [
  { n: '01', icon: '🎯', title: 'Elige tu oposición', desc: '+340 oposiciones estatales, autonómicas y locales. El sistema carga los temarios oficiales validados automáticamente.' },
  { n: '02', icon: '⚙️', title: 'Sube o accede al temario', desc: 'Sube tu PDF y la IA lo procesa en segundos: genera preguntas, resúmenes y flashcards. O usa nuestros temarios ya validados.' },
  { n: '03', icon: '🚀', title: 'Estudia y mejora', desc: 'Corrección instantánea con explicación detallada. El dashboard rastrea tu evolución, detecta fallos y ajusta la dificultad.' },
  { n: '04', icon: '🏆', title: 'Llega preparado', desc: 'Simulacros en condiciones reales, predicción de temas por IA y comparativa anónima con otros opositores de tu convocatoria.' },
]

const plans = [
  {
    id: 'free', name: 'Explorador', price: '0€', period: 'para siempre', sub: 'Sin tarjeta de crédito',
    cta: 'Crear cuenta gratis', href: '/login', featured: false,
    included: ['20 preguntas al día', '1 oposición activa', 'BOE Radar (últimas 48h)', 'Dashboard básico'],
    excluded: ['IA Tutor con memoria', 'Exámenes adaptativos IRT', 'Plan de estudio IA'],
  },
  {
    id: 'pro', name: 'Pro', price: '19,99€', period: '/ mes', sub: 'Cancela cuando quieras',
    cta: 'Empezar con Pro', href: '/login', featured: true,
    included: ['Preguntas ilimitadas', 'Todas las oposiciones', 'IA Tutor con memoria', 'Exámenes adaptativos IRT', 'Plan de estudio IA', 'Flashcards + Spaced Repetition', 'Analytics avanzado', 'BOE Radar completo + alertas'],
    excluded: [],
  },
  {
    id: 'elite', name: 'Elite', price: '34,99€', period: '/ mes', sub: 'Para el opositor que va en serio',
    cta: 'Empezar con Elite', href: '/login', featured: false,
    included: ['Todo lo de Pro', 'Predicción de temas por IA', 'Simulacros en condiciones reales', 'Examen oral con IA (voz)', 'Comunidad premium + ranking', 'Acceso anticipado a funciones', 'Soporte prioritario'],
    excluded: [],
  },
]

/* ─── Main ───────────────────────────────────────────────────────── */
export default function HomeClient() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ['start start', 'end start'] })
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '18%'])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7], [1, 0])

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 48)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  const navLinks = [
    { label: 'Cómo funciona', href: '#como-funciona' },
    { label: 'Precios', href: '#precios' },
  ]

  return (
    <div style={{ background: C.bg0, color: C.text0, fontFamily: 'var(--font-nunito, system-ui)', fontWeight: 400, overflowX: 'hidden' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Organization',
            name: 'Aprobea',
            url: 'https://aprobea.com',
            logo: 'https://aprobea.com/logo.svg',
            description: 'Plataforma IA para preparar oposiciones nacionales, regionales y locales en España.',
          }),
        }}
      />

      {/* ══ NAV ══════════════════════════════════════════════════════ */}
      <motion.nav
        initial={{ y: -72, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        style={{
          position: 'fixed', top: 0, left: 0, right: 0, zIndex: 999,
          height: 64, display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', padding: '0 5vw',
          background: scrolled ? 'rgba(4,9,6,0.96)' : 'transparent',
          backdropFilter: scrolled ? 'blur(20px)' : 'none',
          borderBottom: scrolled ? `1px solid ${C.greenBorder}` : '1px solid transparent',
          transition: 'background 0.35s ease, border-color 0.35s ease',
        }}
      >
        <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}>
          <LogoIcon size={34} />
          <span style={{ fontFamily: 'var(--font-poppins)', fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.03em' }}>
            <span style={{ color: C.text0 }}>Apro</span>
            <span style={{ color: C.green }}>bea</span>
          </span>
        </a>

        {/* Desktop nav */}
        <div className="aprobea-nav-desktop" style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {navLinks.map(l => (
            <a key={l.href} href={l.href} style={{ fontSize: '0.88rem', color: C.text1, textDecoration: 'none', padding: '7px 14px', borderRadius: 50, transition: 'color 0.2s, background 0.2s', fontWeight: 500 }}>
              {l.label}
            </a>
          ))}
          <a href="/login" style={{ fontSize: '0.88rem', color: C.text1, textDecoration: 'none', padding: '7px 14px', borderRadius: 50, fontWeight: 500 }}>
            Iniciar sesión
          </a>
          <a href="/login" style={{
            fontSize: '0.88rem', background: C.green, color: '#fff', fontWeight: 700,
            textDecoration: 'none', padding: '9px 22px', borderRadius: 50,
            boxShadow: `0 4px 20px ${C.greenShadow}`,
            fontFamily: 'var(--font-poppins)',
          }}>
            Empezar gratis
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="aprobea-nav-mobile"
          onClick={() => setMobileMenuOpen(v => !v)}
          aria-label="Menú"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, display: 'none' }}
        >
          <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
            {mobileMenuOpen
              ? <><path d="M4 4L18 18" stroke={C.text0} strokeWidth="2" strokeLinecap="round"/><path d="M18 4L4 18" stroke={C.text0} strokeWidth="2" strokeLinecap="round"/></>
              : <><rect x="2" y="5" width="18" height="2" rx="1" fill={C.text0}/><rect x="2" y="10" width="18" height="2" rx="1" fill={C.text0}/><rect x="2" y="15" width="18" height="2" rx="1" fill={C.text0}/></>
            }
          </svg>
        </button>
      </motion.nav>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            position: 'fixed', top: 64, left: 0, right: 0, zIndex: 998,
            background: 'rgba(4,9,6,0.98)', backdropFilter: 'blur(20px)',
            padding: '1.5rem 5vw 2rem',
            borderBottom: `1px solid ${C.greenBorder}`,
            display: 'flex', flexDirection: 'column', gap: 8,
          }}
        >
          {navLinks.map(l => (
            <a key={l.href} href={l.href} onClick={() => setMobileMenuOpen(false)}
              style={{ fontSize: '1rem', color: C.text1, textDecoration: 'none', padding: '10px 0', fontWeight: 600, borderBottom: `1px solid ${C.greenBorder}` }}>
              {l.label}
            </a>
          ))}
          <a href="/login" onClick={() => setMobileMenuOpen(false)} style={{ fontSize: '1rem', color: C.text1, textDecoration: 'none', padding: '10px 0', fontWeight: 600, borderBottom: `1px solid ${C.greenBorder}` }}>
            Iniciar sesión
          </a>
          <a href="/login" style={{
            marginTop: 8, textAlign: 'center', background: C.green, color: '#fff', fontWeight: 800,
            textDecoration: 'none', padding: '14px 0', borderRadius: 50, fontSize: '1rem',
            fontFamily: 'var(--font-poppins)',
          }}>
            Empezar gratis →
          </a>
        </motion.div>
      )}

      {/* ══ HERO ══════════════════════════════════════════════════════ */}
      <section ref={heroRef} style={{ position: 'relative', minHeight: '100vh', display: 'flex', alignItems: 'center', overflow: 'hidden' }}>
        <motion.div style={{ position: 'absolute', inset: 0, y: bgY }} aria-hidden>
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 80% 55% at 50% 20%, rgba(29,158,117,0.14) 0%, transparent 70%)` }} />
          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 45% 35% at 85% 80%, rgba(29,158,117,0.06) 0%, transparent 60%)` }} />
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `linear-gradient(rgba(29,158,117,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(29,158,117,0.035) 1px, transparent 1px)`,
            backgroundSize: '64px 64px',
            maskImage: 'radial-gradient(ellipse 85% 60% at 50% 50%, black 20%, transparent 80%)',
          }} />
        </motion.div>

        <motion.div style={{ position: 'relative', zIndex: 2, maxWidth: 980, margin: '0 auto', padding: '0 5vw', paddingTop: 100, opacity: heroOpacity }}>
          {/* Live badge */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: C.greenGlow, border: `1px solid ${C.greenBorder}`,
              borderRadius: 50, padding: '6px 18px', marginBottom: 32,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, boxShadow: `0 0 10px ${C.green}`, animation: 'aprobea-pulse 2s infinite', flexShrink: 0 }} />
            <span style={{ fontSize: '0.72rem', color: C.green, letterSpacing: '0.1em', fontWeight: 700, fontFamily: 'var(--font-poppins)' }}>
              BOE RADAR ACTIVO · NACIONAL + 17 CCAA
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.32, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: 'var(--font-poppins, system-ui)',
              fontSize: 'clamp(2.6rem, 7vw, 5.4rem)',
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.03em',
              marginBottom: 24,
            }}
          >
            Tu próxima oposición,{' '}
            <span style={{
              color: C.green,
              display: 'inline-block',
              textShadow: `0 0 40px ${C.greenShadow}`,
            }}>
              aprobada.
            </span>
            <br />
            <span style={{ fontSize: '0.38em', fontWeight: 500, color: C.text1, letterSpacing: '-0.01em' }}>
              IA adaptativa · BOE Radar · Tests nacionales y regionales
            </span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.46 }}
            style={{ fontSize: 'clamp(1rem, 2vw, 1.15rem)', color: C.text1, lineHeight: 1.75, maxWidth: 560, marginBottom: 40, fontWeight: 400 }}
          >
            La plataforma más avanzada de España para preparar oposiciones.{' '}
            <strong style={{ color: C.text0, fontWeight: 700 }}>20 preguntas gratis al día.</strong>{' '}
            Pro ilimitado por solo{' '}
            <strong style={{ color: C.green, fontWeight: 700 }}>19,99 €/mes.</strong>
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.58 }}
            style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 64 }}
          >
            <a href="/login" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: C.green, color: '#fff', fontWeight: 800,
              textDecoration: 'none', padding: '15px 36px',
              borderRadius: 50, fontSize: '1rem',
              fontFamily: 'var(--font-poppins)',
              boxShadow: `0 8px 40px ${C.greenShadow}, 0 2px 8px rgba(0,0,0,0.3)`,
            }}>
              Empezar gratis ahora →
            </a>
            <a href="#como-funciona" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'rgba(255,255,255,0.05)', color: C.text0, fontWeight: 600,
              textDecoration: 'none', padding: '15px 28px',
              borderRadius: 50, fontSize: '0.95rem',
              border: `1px solid rgba(255,255,255,0.12)`,
              backdropFilter: 'blur(10px)',
            }}>
              Ver cómo funciona
            </a>
          </motion.div>

          {/* Trust stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.85 }}
            style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap', paddingTop: 32, borderTop: `1px solid ${C.greenBorder}` }}
          >
            {[
              { n: 12400, suffix: '+', label: 'Opositores activos' },
              { n: 340, suffix: '+', label: 'Oposiciones cubiertas' },
              { n: 2100000, suffix: '+', label: 'Preguntas en el banco' },
            ].map(({ n, suffix, label }) => (
              <div key={label}>
                <div style={{ fontFamily: 'var(--font-poppins)', fontSize: 'clamp(1.5rem, 2.8vw, 2rem)', fontWeight: 800, color: C.green, lineHeight: 1 }}>
                  <Counter to={n} suffix={suffix} />
                </div>
                <div style={{ fontSize: '0.72rem', color: C.text2, marginTop: 5, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
              </div>
            ))}
            <div>
              <div style={{ fontFamily: 'var(--font-poppins)', fontSize: 'clamp(1.5rem, 2.8vw, 2rem)', fontWeight: 800, color: C.green, lineHeight: 1 }}>89%</div>
              <div style={{ fontSize: '0.72rem', color: C.text2, marginTop: 5, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600 }}>Tasa de mejora</div>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          style={{ position: 'absolute', bottom: 36, left: '50%', transform: 'translateX(-50%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}
          aria-hidden
        >
          <span style={{ fontSize: '0.62rem', color: C.text3, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>Descubrir</span>
          <motion.div animate={{ y: [0, 9, 0] }} transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }} style={{ width: 1, height: 36, background: `linear-gradient(to bottom, ${C.green}60, transparent)` }} />
        </motion.div>
      </section>

      {/* ══ CÓMO FUNCIONA ════════════════════════════════════════════ */}
      <section id="como-funciona" style={{ padding: '7rem 5vw', background: C.bg1 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Reveal style={{ textAlign: 'center', marginBottom: 56 }}>
            <Pill>Proceso</Pill>
            <Heading>4 pasos hasta <span style={{ color: C.green }}>el aprobado.</span></Heading>
          </Reveal>

          <StaggerGrid style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1.25rem' }} >
            {steps.map((s) => (
              <motion.div
                key={s.n}
                variants={vFadeUp}
                whileHover={{ y: -6, boxShadow: `0 20px 60px rgba(29,158,117,0.12)` }}
                style={{
                  position: 'relative', padding: '2rem 1.75rem',
                  background: C.bg2, borderRadius: 24,
                  border: `1px solid ${C.greenBorder}`,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
                  overflow: 'hidden', transition: 'box-shadow 0.3s ease, transform 0.3s ease',
                }}
              >
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${C.green}, transparent)`, borderRadius: '24px 24px 0 0', opacity: 0.6 }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                  <span style={{ fontFamily: 'var(--font-poppins)', fontSize: '2.4rem', color: C.green, opacity: 0.18, fontWeight: 800, lineHeight: 1 }}>{s.n}</span>
                  <span style={{ fontSize: '1.5rem' }}>{s.icon}</span>
                </div>
                <h3 style={{ fontSize: '0.97rem', fontWeight: 700, color: C.text0, marginBottom: 10, fontFamily: 'var(--font-poppins)', letterSpacing: '-0.01em' }}>{s.title}</h3>
                <p style={{ fontSize: '0.85rem', color: C.text1, lineHeight: 1.75 }}>{s.desc}</p>
              </motion.div>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* ══ CARACTERÍSTICAS ══════════════════════════════════════════ */}
      <section style={{ padding: '7rem 5vw', background: C.bg0 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Reveal style={{ textAlign: 'center', marginBottom: 56 }}>
            <Pill>Características</Pill>
            <Heading>Todo lo que necesitas para <span style={{ color: C.green }}>aprobar.</span></Heading>
          </Reveal>

          <StaggerGrid style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.25rem' }}>
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={vFadeUp}
                whileHover={{ y: -5, boxShadow: `0 20px 60px rgba(29,158,117,0.1)` }}
                style={{
                  padding: '1.75rem', background: C.bg2, borderRadius: 22,
                  border: `1px solid rgba(255,255,255,0.06)`,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                  transition: 'box-shadow 0.3s ease, transform 0.3s ease',
                  cursor: 'default',
                }}
              >
                <div style={{ width: 50, height: 50, borderRadius: 16, background: C.greenGlow, border: `1px solid ${C.greenBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', marginBottom: 18, boxShadow: `0 4px 16px rgba(29,158,117,0.12)` }}>
                  {f.icon}
                </div>
                <h3 style={{ fontSize: '0.97rem', fontWeight: 700, color: C.text0, marginBottom: 10, fontFamily: 'var(--font-poppins)', letterSpacing: '-0.01em' }}>{f.title}</h3>
                <p style={{ fontSize: '0.85rem', color: C.text1, lineHeight: 1.78 }}>{f.desc}</p>
              </motion.div>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* ══ DASHBOARD ════════════════════════════════════════════════ */}
      <section style={{ padding: '7rem 5vw', background: C.bg1, overflow: 'hidden' }}>
        <div className="aprobea-dash" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: '5rem', alignItems: 'center' }}>
          <div>
            <Reveal><Pill>Dashboard personal</Pill></Reveal>
            <Reveal delay={0.08}><Heading>Sabe exactamente <span style={{ color: C.green }}>dónde estás.</span></Heading></Reveal>
            <Reveal delay={0.16}>
              <p style={{ fontSize: '0.92rem', color: C.text1, lineHeight: 1.82, margin: '20px 0 28px' }}>
                Dashboard en tiempo real con tu ratio de acierto por tema, evolución temporal y heatmap de errores. Sin sorpresas el día del examen.
              </p>
            </Reveal>
            <Reveal delay={0.22}>
              {['Ratio de acierto por tema y bloque', 'Evolución semana a semana con gráfico', 'Heatmap visual de temas con más errores', 'Comparativa anónima con tu convocatoria'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <CheckIcon />
                  <span style={{ fontSize: '0.88rem', color: C.text1, fontWeight: 500 }}>{item}</span>
                </div>
              ))}
            </Reveal>
          </div>

          <Reveal delay={0.1}>
            <div style={{ borderRadius: 24, overflow: 'hidden', border: `1px solid ${C.greenBorder}`, boxShadow: `0 40px 120px rgba(0,0,0,0.6), 0 0 80px rgba(29,158,117,0.05)` }}>
              <div style={{ background: '#050A07', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${C.greenBorder}` }}>
                <div style={{ display: 'flex', gap: 5 }}>
                  {['#e05252', '#e0c052', '#52c152'].map(c => <div key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c, opacity: 0.55 }} />)}
                </div>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.04)', borderRadius: 6, padding: '3px 10px', fontSize: '9px', color: 'rgba(255,255,255,0.2)', fontFamily: 'monospace' }}>
                  app.aprobea.com/dashboard
                </div>
              </div>
              <div style={{ background: '#040A06', padding: 14 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 10 }}>
                  {[['87%', 'Acierto hoy', C.green], ['23d', 'Racha activa', '#FFB84D'], ['#47', 'Ranking', '#A78BFA']].map(([v, l, c]) => (
                    <div key={String(l)} style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid rgba(255,255,255,0.06)`, borderRadius: 12, padding: '9px 11px' }}>
                      <div style={{ fontSize: '8px', color: 'rgba(255,255,255,0.28)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>{String(l)}</div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: String(c), fontFamily: 'var(--font-poppins)' }}>{String(v)}</div>
                    </div>
                  ))}
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.05)`, borderRadius: 12, padding: '11px 11px 4px', marginBottom: 8 }}>
                  <div style={{ fontSize: '8px', color: C.green, opacity: 0.65, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>Evolución de acierto · últimos 7 días</div>
                  <ResponsiveContainer width="100%" height={88}>
                    <LineChart data={weeklyData} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                      <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.22)', fontSize: 8 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.22)', fontSize: 8 }} domain={[50, 100]} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#0C1810', border: `1px solid ${C.greenBorder}`, borderRadius: 10, fontSize: 10, color: C.text0 }} formatter={(v: unknown) => [`${v}%`, 'Acierto']} />
                      <Line type="monotone" dataKey="acierto" stroke={C.green} strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: C.green }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.05)`, borderRadius: 12, padding: '11px 11px 4px', marginBottom: 8 }}>
                  <div style={{ fontSize: '8px', color: C.green, opacity: 0.65, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 6 }}>Ratio por tema · Administrativo General</div>
                  <ResponsiveContainer width="100%" height={78}>
                    <BarChart data={topicData} margin={{ top: 0, right: 4, bottom: 0, left: -26 }}>
                      <XAxis dataKey="tema" tick={{ fill: 'rgba(255,255,255,0.22)', fontSize: 7 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'rgba(255,255,255,0.22)', fontSize: 7 }} domain={[0, 100]} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: '#0C1810', border: `1px solid ${C.greenBorder}`, borderRadius: 10, fontSize: 10, color: C.text0 }} formatter={(v: unknown) => [`${v}%`, 'Ratio']} />
                      <Bar dataKey="ratio" fill={C.green} opacity={0.85} radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.02)', border: `1px solid rgba(255,255,255,0.05)`, borderRadius: 12, padding: 11 }}>
                  <div style={{ fontSize: '8px', color: C.green, opacity: 0.65, letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 8 }}>Heatmap de dominio · 20 temas</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {heatmap.map((pct, i) => (
                      <div key={i} title={`Tema ${i + 1}: ${pct}%`} style={{ width: 22, height: 22, borderRadius: 6, background: pct > 80 ? 'rgba(29,158,117,0.75)' : pct > 60 ? 'rgba(29,158,117,0.45)' : pct > 30 ? 'rgba(224,168,50,0.55)' : 'rgba(220,60,60,0.48)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '7px', color: 'rgba(255,255,255,0.85)', fontWeight: 700 }}>
                        {i + 1}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ══ BOE RADAR ════════════════════════════════════════════════ */}
      <section style={{ padding: '7rem 5vw', background: C.bg0 }}>
        <div className="aprobea-boe" style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5rem', alignItems: 'center' }}>
          <Reveal delay={0.08}>
            <div style={{ background: C.bg2, border: `1px solid ${C.greenBorder}`, borderRadius: 24, padding: '1.75rem', boxShadow: `0 24px 80px rgba(0,0,0,0.4), 0 0 40px rgba(29,158,117,0.05)` }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: C.green, marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontFamily: 'var(--font-poppins)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.green, animation: 'aprobea-pulse 2s infinite', display: 'inline-block', flexShrink: 0 }} />
                BOE Radar · En vivo
              </div>
              {[
                { tipo: 'CONVOCATORIA', titulo: 'Convocatoria 45 plazas Cuerpo Técnico AGE', fuente: 'BOE', fecha: 'Hace 2h', color: '#1D9E75' },
                { tipo: 'BASES', titulo: 'Bases específicas — Policía Local Granada', fuente: 'BOJA', fecha: 'Hace 5h', color: '#4db87a' },
                { tipo: 'RESULTADO', titulo: 'Relación aprobados OPE Enfermería SERMAS', fuente: 'BOCM', fecha: 'Ayer', color: '#4d9fd4' },
                { tipo: 'TEMARIO', titulo: 'Actualización temario auxiliar administrativo', fuente: 'BOE', fecha: 'Ayer', color: '#FFB84D' },
                { tipo: 'CONVOCATORIA', titulo: 'OPE extraordinaria 120 plazas Mossos', fuente: 'DOGC', fecha: '2 días', color: '#1D9E75' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 12, padding: '0.7rem 0', borderBottom: i < 4 ? `1px solid rgba(29,158,117,0.08)` : 'none' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: item.color, flexShrink: 0, marginTop: 5 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '11px', color: C.text0, fontWeight: 600, lineHeight: 1.4, marginBottom: 3 }}>{item.titulo}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: 6, background: `${item.color}22`, color: item.color, fontWeight: 700 }}>{item.tipo}</span>
                      <span style={{ fontSize: '9px', color: C.text2 }}>{item.fuente}</span>
                      <span style={{ fontSize: '9px', color: C.text2 }}>· {item.fecha}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div style={{ marginTop: '1rem', padding: '9px 14px', background: C.greenGlow, border: `1px solid ${C.greenBorder}`, borderRadius: 12, fontSize: '10px', color: C.green, letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center', fontWeight: 700, fontFamily: 'var(--font-poppins)' }}>
                Ver todas las publicaciones →
              </div>
            </div>
          </Reveal>

          <div>
            <Reveal><Pill>BOE Radar — 24/7</Pill></Reveal>
            <Reveal delay={0.08}><Heading>Nunca te pierdas una <span style={{ color: C.green }}>convocatoria.</span></Heading></Reveal>
            <Reveal delay={0.16}>
              <p style={{ fontSize: '0.92rem', color: C.text1, lineHeight: 1.82, margin: '20px 0 28px' }}>
                Nuestro sistema rastrea el BOE estatal y los 17 boletines autonómicos. Cuando sale una convocatoria que te interesa, recibes un email en minutos con el resumen generado por IA.
              </p>
            </Reveal>
            <Reveal delay={0.22}>
              {['BOE estatal + 17 BOES autonómicos rastreados', 'Resumen automático de cada publicación con IA', 'Alertas por cuerpo, categoría o palabra clave', 'Historial completo de convocatorias y bases'].map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <CheckIcon />
                  <span style={{ fontSize: '0.88rem', color: C.text1, fontWeight: 500 }}>{item}</span>
                </div>
              ))}
            </Reveal>
          </div>
        </div>
      </section>

      {/* ══ PRECIOS ══════════════════════════════════════════════════ */}
      <section id="precios" style={{ padding: '7rem 5vw', background: C.bg1 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Reveal style={{ textAlign: 'center', marginBottom: 56 }}>
            <Pill>Planes</Pill>
            <Heading>Sin sorpresas. <span style={{ color: C.green }}>Precio justo.</span></Heading>
            <p style={{ fontSize: '0.9rem', color: C.text1, marginTop: 14 }}>Cancela cuando quieras. Sin permanencia.</p>
          </Reveal>

          <StaggerGrid style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.25rem', alignItems: 'start' }}>
            {plans.map((plan) => (
              <motion.div
                key={plan.id}
                variants={vFadeUp}
                whileHover={!plan.featured ? { y: -6 } : {}}
                style={{
                  padding: plan.featured ? '2.5rem 2rem' : '2rem 1.75rem',
                  background: plan.featured ? `linear-gradient(160deg, ${C.bg3} 0%, ${C.bg2} 100%)` : C.bg2,
                  border: `1px solid ${plan.featured ? C.green : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: 24, position: 'relative',
                  boxShadow: plan.featured ? `0 8px 60px rgba(29,158,117,0.14), 0 0 0 1px ${C.green}` : '0 4px 20px rgba(0,0,0,0.22)',
                  transition: 'box-shadow 0.3s ease, transform 0.3s ease',
                }}
              >
                {plan.featured && (
                  <div style={{ position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)', background: C.green, color: '#fff', fontSize: '0.68rem', fontWeight: 800, padding: '5px 18px', borderRadius: 50, letterSpacing: '0.1em', whiteSpace: 'nowrap', fontFamily: 'var(--font-poppins)', boxShadow: `0 4px 16px ${C.greenShadow}` }}>
                    MÁS POPULAR
                  </div>
                )}

                <div style={{ fontSize: '0.72rem', color: plan.featured ? C.green : C.text2, textTransform: 'uppercase', letterSpacing: '0.12em', fontWeight: 800, marginBottom: 10, fontFamily: 'var(--font-poppins)' }}>{plan.name}</div>

                <div style={{ marginBottom: 4, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontFamily: 'var(--font-poppins)', fontSize: plan.featured ? '3rem' : '2.4rem', fontWeight: 800, color: plan.featured ? C.green : C.text0, lineHeight: 1 }}>{plan.price}</span>
                  <span style={{ fontSize: '0.82rem', color: C.text2, fontWeight: 500 }}>{plan.period}</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: C.text2, marginBottom: 24, fontWeight: 500 }}>{plan.sub}</p>

                <div style={{ borderTop: `1px solid rgba(255,255,255,0.08)`, paddingTop: 20, marginBottom: 24 }}>
                  {plan.included.map((item) => (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
                      <CheckIcon />
                      <span style={{ fontSize: '0.84rem', color: plan.featured ? C.text0 : C.text1, fontWeight: 500 }}>{item}</span>
                    </div>
                  ))}
                  {plan.excluded.map((item) => (
                    <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10, opacity: 0.3 }}>
                      <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="8.5" stroke={C.text2}/><path d="M6 12L12 6M6 6L12 12" stroke={C.text2} strokeWidth="1.4" strokeLinecap="round"/></svg>
                      <span style={{ fontSize: '0.84rem', color: C.text2, textDecoration: 'line-through' }}>{item}</span>
                    </div>
                  ))}
                </div>

                <a href={plan.href} style={{
                  display: 'block', textAlign: 'center', textDecoration: 'none',
                  padding: '13px 20px', borderRadius: 50,
                  fontSize: '0.88rem', fontWeight: 800, letterSpacing: '0.01em',
                  fontFamily: 'var(--font-poppins)',
                  background: plan.featured ? C.green : 'transparent',
                  color: plan.featured ? '#fff' : C.text1,
                  border: plan.featured ? 'none' : `1px solid rgba(255,255,255,0.12)`,
                  boxShadow: plan.featured ? `0 6px 24px ${C.greenShadow}` : 'none',
                }}>
                  {plan.cta} →
                </a>
              </motion.div>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* ══ CTA FINAL ════════════════════════════════════════════════ */}
      <section style={{ padding: '8rem 5vw', background: `linear-gradient(180deg, ${C.bg0} 0%, ${C.bg1} 50%, ${C.bg0} 100%)`, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(ellipse 55% 50% at 50% 55%, rgba(29,158,117,0.06) 0%, transparent 70%)` }} aria-hidden />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 660, margin: '0 auto' }}>
          <Reveal><Pill>Empieza hoy</Pill></Reveal>
          <Reveal delay={0.1}>
            <h2 style={{ fontFamily: 'var(--font-poppins)', fontSize: 'clamp(2.4rem, 5vw, 3.8rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', marginBottom: 20 }}>
              Tu siguiente paso hacia el{' '}
              <span style={{ color: C.green, textShadow: `0 0 40px ${C.greenShadow}` }}>aprobado.</span>
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p style={{ fontSize: '1rem', color: C.text1, lineHeight: 1.78, marginBottom: 40, fontWeight: 400 }}>
              Únete a más de 12.000 opositores que ya estudian con IA. Sin compromisos, sin tarjeta de crédito.
            </p>
          </Reveal>
          <Reveal delay={0.28}>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
              <a href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: C.green, color: '#fff', fontWeight: 800, textDecoration: 'none', padding: '16px 44px', borderRadius: 50, fontSize: '1rem', fontFamily: 'var(--font-poppins)', boxShadow: `0 8px 44px ${C.greenShadow}` }}>
                Crear cuenta gratuita →
              </a>
              <a href="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.05)', color: C.text1, fontWeight: 600, textDecoration: 'none', padding: '16px 32px', borderRadius: 50, fontSize: '0.95rem', border: `1px solid rgba(255,255,255,0.12)`, backdropFilter: 'blur(10px)' }}>
                Ya tengo cuenta
              </a>
            </div>
            <p style={{ fontSize: '0.74rem', color: C.text2, letterSpacing: '0.05em', fontWeight: 600, fontFamily: 'var(--font-poppins)' }}>
              Gratis para siempre · Sin tarjeta · Cancela cuando quieras
            </p>
          </Reveal>
        </div>
      </section>

      {/* ══ FOOTER ════════════════════════════════════════════════════ */}
      <footer style={{ background: C.bg0, borderTop: `1px solid rgba(255,255,255,0.05)`, padding: '3.5rem 5vw 2.5rem' }}>
        <div className="aprobea-footer" style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', gap: '3rem', marginBottom: '2.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 14 }}>
              <LogoIcon size={30} />
              <span style={{ fontFamily: 'var(--font-poppins)', fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                <span style={{ color: C.text0 }}>Apro</span><span style={{ color: C.green }}>bea</span>
              </span>
            </div>
            <p style={{ fontSize: '0.84rem', color: C.text2, lineHeight: 1.72, maxWidth: 250, marginBottom: 18, fontWeight: 400 }}>
              La plataforma más avanzada de España para preparar oposiciones. IA, BOE Radar y exámenes adaptativos.
            </p>
            <p style={{ fontSize: '0.78rem', color: C.text2 }}>© 2026 Aprobea.com · Todos los derechos reservados.</p>
          </div>

          {[
            { title: 'Plataforma', links: ['BOE Radar', 'Exámenes IA', 'Plan de Estudio', 'Flashcards', 'Ranking'] },
            { title: 'Oposiciones', links: ['Administración AGE', 'Cuerpos de Seguridad', 'Sanidad', 'Educación', 'Ayuntamientos'] },
            { title: 'Legal', links: ['Privacidad', 'Términos de uso', 'Cookies', 'Contacto', 'Acceder'] },
          ].map((col) => (
            <div key={col.title}>
              <h4 style={{ fontSize: '0.72rem', color: C.text0, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 16, fontFamily: 'var(--font-poppins)' }}>{col.title}</h4>
              {col.links.map((link) => (
                <a key={link} href="#" style={{ display: 'block', fontSize: '0.84rem', color: C.text2, textDecoration: 'none', marginBottom: 10, fontWeight: 500 }}>{link}</a>
              ))}
            </div>
          ))}
        </div>

        <div style={{ maxWidth: 1100, margin: '0 auto', paddingTop: '1.5rem', borderTop: `1px solid rgba(255,255,255,0.05)`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontSize: '0.74rem', color: C.text3, fontWeight: 500 }}>Aprobea.com — Oposiciones nacionales, regionales y locales</span>
          <span style={{ fontSize: '0.74rem', color: C.text3, fontWeight: 500 }}>Madrid, España</span>
        </div>
      </footer>

      {/* ─── Global styles ─────────────────────────────────────────── */}
      <style>{`
        @keyframes aprobea-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 10px ${C.green}; }
          50%       { opacity: 0.4; box-shadow: 0 0 4px ${C.green}; }
        }

        /* Responsive grids */
        @media (max-width: 1100px) {
          .aprobea-grid-4 { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 960px) {
          .aprobea-dash   { grid-template-columns: 1fr !important; gap: 3rem !important; }
          .aprobea-boe    { grid-template-columns: 1fr !important; gap: 3rem !important; }
          .aprobea-footer { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 720px) {
          .aprobea-grid-3 { grid-template-columns: 1fr !important; }
          .aprobea-grid-4 { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 600px) {
          .aprobea-footer { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 680px) {
          .aprobea-nav-desktop { display: none !important; }
          .aprobea-nav-mobile  { display: flex !important; }
        }
        @media (min-width: 681px) {
          .aprobea-nav-mobile { display: none !important; }
        }

        nav a:hover { opacity: 0.75; }
        footer a:hover { color: ${C.text0} !important; }
      `}</style>
    </div>
  )
}
