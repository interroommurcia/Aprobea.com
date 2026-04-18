'use client'

import { useEffect, useRef, useState } from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell } from 'recharts'

type KPI = {
  aum: number
  totalClientes: number
  clientesActivos: number
  clientesLeads: number
  totalParticipaciones: number
  participacionesActivas: number
  rentabilidadMedia: number
  capitalMedio: number
  mensajesSemana: number
  conversacionesActivas: number
}

type SerieItem = { label: string; valor: number }

type PHStats = {
  stats7d:    { pageviews: number; visitors: number; sessions: number }
  stats30d:   { pageviews: number; visitors: number }
  bounceRate: number
  topPages:   { path: string; views: number; uniq: number }[]
  dailyViews: { day: string; pageviews: number; visitors: number }[]
  sources:    { source: string; visits: number; visitors: number }[]
  devices:    { device: string; visits: number; visitors: number }[]
  entryPages: { path: string; sessions: number }[]
  utmSources: { source: string; medium: string; visits: number; visitors: number }[]
  countries:  { country: string; visits: number; visitors: number }[]
}

const GOLD = '#C9A043'
const PIE_COLORS = ['#C9A043', '#b87333', '#6dc86d', '#888']
const SOURCE_COLORS = ['#C9A043', '#6dc86d', '#7b9fe0', '#e07b7b', '#b87333', '#a45fd0', '#5dc8c8', '#aaa']

/* ─── InfoTip ─── */
function InfoTip({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  return (
    <span
      ref={ref}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', marginLeft: '5px', verticalAlign: 'middle', cursor: 'default' }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: '14px', height: '14px', borderRadius: '50%',
        border: '1px solid rgba(201,160,67,0.5)',
        fontSize: '9px', fontWeight: 700, color: 'rgba(201,160,67,0.7)',
        lineHeight: 1, userSelect: 'none',
      }}>i</span>
      {open && (
        <span style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)',
          background: '#0f0d0a', border: '0.5px solid rgba(201,160,67,0.35)',
          borderRadius: '8px', padding: '8px 12px',
          fontSize: '11px', lineHeight: 1.55, color: 'rgba(255,255,255,0.8)',
          width: '220px', zIndex: 9999,
          boxShadow: '0 8px 24px rgba(0,0,0,0.6)',
          pointerEvents: 'none', whiteSpace: 'normal',
        }}>
          {text}
          <span style={{
            position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)',
            borderWidth: '5px', borderStyle: 'solid',
            borderColor: 'rgba(201,160,67,0.35) transparent transparent transparent',
          }} />
        </span>
      )}
    </span>
  )
}

