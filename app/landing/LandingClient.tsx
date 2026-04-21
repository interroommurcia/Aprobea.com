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

/* ─── Design tokens ──────────────────────────────────────────────── */
const C = {
  bg0: '#030710',
  bg1: '#060D1E',
  bg2: '#0A1530',
  bg3: '#0F1C42',
  cyan: '#00CFFF',
  cyan2: '#0090C8',
  cyanBorder: 'rgba(0,207,255,0.18)',
  cyanGlow: 'rgba(0,207,255,0.07)',
  cyanShadow: 'rgba(0,207,255,0.18)',
  text0: '#EEF2FF',
  text1: '#8B9DC9',
  text2: '#445070',
  text3: '#242E4A',
}

/* ─── Framer Motion variants ─────────────────────────────────────── */
const vFadeUp: Variants = {
  hidden: { opacity: 0, y: 36 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.22, 1, 0.36, 1] } },
}
const vFadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.6 } },
}
const vSlideRight: Variants = {
  hidden: { opacity: 0, x: -28 },
  show: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
}
const vStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
}

/* ─── Helpers ────────────────────────────────────────────────────── */
function Reveal({
  children,
  delay = 0,
  className,
  style,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.15 })
  return (
    <motion.div
      ref={ref}
      variants={vFadeUp}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
      transition={{ delay }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  )
}

function StaggerGrid({
  children,
  className,
  style,
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.08 })
  return (
    <motion.div
      ref={ref}
      variants={vStagger}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  )
}

function CheckList({ items, featured }: { items: string[]; featured?: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.1 })
  return (
    <motion.div
      ref={ref}
      variants={vStagger}
      initial="hidden"
      animate={inView ? 'show' : 'hidden'}
    >
      {items.map((item) => (
        <motion.div
          key={item}
          variants={vSlideRight}
          style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 11 }}
        >
          <CheckIcon color={featured ? C.cyan : C.text1} />
          <span style={{ fontSize: '0.86rem', color: featured ? C.text0 : C.text1 }}>{item}</span>
        </motion.div>
      ))}
    </motion.div>
  )
}

function CheckIcon({ color }: { color: string }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      style={{ flexShrink: 0 }}
    >
      <circle cx="8" cy="8" r="7.5" stroke={color} strokeOpacity="0.4" />
      <path
        d="M5 8.5L7 10.5L11 6"
        stroke={color}
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'inline-block',
        fontSize: '0.7rem',
        color: C.cyan,
        letterSpacing: '0.16em',
        textTransform: 'uppercase',
        border: `0.5px solid ${C.cyanBorder}`,
        borderRadius: 100,
        padding: '4px 14px',
        marginBottom: 18,
        fontWeight: 500,
      }}
    >
      {children}
    </div>
  )
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: 'var(--font-cormorant, Georgia, serif)',
        fontSize: 'clamp(2rem, 4vw, 3.2rem)',
        fontWeight: 400,
        lineHeight: 1.15,
        letterSpacing: '-0.02em',
      }}
    >
      {children}
    </h2>
  )
}

/* ─── Animated counter ───────────────────────────────────────────── */
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
      const eased = 1 - Math.pow(1 - p, 3)
      setCount(Math.floor(eased * to))
      if (p < 1) requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)
  }, [inView, to])

  return (
    <span ref={ref}>
      {count.toLocaleString('es-ES')}
      {suffix}
    </span>
  )
}

/* ─── Data ───────────────────────────────────────────────────────── */
const weeklyData = [
  { day: 'Lun', acierto: 61 },
  { day: 'Mar', acierto: 70 },
  { day: 'Mié', acierto: 67 },
  { day: 'Jue', acierto: 78 },
  { day: 'Vie', acierto: 83 },
  { day: 'Sáb', acierto: 87 },
  { day: 'Dom', acierto: 91 },
]

const topicData = [
  { tema: 'Const.', ratio: 88 },
  { tema: 'LRBRL', ratio: 72 },
  { tema: 'TREBEP', ratio: 65 },
  { tema: 'LPAC', ratio: 91 },
  { tema: 'LCSP', ratio: 54 },
  { tema: 'CARM', ratio: 78 },
]

const heatmap = [92, 88, 45, 71, 33, 95, 12, 67, 78, 54, 88, 23, 91, 44, 82, 60, 15, 73, 89, 51]

const features = [
  {
    icon: '🧠',
    title: 'IA fine-tuned en temarios CARM',
    desc: 'Modelos entrenados con los temarios oficiales de la Región de Murcia y sus ayuntamientos. Preguntas que salen en los exámenes reales.',
  },
  {
    icon: '📡',
    title: 'BOE + BORM automático',
    desc: 'Seguimiento diario del BOE estatal y el Boletín Oficial de la Región de Murcia. Alertas instantáneas cuando sale tu convocatoria.',
  },
  {
    icon: '🎯',
    title: 'Tests ultra-personalizables',
    desc: 'Filtra por tema, bloque, dificultad y tipo de pregunta. Exámenes a medida en segundos, con tiempo límite opcional.',
  },
  {
    icon: '⚡',
    title: 'Corrección instantánea con IA',
    desc: 'Cada respuesta incorrecta genera una explicación basada en el temario oficial. Sin buscar tú nada, sin perder tiempo.',
  },
  {
    icon: '📊',
    title: 'Analytics por tema y bloque',
    desc: 'Heatmap de errores, ratio de acierto por tema y evolución temporal. Sabes exactamente dónde flaqueas antes del examen.',
  },
  {
    icon: '📈',
    title: 'Seguimiento de evolución',
    desc: 'Gráfico de progreso semana a semana. Comprueba tu mejora real y compárate con la media de usuarios de tu oposición.',
  },
]

const steps = [
  {
    n: '01',
    icon: '🎯',
    title: 'Elige tu oposición',
    desc: 'Selecciona tu oposición CARM, Ayuntamiento o AGE. El sistema carga automáticamente los temarios oficiales validados.',
  },
  {
    n: '02',
    icon: '⚙️',
    title: 'Configura el examen',
    desc: 'Filtra por tema, bloque, dificultad y número de preguntas. Activa el tiempo límite para simular las condiciones reales.',
  },
  {
    n: '03',
    icon: '🚀',
    title: 'Practica y mejora',
    desc: 'Corrección instantánea con la IA. Tu dashboard rastrea evolución, detecta fallos y ajusta la dificultad automáticamente.',
  },
]

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '0€',
    period: 'para siempre',
    sub: 'Sin tarjeta de crédito',
    cta: 'Crear cuenta gratis',
    href: '/auth/signup',
    featured: false,
    included: [
      '1 examen al día',
      'Hasta 20 preguntas por test',
      '2 oposiciones activas',
      'Dashboard básico',
      'BOE Radar (últimas 24h)',
    ],
    excluded: ['IA explicativa', 'Filtros avanzados', 'Historial ilimitado'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '9,90€',
    period: '/ mes',
    sub: 'Cancela cuando quieras',
    cta: 'Empezar con Pro',
    href: '/auth/signup?plan=pro',
    featured: true,
    included: [
      'Exámenes ilimitados',
      'Sin límite de preguntas',
      'Todas las oposiciones CARM',
      'IA explicativa por pregunta',
      'Filtros completos (tema, dificultad…)',
      'Analytics + evolución temporal',
      'Alertas BOE + BORM personalizadas',
      'Historial completo',
    ],
    excluded: [],
  },
  {
    id: 'academy',
    name: 'Academy',
    price: '24,90€',
    period: '/ mes',
    sub: 'Para centros y academias',
    cta: 'Contactar Academy',
    href: '/contacto',
    featured: false,
    included: [
      'Todo lo de Pro',
      'Hasta 50 alumnos',
      'Panel de administración',
      'Estadísticas de grupo',
      'Banco de preguntas privado',
      'Soporte prioritario',
    ],
    excluded: [],
  },
]