/* ─── StatCard ─── */
function StatCard({ label, value, sub, highlight, info }: {
  label: string; value: string; sub?: string; highlight?: boolean; info?: string
}) {
  return (
    <div style={{
      background: highlight ? 'linear-gradient(135deg,rgba(201,160,67,0.12),rgba(201,160,67,0.04))' : 'var(--bg-2)',
      border: `0.5px solid ${highlight ? 'rgba(201,160,67,0.4)' : 'var(--gold-border)'}`,
      borderRadius: '14px', padding: '1.5rem 1.75rem',
    }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '0.5rem', letterSpacing: '0.03em', display: 'flex', alignItems: 'center' }}>
        {label}
        {info && <InfoTip text={info} />}
      </div>
      <div style={{ fontSize: '1.9rem', fontWeight: 700, color: 'var(--gold-100)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '6px' }}>{sub}</div>}
    </div>
  )
}

/* ─── ChartTooltip ─── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1a1610', border: '0.5px solid rgba(201,160,67,0.3)', borderRadius: '8px', padding: '10px 16px' }}>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '1rem', color: GOLD, fontWeight: 600 }}>{payload[0].value?.toLocaleString('es-ES')}{payload[0].name === 'capital' ? '€' : ''}</div>
    </div>
  )
}

/* ─── SectionLabel ─── */
function SectionLabel({ children }: { children: string }) {
  return <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.75rem' }}>{children}</div>
}

export default function AnalyticsPage() {
  const [kpi, setKpi] = useState<KPI | null>(null)
  const [serieClientes, setSerieClientes] = useState<SerieItem[]>([])
  const [serieCapital, setSerieCapital]   = useState<SerieItem[]>([])
  const [distribTipo, setDistribTipo]     = useState<{ name: string; value: number }[]>([])
  const [distribEstado, setDistribEstado] = useState<{ name: string; value: number }[]>([])
  const [loading, setLoading]             = useState(true)
  const [lastUpdate, setLastUpdate]       = useState('')

  // PostHog
  const [ph, setPh]             = useState<PHStats | null>(null)
  const [phLoading, setPhLoading] = useState(true)
  const [phError, setPhError]   = useState('')

  async function load() {
    setLoading(true)
    const res = await fetch('/api/backoffice/analytics')
    if (!res.ok) { setLoading(false); return }
    const data = await res.json()
    setKpi(data.kpi)
    setSerieClientes(data.serieClientes)
    setSerieCapital(data.serieCapital)
    setDistribTipo(data.distribTipo)
    setDistribEstado(data.distribEstado)
    setLastUpdate(new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }))
    setLoading(false)
  }

  async function loadPH() {
    setPhLoading(true); setPhError('')
    const res  = await fetch('/api/backoffice/posthog')
    const data = await res.json()
    if (!res.ok) { setPhError(data.error ?? 'Error PostHog'); setPhLoading(false); return }
    setPh(data)
    setPhLoading(false)
  }

  useEffect(() => {
    load()
    loadPH()
    const interval = setInterval(load, 30000)
    return () => clearInterval(interval)
  }, [])

  return (
    <div style={{ padding: '2.5rem 3rem', maxWidth: '1200px' }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.5rem' }}>Backoffice</div>
          <h1 className="serif" style={{ fontSize: '2.2rem', fontWeight: 300, color: 'var(--text-0)' }}>Analytics</h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-3)', marginTop: '4px' }}>Métricas de negocio en tiempo real · Auto-refresco 30s</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {lastUpdate && <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Actualizado {lastUpdate}</span>}
          <button
            onClick={load}
            style={{ background: 'rgba(201,160,67,0.08)', border: '0.5px solid rgba(201,160,67,0.3)', color: 'var(--gold-200)', padding: '8px 18px', borderRadius: '8px', fontSize: '11px', cursor: 'pointer', letterSpacing: '0.08em' }}
          >
            ↺ Refrescar
          </button>
        </div>
      </div>

      {loading && !kpi ? (
        <div style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Cargando métricas…</div>
      ) : kpi && (
        <>
          {/* ── KPI Row 1 — Financiero ── */}
          <SectionLabel>Capital bajo gestión</SectionLabel>
          <div className="rsp-grid-4" style={{ marginBottom: '2rem' }}>
            <StatCard
              label="AUM (activo)" value={`${(kpi.aum / 1000).toFixed(0)}K€`}
              sub="Capital en participaciones activas" highlight
              info="Assets Under Management: suma total del capital comprometido en participaciones con estado activo." />
            <StatCard
              label="Capital medio inversor" value={`${kpi.capitalMedio.toLocaleString('es-ES')}€`}
              info="Capital medio por inversor activo. Se calcula dividiendo el AUM entre el número de inversores con participaciones activas." />
            <StatCard
              label="Rentabilidad media" value={`${kpi.rentabilidadMedia}%`}
              sub="Sobre participaciones activas"
              info="Promedio del porcentaje de rentabilidad (TIR o rentabilidad estimada) declarada en cada operación activa." />
            <StatCard
              label="Participaciones activas" value={String(kpi.participacionesActivas)}
              sub={`de ${kpi.totalParticipaciones} totales`}
              info="Número de participaciones con estado 'activo'. El total incluye también participaciones cerradas, vendidas o pendientes." />
          </div>

          {/* ── KPI Row 2 — Clientes ── */}
          <SectionLabel>Inversores</SectionLabel>
          <div className="rsp-grid-4" style={{ marginBottom: '2.5rem' }}>
            <StatCard
              label="Total inversores" value={String(kpi.totalClientes)} highlight
              info="Número total de perfiles registrados en la base de datos de clientes, independientemente de su estado." />
            <StatCard
              label="Activos" value={String(kpi.clientesActivos)}
              sub={`${kpi.totalClientes ? Math.round(kpi.clientesActivos / kpi.totalClientes * 100) : 0}% del total`}
              info="Inversores con al menos una participación en estado activo. Son los clientes que generan ingresos recurrentes." />
            <StatCard
              label="Leads" value={String(kpi.clientesLeads)}
              sub="Pendientes de convertir"
              info="Clientes registrados que aún no tienen ninguna participación activa. Representan el pipeline de conversión." />
            <StatCard
              label="Tasa conversión" value={`${kpi.totalClientes ? Math.round(kpi.clientesActivos / kpi.totalClientes * 100) : 0}%`}
              sub="Lead → Activo"
              info="Porcentaje de inversores totales que han convertido a estado activo. Mayor porcentaje indica mejor eficacia comercial." />
          </div>

          {/* ── KPI Row 3 — Engagement ── */}
          <SectionLabel>Engagement</SectionLabel>
          <div className="rsp-grid-4" style={{ marginBottom: '2.5rem' }}>
            <StatCard
              label="Mensajes esta semana" value={String(kpi.mensajesSemana)} highlight
              info="Mensajes enviados o recibidos en el chat de inversores durante los últimos 7 días. Indica actividad de soporte y relación con el cliente." />
            <StatCard
              label="Conversaciones activas" value={String(kpi.conversacionesActivas)}
              info="Hilos de chat que tienen al menos un mensaje en los últimos 30 días. Conversaciones 'vivas' en este momento." />
            <StatCard
              label="Msg por inversor activo" value={kpi.clientesActivos ? (kpi.mensajesSemana / kpi.clientesActivos).toFixed(1) : '0'}
              sub="Esta semana"
              info="Ratio de mensajes semanales dividido entre el número de inversores activos. Un valor alto puede indicar necesidad de más soporte o mayor engagement." />
            <StatCard
              label="Ratio soporte" value={kpi.totalClientes ? `${Math.round(kpi.conversacionesActivas / kpi.totalClientes * 100)}%` : '0%'}
              sub="Inversores con chat activo"
              info="Porcentaje del total de inversores que tienen una conversación activa. Refleja qué proporción de la cartera está en contacto activo." />
          </div>

          {/* ── Charts Row 1 ── */}
          <div className="rsp-grid-2" style={{ marginBottom: '2rem' }}>
            <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-0)' }}>Nuevos inversores</div>
                <InfoTip text="Número de nuevos perfiles de cliente creados en la base de datos cada mes. Refleja el ritmo de captación comercial." />
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '1.5rem' }}>Registros por mes · últimos 6 meses</div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={serieClientes} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="valor" name="inversores" fill={GOLD} radius={[4, 4, 0, 0]} opacity={0.85} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-0)' }}>Capital captado</div>
                <InfoTip text="Suma del capital comprometido en participaciones nuevas creadas cada mes. Indica el volumen de inversión que entra al fondo mensualmente." />
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '1.5rem' }}>Euros invertidos por mes · últimos 6 meses</div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={serieCapital} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="capGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={GOLD} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                  <XAxis dataKey="label" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v > 999 ? `${(v / 1000).toFixed(0)}K` : String(v)} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="valor" name="capital" stroke={GOLD} strokeWidth={2.5} fill="url(#capGrad)" dot={false} activeDot={{ r: 5, fill: GOLD, stroke: '#1a1610', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Charts Row 2 — Pies ── */}
          <div className="rsp-grid-2" style={{ marginBottom: '2rem' }}>
            <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-0)' }}>Capital por tipo</div>
                <InfoTip text="Distribución del capital activo según la tipología de la operación (NPL, Crowdfunding, etc.). Muestra la concentración del portfolio por producto." />
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '1rem' }}>Distribución NPL vs Crowdfunding</div>
              {distribTipo.length === 0 ? (
                <div style={{ color: 'var(--text-3)', fontSize: '0.82rem', padding: '2rem 0', textAlign: 'center' }}>Sin datos</div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                  <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                      <Pie data={distribTipo} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3}>
                        {distribTipo.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {distribTipo.map((d, i) => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>{d.name}</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--gold-100)', fontWeight: 600 }}>{d.value.toLocaleString('es-ES')}€</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', padding: '1.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-0)' }}>Estado inversores</div>
                <InfoTip text="Segmentación de todos los inversores según su estado actual: Activos (tienen participación activa), Leads (sin participación aún), Inactivos (sin actividad reciente)." />
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '1rem' }}>Activos · Leads · Inactivos</div>
              {distribEstado.length === 0 ? (
                <div style={{ color: 'var(--text-3)', fontSize: '0.82rem', padding: '2rem 0', textAlign: 'center' }}>Sin datos</div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                  <ResponsiveContainer width={140} height={140}>
                    <PieChart>
                      <Pie data={distribEstado} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3}>
                        {distribEstado.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {distribEstado.map((d, i) => (
                      <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-2)' }}>{d.name}</span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--gold-100)', fontWeight: 600 }}>{d.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════
               SECCIÓN POSTHOG
          ══════════════════════════════════════════════ */}
          <div style={{ marginTop: '2.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '3px' }}>Tráfico web · PostHog</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Datos en tiempo real del sitio público y del dashboard</div>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <button onClick={loadPH} style={{ background: 'rgba(201,160,67,0.08)', border: '0.5px solid rgba(201,160,67,0.3)', color: 'var(--gold-200)', padding: '6px 14px', borderRadius: '7px', fontSize: '10px', cursor: 'pointer', letterSpacing: '0.06em' }}>
                  ↺ Actualizar
                </button>
                <a href="https://eu.posthog.com" target="_blank" rel="noopener noreferrer"
                  style={{ background: 'var(--gold-200)', color: 'var(--bg-0)', padding: '6px 14px', borderRadius: '7px', fontSize: '10px', fontWeight: 700, textDecoration: 'none', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                  Ver en PostHog ↗
                </a>
              </div>
            </div>

            {phError ? (
              <div style={{ background: 'rgba(220,50,50,0.08)', border: '0.5px solid rgba(220,50,50,0.3)', borderRadius: '12px', padding: '1.25rem 1.5rem', fontSize: '0.82rem', color: '#e05656' }}>
                ⚠ {phError}
                {phError.includes('no configurado') && (
                  <div style={{ marginTop: '8px', fontSize: '0.75rem', color: 'var(--text-3)', lineHeight: 1.6 }}>
                    Añade <code style={{ background: 'var(--bg-3)', padding: '1px 6px', borderRadius: '4px' }}>POSTHOG_PERSONAL_API_KEY</code> y <code style={{ background: 'var(--bg-3)', padding: '1px 6px', borderRadius: '4px' }}>POSTHOG_PROJECT_ID</code> a las variables de entorno.
                  </div>
                )}
              </div>
            ) : phLoading ? (
              <div style={{ color: 'var(--text-3)', fontSize: '0.82rem', padding: '1.5rem 0' }}>Cargando datos de PostHog…</div>
            ) : ph && (
              <>
                {/* ── KPI row PostHog ── */}
                <div className="rsp-grid-4" style={{ marginBottom: '1.5rem' }}>
                  <StatCard
                    label="Visitantes únicos (7d)" value={ph.stats7d.visitors.toLocaleString('es-ES')}
                    sub={`${ph.stats30d.visitors.toLocaleString('es-ES')} en 30 días`} highlight
                    info="Número de usuarios distintos que visitaron el sitio en los últimos 7 días, identificados por su ID único de PostHog (cookie/localStorage)." />
                  <StatCard
                    label="Pageviews (7d)" value={ph.stats7d.pageviews.toLocaleString('es-ES')}
                    sub={`${ph.stats30d.pageviews.toLocaleString('es-ES')} en 30 días`}
                    info="Total de páginas cargadas en los últimos 7 días. Un mismo visitante puede generar varios pageviews si navega por distintas páginas." />
                  <StatCard
                    label="Sesiones (7d)" value={ph.stats7d.sessions.toLocaleString('es-ES')}
                    sub={`Páginas/sesión: ${ph.stats7d.sessions > 0 ? (ph.stats7d.pageviews / ph.stats7d.sessions).toFixed(1) : '—'}`}
                    info="Número de sesiones únicas ($session_id) en 7 días. El ratio páginas/sesión indica el promedio de páginas que un usuario visita por visita." />
                  <StatCard
                    label="Tasa de rebote (7d)" value={`${ph.bounceRate}%`}
                    sub="Sesiones de 1 sola página"
                    info="Porcentaje de sesiones en que el usuario vio solo una página y se fue. Una tasa alta puede indicar que el landing no engancha o que el tráfico es poco cualificado." />
                </div>

                {/* ── Tráfico diario + Top páginas ── */}
                <div className="rsp-grid-2" style={{ marginBottom: '1.5rem' }}>
                  <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', padding: '1.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-0)' }}>Tráfico diario</div>
                      <InfoTip text="Evolución día a día de las páginas visitadas (dorado) y visitantes únicos (verde). Permite detectar picos de tráfico y su relación con campañas o publicaciones." />
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '1.5rem' }}>Pageviews y visitantes · últimos 30 días</div>
                    {ph.dailyViews.length === 0 ? (
                      <div style={{ color: 'var(--text-3)', fontSize: '0.82rem', textAlign: 'center', padding: '2rem 0' }}>Sin datos</div>
                    ) : (
                      <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={ph.dailyViews} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                          <defs>
                            <linearGradient id="pvGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor={GOLD} stopOpacity={0.3} />
                              <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="visGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%"  stopColor="#6dc86d" stopOpacity={0.2} />
                              <stop offset="95%" stopColor="#6dc86d" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                          <XAxis dataKey="day" tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} tickLine={false}
                            tickFormatter={v => v.slice(5)} interval="preserveStartEnd" />
                          <YAxis tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                          <Tooltip
                            contentStyle={{ background: '#1a1610', border: '0.5px solid rgba(201,160,67,0.3)', borderRadius: '8px', fontSize: '11px' }}
                            labelStyle={{ color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}
                            itemStyle={{ color: GOLD }}
                          />
                          <Area type="monotone" dataKey="pageviews" name="Pageviews"  stroke={GOLD}      strokeWidth={2}   fill="url(#pvGrad)"  dot={false} activeDot={{ r: 4, fill: GOLD }} />
                          <Area type="monotone" dataKey="visitors"  name="Visitantes" stroke="#6dc86d"   strokeWidth={1.5} fill="url(#visGrad)" dot={false} activeDot={{ r: 3, fill: '#6dc86d' }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', padding: '1.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-0)' }}>Páginas más vistas</div>
                      <InfoTip text="Ranking de URLs por número total de pageviews en 30 días. Indica qué contenido genera más tráfico, útil para priorizar SEO y mejoras de UX." />
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '1.25rem' }}>Últimos 30 días · pageviews únicos</div>
                    {ph.topPages.length === 0 ? (
                      <div style={{ color: 'var(--text-3)', fontSize: '0.82rem', textAlign: 'center', padding: '2rem 0' }}>Sin datos</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {ph.topPages.map((p, i) => {
                          const maxViews = ph.topPages[0]?.views ?? 1
                          const pct      = Math.round((p.views / maxViews) * 100)
                          const label    = p.path === '' ? '/' : p.path.length > 38 ? p.path.slice(0, 38) + '…' : p.path
                          return (
                            <div key={i}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                <span style={{ fontSize: '11px', color: 'var(--text-2)', fontFamily: 'monospace' }}>{label}</span>
                                <span style={{ fontSize: '11px', color: GOLD, fontWeight: 600 }}>{p.views.toLocaleString('es-ES')}</span>
                              </div>
                              <div style={{ height: '3px', background: 'var(--bg-3)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: `linear-gradient(90deg,${GOLD},#a07828)`, borderRadius: '2px' }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Fuentes de tráfico + Dispositivos ── */}
                <div className="rsp-grid-2" style={{ marginBottom: '1.5rem' }}>

                  {/* Fuentes de tráfico */}
                  <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', padding: '1.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-0)' }}>Fuentes de tráfico</div>
                      <InfoTip text="De dónde vienen tus visitantes: el dominio que los refirió (Google, ChatGPT, Skyller, redes sociales…). '(directo)' significa que llegaron escribiendo la URL o desde favoritos, sin referrer." />
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '1.25rem' }}>Últimos 30 días · por referrer domain</div>
                    {!ph.sources || ph.sources.length === 0 ? (
                      <div style={{ color: 'var(--text-3)', fontSize: '0.82rem', textAlign: 'center', padding: '2rem 0' }}>Sin datos de fuentes</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                        {ph.sources.map((s, i) => {
                          const maxVisits = ph.sources[0]?.visits ?? 1
                          const pct       = Math.round((s.visits / maxVisits) * 100)
                          const color     = SOURCE_COLORS[i % SOURCE_COLORS.length]
                          const label     = s.source.length > 34 ? s.source.slice(0, 34) + '…' : s.source
                          return (
                            <div key={i}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                                  <span style={{ fontSize: '11px', color: 'var(--text-2)', fontFamily: 'monospace' }}>{label}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>{s.visitors.toLocaleString('es-ES')} vis.</span>
                                  <span style={{ fontSize: '11px', color, fontWeight: 600, minWidth: '32px', textAlign: 'right' }}>{s.visits.toLocaleString('es-ES')}</span>
                                </div>
                              </div>
                              <div style={{ height: '3px', background: 'var(--bg-3)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '2px', opacity: 0.8 }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Dispositivos */}
                  <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', padding: '1.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-0)' }}>Dispositivos</div>
                      <InfoTip text="Tipo de dispositivo usado para visitar el sitio: Mobile, Desktop, Tablet o Unknown. Ayuda a priorizar la experiencia de usuario en el dispositivo más usado." />
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '1.25rem' }}>Últimos 30 días · distribución de visitas</div>
                    {!ph.devices || ph.devices.length === 0 ? (
                      <div style={{ color: 'var(--text-3)', fontSize: '0.82rem', textAlign: 'center', padding: '2rem 0' }}>Sin datos de dispositivos</div>
                    ) : (() => {
                      const totalDev = ph.devices.reduce((a, d) => a + d.visits, 0)
                      const devColors: Record<string, string> = { Mobile: '#6dc86d', Desktop: GOLD, Tablet: '#7b9fe0', Unknown: '#888' }
                      return (
                        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                          <ResponsiveContainer width={130} height={130}>
                            <PieChart>
                              <Pie data={ph.devices.map(d => ({ name: d.device, value: d.visits }))} dataKey="value" cx="50%" cy="50%" innerRadius={38} outerRadius={62} paddingAngle={3}>
                                {ph.devices.map((d, i) => <Cell key={i} fill={devColors[d.device] ?? SOURCE_COLORS[i % SOURCE_COLORS.length]} />)}
                              </Pie>
                            </PieChart>
                          </ResponsiveContainer>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                            {ph.devices.map((d, i) => {
                              const pct   = totalDev > 0 ? Math.round((d.visits / totalDev) * 100) : 0
                              const color = devColors[d.device] ?? SOURCE_COLORS[i % SOURCE_COLORS.length]
                              return (
                                <div key={i}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                      <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: color, flexShrink: 0 }} />
                                      <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>{d.device}</span>
                                    </div>
                                    <span style={{ fontSize: '12px', color, fontWeight: 600 }}>{pct}%</span>
                                  </div>
                                  <div style={{ height: '3px', background: 'var(--bg-3)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '2px', opacity: 0.8 }} />
                                  </div>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                </div>

                {/* ── UTM Sources + Países ── */}
                <div className="rsp-grid-2" style={{ marginBottom: '1.5rem' }}>

                  {/* UTM Sources */}
                  <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', padding: '1.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-0)' }}>Campañas UTM</div>
                      <InfoTip text="Tráfico que llega con parámetros utm_source (p.ej. ?utm_source=skyller&utm_medium=email). Permite saber exactamente qué campañas, partners o plataformas como Skyller generan visitas. Sin UTM = tráfico sin etiquetar." />
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '1.25rem' }}>Últimos 30 días · utm_source + utm_medium</div>
                    {!ph.utmSources || ph.utmSources.length === 0 ? (
                      <div style={{ color: 'var(--text-3)', fontSize: '0.82rem', textAlign: 'center', padding: '2rem 0' }}>
                        Sin datos UTM — añade <code style={{ background: 'var(--bg-3)', padding: '1px 5px', borderRadius: '3px' }}>?utm_source=skyller</code> a los enlaces de Skyller
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                        {ph.utmSources.map((s, i) => {
                          const maxVisits = ph.utmSources[0]?.visits ?? 1
                          const pct       = Math.round((s.visits / maxVisits) * 100)
                          const color     = SOURCE_COLORS[i % SOURCE_COLORS.length]
                          const label     = s.source === '(sin UTM)' ? s.source : s.medium ? `${s.source} / ${s.medium}` : s.source
                          return (
                            <div key={i}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                                  <span style={{ fontSize: '11px', color: s.source === '(sin UTM)' ? 'var(--text-3)' : 'var(--text-2)', fontFamily: 'monospace' }}>{label}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>{s.visitors.toLocaleString('es-ES')} vis.</span>
                                  <span style={{ fontSize: '11px', color, fontWeight: 600, minWidth: '32px', textAlign: 'right' }}>{s.visits.toLocaleString('es-ES')}</span>
                                </div>
                              </div>
                              <div style={{ height: '3px', background: 'var(--bg-3)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '2px', opacity: s.source === '(sin UTM)' ? 0.35 : 0.8 }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Países */}
                  <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', padding: '1.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-0)' }}>Países</div>
                      <InfoTip text="País de origen de los visitantes detectado por su IP (GeoIP). Útil para saber si el tráfico es local o internacional y adaptar la estrategia de captación." />
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '1.25rem' }}>Últimos 30 días · top 10 países</div>
                    {!ph.countries || ph.countries.length === 0 ? (
                      <div style={{ color: 'var(--text-3)', fontSize: '0.82rem', textAlign: 'center', padding: '2rem 0' }}>Sin datos de países</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
                        {ph.countries.map((c, i) => {
                          const maxVisits = ph.countries[0]?.visits ?? 1
                          const pct       = Math.round((c.visits / maxVisits) * 100)
                          const color     = SOURCE_COLORS[i % SOURCE_COLORS.length]
                          return (
                            <div key={i}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                                  <span style={{ fontSize: '11px', color: 'var(--text-2)' }}>{c.country}</span>
                                </div>
                                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                                  <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>{c.visitors.toLocaleString('es-ES')} vis.</span>
                                  <span style={{ fontSize: '11px', color, fontWeight: 600, minWidth: '32px', textAlign: 'right' }}>{c.visits.toLocaleString('es-ES')}</span>
                                </div>
                              </div>
                              <div style={{ height: '3px', background: 'var(--bg-3)', borderRadius: '2px', overflow: 'hidden' }}>
                                <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '2px', opacity: 0.8 }} />
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Páginas de entrada ── */}
                <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', padding: '1.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-0)' }}>Páginas de entrada</div>
                    <InfoTip text="La primera URL que ve un visitante al llegar al sitio. Indica qué contenido atrae el tráfico inicial. Una página de entrada con muchas sesiones puede ser un buen candidato para optimización SEO." />
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '1.25rem' }}>Últimos 30 días · primera página de cada sesión · top 8</div>
                  {!ph.entryPages || ph.entryPages.length === 0 ? (
                    <div style={{ color: 'var(--text-3)', fontSize: '0.82rem', textAlign: 'center', padding: '2rem 0' }}>Sin datos</div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px' }}>
                      {ph.entryPages.map((e, i) => {
                        const maxSess = ph.entryPages[0]?.sessions ?? 1
                        const pct     = Math.round((e.sessions / maxSess) * 100)
                        const label   = e.path === '' ? '/' : e.path.length > 42 ? e.path.slice(0, 42) + '…' : e.path
                        const color   = SOURCE_COLORS[i % SOURCE_COLORS.length]
                        return (
                          <div key={i} style={{ background: 'var(--bg-3)', borderRadius: '9px', padding: '12px 14px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                              <span style={{ fontSize: '11px', color: 'var(--text-2)', fontFamily: 'monospace' }}>{label}</span>
                              <span style={{ fontSize: '11px', color, fontWeight: 700, marginLeft: '10px', whiteSpace: 'nowrap' }}>{e.sessions.toLocaleString('es-ES')} ses.</span>
                            </div>
                            <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                              <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: '2px', opacity: 0.75 }} />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