/* ─── Main ───────────────────────────────────────────────────────── */
export default function LandingClient() {
  const [scrolled, setScrolled] = useState(false)
  const heroRef = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '22%'])
  const heroOpacity = useTransform(scrollYProgress, [0, 0.65], [1, 0])

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 56)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  return (
    <div
      style={{
        background: C.bg0,
        color: C.text0,
        fontFamily: 'var(--font-outfit, system-ui, sans-serif)',
        fontWeight: 300,
        overflowX: 'hidden',
      }}
    >
      {/* ════════════════════════════════════════════════
          NAV
      ════════════════════════════════════════════════ */}
      <motion.nav
        initial={{ y: -80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.55, ease: 'easeOut' }}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 999,
          height: 66,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 5vw',
          background: scrolled ? 'rgba(3,7,16,0.96)' : 'transparent',
          backdropFilter: scrolled ? 'blur(18px)' : 'none',
          borderBottom: scrolled
            ? `0.5px solid ${C.cyanBorder}`
            : '0.5px solid transparent',
          transition:
            'background 0.4s ease, border-color 0.4s ease, backdrop-filter 0.4s ease',
        }}
      >
        {/* Logo */}
        <a
          href="/landing"
          style={{ display: 'flex', alignItems: 'center', gap: 9, textDecoration: 'none' }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 7,
              background: `linear-gradient(135deg, ${C.cyan}, ${C.cyan2})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 15,
              fontWeight: 800,
              color: '#000',
              flexShrink: 0,
            }}
          >
            E
          </div>
          <span
            style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              color: C.text0,
              letterSpacing: '-0.02em',
            }}
          >
            ExamIA
          </span>
        </a>

        {/* Links */}
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <a
            href="#precios"
            style={{
              fontSize: '0.82rem',
              color: C.text1,
              textDecoration: 'none',
              padding: '6px 12px',
            }}
          >
            Precios
          </a>
          <a
            href="/login"
            style={{
              fontSize: '0.82rem',
              color: C.text1,
              textDecoration: 'none',
              padding: '6px 12px',
            }}
          >
            Iniciar sesión
          </a>
          <a
            href="/auth/signup"
            style={{
              fontSize: '0.82rem',
              background: C.cyan,
              color: '#000',
              fontWeight: 700,
              textDecoration: 'none',
              padding: '8px 20px',
              borderRadius: 7,
              letterSpacing: '0.01em',
            }}
          >
            Empezar gratis
          </a>
        </div>
      </motion.nav>

      {/* ════════════════════════════════════════════════
          HERO
      ════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        style={{
          position: 'relative',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Parallax background */}
        <motion.div
          style={{ position: 'absolute', inset: 0, y: bgY }}
          aria-hidden
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(ellipse 80% 60% at 50% 25%, rgba(0,140,255,0.13) 0%, transparent 70%)`,
            }}
          />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `radial-gradient(ellipse 50% 40% at 85% 75%, rgba(0,70,200,0.08) 0%, transparent 60%)`,
            }}
          />
          {/* Subtle grid */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: `linear-gradient(${C.cyanBorder.replace('0.18', '0.05')} 1px, transparent 1px), linear-gradient(90deg, ${C.cyanBorder.replace('0.18', '0.05')} 1px, transparent 1px)`,
              backgroundSize: '72px 72px',
              maskImage:
                'radial-gradient(ellipse 90% 65% at 50% 50%, black 20%, transparent 80%)',
            }}
          />
        </motion.div>

        <motion.div
          style={{
            position: 'relative',
            zIndex: 2,
            maxWidth: 940,
            margin: '0 auto',
            padding: '0 5vw',
            paddingTop: 110,
            opacity: heroOpacity,
          }}
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              background: C.cyanGlow,
              border: `0.5px solid ${C.cyanBorder}`,
              borderRadius: 100,
              padding: '5px 16px',
              marginBottom: 36,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: C.cyan,
                boxShadow: `0 0 8px ${C.cyan}`,
                animation: 'examia-pulse 2s infinite',
              }}
            />
            <span
              style={{
                fontSize: '0.7rem',
                color: C.cyan,
                letterSpacing: '0.12em',
                fontWeight: 500,
              }}
            >
              BOE RADAR ACTIVO · CARM + AYUNTAMIENTOS
            </span>
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.38, ease: [0.22, 1, 0.36, 1] }}
            style={{
              fontFamily: 'var(--font-cormorant, Georgia, serif)',
              fontSize: 'clamp(2.8rem, 7.5vw, 5.8rem)',
              fontWeight: 400,
              lineHeight: 1.08,
              letterSpacing: '-0.025em',
              marginBottom: 28,
            }}
          >
            Exámenes oficiales de<br />
            oposiciones{' '}
            <em style={{ fontStyle: 'italic', color: C.cyan }}>a tu medida.</em>
            <br />
            <span
              style={{
                fontSize: '0.52em',
                fontWeight: 300,
                color: C.text1,
                letterSpacing: '-0.01em',
              }}
            >
              IA que ya conoce los temarios de Murcia.
            </span>
          </motion.h1>

          {/* Sub */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.52 }}
            style={{
              fontSize: 'clamp(0.95rem, 2vw, 1.12rem)',
              color: C.text1,
              lineHeight: 1.78,
              maxWidth: 580,
              marginBottom: 44,
            }}
          >
            Genera tests personalizados por tema, dificultad y tipo.{' '}
            <strong style={{ color: C.text0, fontWeight: 600 }}>
              1 examen gratis al día.
            </strong>{' '}
            Pro ilimitado por solo{' '}
            <strong style={{ color: C.cyan, fontWeight: 600 }}>9,90 €/mes.</strong>
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.66 }}
            style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 72 }}
          >
            <a
              href="/auth/signup"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: C.cyan,
                color: '#000',
                fontWeight: 700,
                textDecoration: 'none',
                padding: '14px 34px',
                borderRadius: 8,
                fontSize: '0.98rem',
                letterSpacing: '0.01em',
                boxShadow: `0 0 36px ${C.cyanShadow}`,
              }}
            >
              Empezar gratis ahora →
            </a>
            <a
              href="#como-funciona"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                background: 'transparent',
                color: C.text0,
                fontWeight: 400,
                textDecoration: 'none',
                padding: '14px 28px',
                borderRadius: 8,
                fontSize: '0.95rem',
                border: `1px solid rgba(255,255,255,0.1)`,
              }}
            >
              Ver cómo funciona
            </a>
          </motion.div>

          {/* Trust badges */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.9 }}
            style={{
              display: 'flex',
              gap: '2.5rem',
              flexWrap: 'wrap',
              paddingTop: 36,
              borderTop: `0.5px solid ${C.cyanBorder}`,
            }}
          >
            {[
              { n: 12000, suffix: '+', label: 'Exámenes generados' },
              { n: 340, suffix: '+', label: 'Temas cubiertos CARM' },
              { n: 99, suffix: '%', label: 'Uptime garantizado' },
            ].map(({ n, suffix, label }) => (
              <div key={label}>
                <div
                  style={{
                    fontFamily: 'var(--font-cormorant, Georgia, serif)',
                    fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                    fontWeight: 500,
                    color: C.cyan,
                    lineHeight: 1,
                  }}
                >
                  <Counter to={n} suffix={suffix} />
                </div>
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: C.text2,
                    marginTop: 5,
                    letterSpacing: '0.07em',
                    textTransform: 'uppercase',
                  }}
                >
                  {label}
                </div>
              </div>
            ))}
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-cormorant, Georgia, serif)',
                  fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                  fontWeight: 500,
                  color: C.cyan,
                  lineHeight: 1,
                }}
              >
                Diario
              </div>
              <div
                style={{
                  fontSize: '0.7rem',
                  color: C.text2,
                  marginTop: 5,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                }}
              >
                Actualización BOE
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* Scroll cue */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6, duration: 1 }}
          style={{
            position: 'absolute',
            bottom: 38,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 6,
          }}
          aria-hidden
        >
          <span
            style={{
              fontSize: '0.65rem',
              color: C.text3,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
            }}
          >
            Descubrir
          </span>
          <motion.div
            animate={{ y: [0, 9, 0] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
            style={{
              width: 1,
              height: 38,
              background: `linear-gradient(to bottom, ${C.cyan}55, transparent)`,
            }}
          />
        </motion.div>
      </section>

      {/* ════════════════════════════════════════════════
          CÓMO FUNCIONA
      ════════════════════════════════════════════════ */}
      <section
        id="como-funciona"
        style={{ padding: '8rem 5vw', background: C.bg1 }}
      >
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Reveal style={{ textAlign: 'center', marginBottom: 64 }}>
            <Pill>Proceso</Pill>
            <SectionHeading>
              Tu examen listo en{' '}
              <em style={{ color: C.cyan, fontStyle: 'italic' }}>3 pasos.</em>
            </SectionHeading>
          </Reveal>

          <StaggerGrid className="examia-grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.75rem' }}>
            {steps.map((s) => (
              <motion.div
                key={s.n}
                variants={vFadeUp}
                style={{
                  position: 'relative',
                  padding: '2rem 1.75rem',
                  background: C.bg2,
                  border: `0.5px solid ${C.cyanBorder}`,
                  borderRadius: 12,
                  overflow: 'hidden',
                }}
              >
                {/* Top accent line */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: `linear-gradient(90deg, ${C.cyan}, transparent)`,
                    borderRadius: '12px 12px 0 0',
                    opacity: 0.45,
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 18,
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-cormorant, Georgia, serif)',
                      fontSize: '2.8rem',
                      color: C.cyan,
                      opacity: 0.2,
                      fontWeight: 300,
                      lineHeight: 1,
                    }}
                  >
                    {s.n}
                  </span>
                  <span style={{ fontSize: '1.6rem' }}>{s.icon}</span>
                </div>
                <h3
                  style={{
                    fontSize: '0.98rem',
                    fontWeight: 600,
                    color: C.text0,
                    marginBottom: 10,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {s.title}
                </h3>
                <p
                  style={{
                    fontSize: '0.86rem',
                    color: C.text1,
                    lineHeight: 1.78,
                  }}
                >
                  {s.desc}
                </p>
              </motion.div>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          CARACTERÍSTICAS
      ════════════════════════════════════════════════ */}
      <section style={{ padding: '8rem 5vw', background: C.bg0 }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Reveal style={{ textAlign: 'center', marginBottom: 64 }}>
            <Pill>Características</Pill>
            <SectionHeading>
              Todo lo que necesitas para{' '}
              <em style={{ color: C.cyan, fontStyle: 'italic' }}>aprobar.</em>
            </SectionHeading>
          </Reveal>

          <StaggerGrid
            className="examia-grid-3"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1.25rem' }}
          >
            {features.map((f) => (
              <motion.div
                key={f.title}
                variants={vFadeUp}
                whileHover={{ y: -5, boxShadow: `0 24px 60px rgba(0,207,255,0.07)` }}
                style={{
                  padding: '1.75rem',
                  background: C.bg2,
                  border: `0.5px solid rgba(255,255,255,0.055)`,
                  borderRadius: 12,
                  cursor: 'default',
                  transition: 'border-color 0.3s',
                }}
              >
                <div
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: 10,
                    background: C.cyanGlow,
                    border: `0.5px solid ${C.cyanBorder}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.45rem',
                    marginBottom: 18,
                  }}
                >
                  {f.icon}
                </div>
                <h3
                  style={{
                    fontSize: '0.93rem',
                    fontWeight: 600,
                    color: C.text0,
                    marginBottom: 9,
                    letterSpacing: '-0.01em',
                  }}
                >
                  {f.title}
                </h3>
                <p
                  style={{
                    fontSize: '0.83rem',
                    color: C.text1,
                    lineHeight: 1.77,
                  }}
                >
                  {f.desc}
                </p>
              </motion.div>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          DASHBOARD / MÉTRICAS
      ════════════════════════════════════════════════ */}
      <section style={{ padding: '8rem 5vw', background: C.bg1, overflow: 'hidden' }}>
        <div
          className="examia-dash"
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr 1.35fr',
            gap: '5rem',
            alignItems: 'center',
          }}
        >
          {/* Left */}
          <div>
            <Reveal>
              <Pill>Dashboard personal</Pill>
            </Reveal>
            <Reveal delay={0.08}>
              <SectionHeading>
                Sabe exactamente{' '}
                <em style={{ color: C.cyan, fontStyle: 'italic' }}>
                  dónde estás.
                </em>
              </SectionHeading>
            </Reveal>
            <Reveal delay={0.16}>
              <p
                style={{
                  fontSize: '0.9rem',
                  color: C.text1,
                  lineHeight: 1.82,
                  margin: '20px 0 30px',
                }}
              >
                Dashboard en tiempo real con tu ratio de acierto por tema,
                evolución temporal y heatmap de errores. Sin sorpresas el día
                del examen.
              </p>
            </Reveal>
            <CheckList
              items={[
                'Ratio de acierto por tema y bloque',
                'Evolución semana a semana con gráfico',
                'Heatmap visual de temas con más errores',
                'Comparativa anónima con otros opositores',
              ]}
            />
          </div>

          {/* Right: browser mockup */}
          <Reveal delay={0.12}>
            <div
              style={{
                borderRadius: 14,
                overflow: 'hidden',
                border: `0.5px solid ${C.cyanBorder}`,
                boxShadow: `0 40px 120px rgba(0,0,0,0.65), 0 0 80px rgba(0,207,255,0.04)`,
              }}
            >
              {/* Browser bar */}
              <div
                style={{
                  background: '#050A18',
                  padding: '9px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  borderBottom: `0.5px solid ${C.cyanBorder}`,
                }}
              >
                <div style={{ display: 'flex', gap: 5 }}>
                  {['#e05252', '#e0c052', '#52c152'].map((c) => (
                    <div
                      key={c}
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        background: c,
                        opacity: 0.55,
                      }}
                    />
                  ))}
                </div>
                <div
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.04)',
                    borderRadius: 4,
                    padding: '3px 10px',
                    fontSize: '9px',
                    color: 'rgba(255,255,255,0.2)',
                    fontFamily: 'monospace',
                  }}
                >
                  app.examia.es/dashboard
                </div>
              </div>

              {/* Dashboard body */}
              <div style={{ background: '#040B1C', padding: 14 }}>
                {/* KPIs */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3,1fr)',
                    gap: 8,
                    marginBottom: 10,
                  }}
                >
                  {[
                    ['91%', 'Acierto hoy', C.cyan],
                    ['23d', 'Racha activa', '#FFB84D'],
                    ['#12', 'Ranking', '#A78BFA'],
                  ].map(([v, l, c]) => (
                    <div
                      key={l}
                      style={{
                        background: 'rgba(255,255,255,0.03)',
                        border: `0.5px solid rgba(255,255,255,0.06)`,
                        borderRadius: 8,
                        padding: '9px 11px',
                      }}
                    >
                      <div
                        style={{
                          fontSize: '8px',
                          color: 'rgba(255,255,255,0.28)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          marginBottom: 4,
                        }}
                      >
                        {l}
                      </div>
                      <div
                        style={{
                          fontSize: '15px',
                          fontWeight: 700,
                          color: c,
                        }}
                      >
                        {v}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Line chart */}
                <div
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: `0.5px solid rgba(255,255,255,0.05)`,
                    borderRadius: 8,
                    padding: '11px 11px 4px',
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: '8px',
                      color: C.cyan,
                      opacity: 0.65,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      marginBottom: 6,
                    }}
                  >
                    Evolución de acierto · últimos 7 días
                  </div>
                  <ResponsiveContainer width="100%" height={88}>
                    <LineChart
                      data={weeklyData}
                      margin={{ top: 4, right: 4, bottom: 0, left: -22 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.04)"
                      />
                      <XAxis
                        dataKey="day"
                        tick={{ fill: 'rgba(255,255,255,0.22)', fontSize: 8 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: 'rgba(255,255,255,0.22)', fontSize: 8 }}
                        domain={[50, 100]}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#0A1530',
                          border: `0.5px solid ${C.cyanBorder}`,
                          borderRadius: 6,
                          fontSize: 10,
                          color: C.text0,
                        }}
                        formatter={(v: unknown) => [`${v}%`, 'Acierto']}
                      />
                      <Line
                        type="monotone"
                        dataKey="acierto"
                        stroke={C.cyan}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4, fill: C.cyan }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Bar chart */}
                <div
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: `0.5px solid rgba(255,255,255,0.05)`,
                    borderRadius: 8,
                    padding: '11px 11px 4px',
                    marginBottom: 8,
                  }}
                >
                  <div
                    style={{
                      fontSize: '8px',
                      color: C.cyan,
                      opacity: 0.65,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      marginBottom: 6,
                    }}
                  >
                    Ratio por tema · Administrativo CARM
                  </div>
                  <ResponsiveContainer width="100%" height={78}>
                    <BarChart
                      data={topicData}
                      margin={{ top: 0, right: 4, bottom: 0, left: -26 }}
                    >
                      <XAxis
                        dataKey="tema"
                        tick={{ fill: 'rgba(255,255,255,0.22)', fontSize: 7 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: 'rgba(255,255,255,0.22)', fontSize: 7 }}
                        domain={[0, 100]}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: '#0A1530',
                          border: `0.5px solid ${C.cyanBorder}`,
                          borderRadius: 6,
                          fontSize: 10,
                          color: C.text0,
                        }}
                        formatter={(v: unknown) => [`${v}%`, 'Ratio']}
                      />
                      <Bar
                        dataKey="ratio"
                        fill={C.cyan}
                        opacity={0.75}
                        radius={[3, 3, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Heatmap */}
                <div
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: `0.5px solid rgba(255,255,255,0.05)`,
                    borderRadius: 8,
                    padding: '11px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '8px',
                      color: C.cyan,
                      opacity: 0.65,
                      letterSpacing: '0.14em',
                      textTransform: 'uppercase',
                      marginBottom: 8,
                    }}
                  >
                    Heatmap de dominio · 20 temas
                  </div>
                  <div
                    style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}
                  >
                    {heatmap.map((pct, i) => (
                      <div
                        key={i}
                        title={`Tema ${i + 1}: ${pct}%`}
                        style={{
                          width: 22,
                          height: 22,
                          borderRadius: 4,
                          background:
                            pct > 80
                              ? 'rgba(0,207,255,0.65)'
                              : pct > 60
                              ? 'rgba(0,207,255,0.38)'
                              : pct > 30
                              ? 'rgba(255,168,50,0.5)'
                              : 'rgba(220,60,60,0.45)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '7px',
                          color: 'rgba(255,255,255,0.8)',
                          fontWeight: 600,
                        }}
                      >
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

      {/* ════════════════════════════════════════════════
          PRECIOS
      ════════════════════════════════════════════════ */}
      <section id="precios" style={{ padding: '8rem 5vw', background: C.bg0 }}>
        <div style={{ maxWidth: 1100, margin: '0 auto' }}>
          <Reveal style={{ textAlign: 'center', marginBottom: 64 }}>
            <Pill>Planes</Pill>
            <SectionHeading>
              Sin sorpresas.{' '}
              <em style={{ color: C.cyan, fontStyle: 'italic' }}>
                Precio justo.
              </em>
            </SectionHeading>
            <p
              style={{
                fontSize: '0.88rem',
                color: C.text1,
                marginTop: 14,
              }}
            >
              Cancela cuando quieras. Sin permanencia.
            </p>
          </Reveal>

          <StaggerGrid
            className="examia-grid-3"
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3,1fr)',
              gap: '1.4rem',
              alignItems: 'start',
            }}
          >
            {plans.map((plan) => (
              <motion.div
                key={plan.id}
                variants={vFadeUp}
                whileHover={!plan.featured ? { y: -5 } : {}}
                style={{
                  padding: plan.featured ? '2.5rem 2rem' : '2rem 1.75rem',
                  background: plan.featured
                    ? `linear-gradient(160deg, ${C.bg3} 0%, ${C.bg2} 100%)`
                    : C.bg2,
                  border: `0.5px solid ${
                    plan.featured ? C.cyan : 'rgba(255,255,255,0.055)'
                  }`,
                  borderRadius: 14,
                  position: 'relative',
                  boxShadow: plan.featured
                    ? `0 0 70px rgba(0,207,255,0.09)`
                    : 'none',
                }}
              >
                {plan.featured && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: C.cyan,
                      color: '#000',
                      fontSize: '0.68rem',
                      fontWeight: 800,
                      padding: '3px 16px',
                      borderRadius: 100,
                      letterSpacing: '0.1em',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    MÁS POPULAR
                  </div>
                )}

                <div
                  style={{
                    fontSize: '0.72rem',
                    color: plan.featured ? C.cyan : C.text2,
                    textTransform: 'uppercase',
                    letterSpacing: '0.12em',
                    fontWeight: 600,
                    marginBottom: 10,
                  }}
                >
                  {plan.name}
                </div>

                <div style={{ marginBottom: 4, display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-cormorant, Georgia, serif)',
                      fontSize: plan.featured ? '3rem' : '2.4rem',
                      fontWeight: 400,
                      color: plan.featured ? C.cyan : C.text0,
                      lineHeight: 1,
                    }}
                  >
                    {plan.price}
                  </span>
                  <span
                    style={{ fontSize: '0.82rem', color: C.text2 }}
                  >
                    {plan.period}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: '0.76rem',
                    color: C.text2,
                    marginBottom: 24,
                  }}
                >
                  {plan.sub}
                </p>

                <div
                  style={{
                    borderTop: `0.5px solid rgba(255,255,255,0.06)`,
                    paddingTop: 20,
                    marginBottom: 24,
                  }}
                >
                  {plan.included.map((item) => (
                    <div
                      key={item}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 9,
                        marginBottom: 9,
                      }}
                    >
                      <CheckIcon color={plan.featured ? C.cyan : C.text1} />
                      <span
                        style={{
                          fontSize: '0.82rem',
                          color: plan.featured ? C.text0 : C.text1,
                        }}
                      >
                        {item}
                      </span>
                    </div>
                  ))}
                  {plan.excluded.map((item) => (
                    <div
                      key={item}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 9,
                        marginBottom: 9,
                        opacity: 0.32,
                      }}
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 16 16"
                        fill="none"
                      >
                        <circle
                          cx="8"
                          cy="8"
                          r="7.5"
                          stroke={C.text2}
                        />
                        <path
                          d="M5.5 10.5L10.5 5.5M5.5 5.5L10.5 10.5"
                          stroke={C.text2}
                          strokeWidth="1.2"
                          strokeLinecap="round"
                        />
                      </svg>
                      <span
                        style={{
                          fontSize: '0.82rem',
                          color: C.text2,
                          textDecoration: 'line-through',
                        }}
                      >
                        {item}
                      </span>
                    </div>
                  ))}
                </div>

                <a
                  href={plan.href}
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    textDecoration: 'none',
                    padding: '12px 20px',
                    borderRadius: 8,
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    letterSpacing: '0.02em',
                    background: plan.featured ? C.cyan : 'transparent',
                    color: plan.featured ? '#000' : C.text1,
                    border: plan.featured
                      ? 'none'
                      : `0.5px solid rgba(255,255,255,0.1)`,
                  }}
                >
                  {plan.cta} →
                </a>
              </motion.div>
            ))}
          </StaggerGrid>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          CTA FINAL
      ════════════════════════════════════════════════ */}
      <section
        style={{
          padding: '9rem 5vw',
          background: `linear-gradient(180deg, ${C.bg1} 0%, ${C.bg0} 100%)`,
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(ellipse 55% 50% at 50% 55%, rgba(0,120,255,0.06) 0%, transparent 70%)`,
          }}
          aria-hidden
        />
        <div
          style={{
            position: 'relative',
            zIndex: 1,
            maxWidth: 680,
            margin: '0 auto',
          }}
        >
          <Reveal>
            <Pill>Empieza hoy</Pill>
          </Reveal>
          <Reveal delay={0.1}>
            <h2
              style={{
                fontFamily: 'var(--font-cormorant, Georgia, serif)',
                fontSize: 'clamp(2.6rem, 5.5vw, 4.2rem)',
                fontWeight: 400,
                lineHeight: 1.12,
                letterSpacing: '-0.025em',
                marginBottom: 22,
              }}
            >
              Tu próxima oposición<br />
              empieza{' '}
              <em style={{ color: C.cyan, fontStyle: 'italic' }}>ahora.</em>
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p
              style={{
                fontSize: '1rem',
                color: C.text1,
                lineHeight: 1.78,
                marginBottom: 44,
              }}
            >
              Únete a miles de opositores que ya generan exámenes a medida con
              IA. Sin compromisos, sin tarjeta de crédito.
            </p>
          </Reveal>
          <Reveal delay={0.3}>
            <div
              style={{
                display: 'flex',
                gap: 14,
                justifyContent: 'center',
                flexWrap: 'wrap',
                marginBottom: 22,
              }}
            >
              <a
                href="/auth/signup"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: C.cyan,
                  color: '#000',
                  fontWeight: 700,
                  textDecoration: 'none',
                  padding: '16px 42px',
                  borderRadius: 8,
                  fontSize: '1rem',
                  letterSpacing: '0.01em',
                  boxShadow: `0 0 44px ${C.cyanShadow}`,
                }}
              >
                Empezar gratis ahora →
              </a>
              <a
                href="/login"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'transparent',
                  color: C.text1,
                  fontWeight: 400,
                  textDecoration: 'none',
                  padding: '16px 32px',
                  borderRadius: 8,
                  fontSize: '0.95rem',
                  border: `1px solid rgba(255,255,255,0.1)`,
                }}
              >
                Ya tengo cuenta
              </a>
            </div>
            <p
              style={{
                fontSize: '0.73rem',
                color: C.text2,
                letterSpacing: '0.06em',
              }}
            >
              Gratis para siempre · Sin tarjeta · Cancela cuando quieras
            </p>
          </Reveal>
        </div>
      </section>

      {/* ════════════════════════════════════════════════
          FOOTER
      ════════════════════════════════════════════════ */}
      <footer
        style={{
          background: C.bg0,
          borderTop: `0.5px solid rgba(255,255,255,0.045)`,
          padding: '3.5rem 5vw 2.5rem',
        }}
      >
        <div
          className="examia-footer"
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
            gap: '3rem',
            marginBottom: '2.5rem',
          }}
        >
          {/* Brand */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginBottom: 14,
              }}
            >
              <div
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 6,
                  background: `linear-gradient(135deg, ${C.cyan}, ${C.cyan2})`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 800,
                  color: '#000',
                }}
              >
                E
              </div>
              <span
                style={{
                  fontSize: '1rem',
                  fontWeight: 600,
                  color: C.text0,
                }}
              >
                ExamIA
              </span>
            </div>
            <p
              style={{
                fontSize: '0.82rem',
                color: C.text2,
                lineHeight: 1.72,
                maxWidth: 250,
                marginBottom: 18,
              }}
            >
              Exámenes de oposición generados con IA. Temarios oficiales CARM y
              ayuntamientos de la Región de Murcia.
            </p>
            <p style={{ fontSize: '0.78rem', color: C.text2 }}>
              ¿Preguntas?{' '}
              <a
                href="/chat"
                style={{ color: C.cyan, textDecoration: 'none' }}
              >
                Chatea con nuestra IA →
              </a>
            </p>
          </div>

          {/* Columns */}
          {[
            {
              title: 'Producto',
              links: ['Características', 'Precios', 'Dashboard', 'BOE Radar'],
            },
            {
              title: 'Oposiciones',
              links: ['CARM', 'Ayuntamientos', 'AGE', 'Sanidad'],
            },
            {
              title: 'Legal',
              links: ['Privacidad', 'Términos de uso', 'Cookies', 'Contacto'],
            },
          ].map((col) => (
            <div key={col.title}>
              <h4
                style={{
                  fontSize: '0.72rem',
                  color: C.text0,
                  fontWeight: 600,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  marginBottom: 16,
                }}
              >
                {col.title}
              </h4>
              {col.links.map((link) => (
                <a
                  key={link}
                  href="#"
                  style={{
                    display: 'block',
                    fontSize: '0.82rem',
                    color: C.text2,
                    textDecoration: 'none',
                    marginBottom: 10,
                  }}
                >
                  {link}
                </a>
              ))}
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            maxWidth: 1100,
            margin: '0 auto',
            paddingTop: '1.5rem',
            borderTop: `0.5px solid rgba(255,255,255,0.04)`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <span style={{ fontSize: '0.74rem', color: C.text3 }}>
            © 2026 ExamIA · Todos los derechos reservados
          </span>
          <span style={{ fontSize: '0.74rem', color: C.text3 }}>
            Murcia, España
          </span>
        </div>
      </footer>

      {/* ─── Global styles ─────────────────────────────── */}
      <style>{`
        @keyframes examia-pulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px ${C.cyan}; }
          50%       { opacity: 0.4; box-shadow: 0 0 3px ${C.cyan}; }
        }

        /* Responsive grids */
        @media (max-width: 960px) {
          .examia-grid-3 { grid-template-columns: 1fr 1fr !important; }
          .examia-dash   { grid-template-columns: 1fr !important; gap: 3.5rem !important; }
          .examia-footer { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 600px) {
          .examia-grid-3 { grid-template-columns: 1fr !important; }
          .examia-footer { grid-template-columns: 1fr !important; }
        }

        /* Nav link hover */
        nav a:hover { opacity: 0.8; }

        /* CTA glow hover */
        a[href="/auth/signup"]:hover {
          box-shadow: 0 0 50px ${C.cyanShadow} !important;
        }

        /* Footer link hover */
        footer a:hover { color: ${C.text0} !important; }
      `}</style>
    </div>
  )
}
