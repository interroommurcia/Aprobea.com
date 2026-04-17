'use client'

import { useEffect, useState } from 'react'
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
  stats7d:   { pageviews: number; visitors: number; sessions: number }
  stats30d:  { pageviews: number; visitors: number }
  bounceRate: number
  topPages:   { path: string; views: number; uniq: number }[]
  dailyViews: { day: string; pageviews: number; visitors: number }[]
}

const GOLD = '#C9A043'
const PIE_COLORS = ['#C9A043', '#b87333', '#6dc86d', '#888']

function StatCard({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div style={{
      background: highlight ? 'linear-gradient(135deg,rgba(201,160,67,0.12),rgba(201,160,67,0.04))' : 'var(--bg-2)',
      border: `0.5px solid ${highlight ? 'rgba(201,160,67,0.4)' : 'var(--gold-border)'}`,
      borderRadius: '14px', padding: '1.5rem 1.75rem',
    }}>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginBottom: '0.5rem', letterSpacing: '0.03em' }}>{label}</div>
      <div style={{ fontSize: '1.9rem', fontWeight: 700, color: 'var(--gold-100)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '6px' }}>{sub}</div>}
    </div>
  )
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1a1610', border: '0.5px solid rgba(201,160,67,0.3)', borderRadius: '8px', padding: '10px 16px' }}>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '1rem', color: GOLD, fontWeight: 600 }}>{payload[0].value?.toLocaleString('es-ES')}{payload[0].name === 'capital' ? '€' : ''}</div>
    </div>
  )
}

export default function AnalyticsPage() {
  const [kpi, setKpi] = useState<KPI | null>(null)
  const [serieClientes, setSerieClientes] = useState<SerieItem[]>([])
  const [serieCapital, setSerieCapital] = useState<SerieItem[]>([])
  const [distribTipo, setDistribTipo] = useState<{ name: string; value: number }[]>([])
  const [distribEstado, setDistribEstado] = useState<{ name: string; value: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState('')

  // PostHog
  const [ph, setPh]           = useState<PHStats | null>(null)
  const [phLoading, setPhLoading] = useState(true)
  const [phError, setPhError] = useState('')

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
    const res = await fetch('/api/backoffice/posthog')
    const data = await res.json()
    if (!res.ok) { setPhError(data.error ?? 'Error PostHog'); setPhLoading(false); return }
    setPh(data)
    setPhLoading(false)
  }

  useEffect(() => {
    load()
    loadPH()
    const interval = setInterval(load, 30000) // refresca cada 30s
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
          {/* KPI Row 1 — Financiero */}
          <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.75rem' }}>Capital bajo gestión</div>
          <div className="rsp-grid-4" style={{ marginBottom: '2rem' }}>
            <StatCard label="AUM (activo)" value={`${(kpi.aum / 1000).toFixed(0)}K€`} sub="Capital en participaciones activas" highlight />
            <StatCard label="Capital medio inversor" value={`${kpi.capitalMedio.toLocaleString('es-ES')}€`} />
            <StatCard label="Rentabilidad media" value={`${kpi.rentabilidadMedia}%`} sub="Sobre participaciones activas" />
            <StatCard label="Participaciones activas" value={String(kpi.participacionesActivas)} sub={`de ${kpi.totalParticipaciones} totales`} />
          </div>

          {/* KPI Row 2 — Clientes */}
          <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.75rem' }}>Inversores</div>
          <div className="rsp-grid-4" style={{ marginBottom: '2.5rem' }}>
            <StatCard label="Total inversores" value={String(kpi.totalClientes)} highlight />
            <StatCard label="Activos" value={String(kpi.clientesActivos)} sub={`${kpi.totalClientes ? Math.round(kpi.clientesActivos / kpi.totalClientes * 100) : 0}% del total`} />
            <StatCard label="Leads" value={String(kpi.clientesLeads)} sub="Pendientes de convertir" />
            <StatCard label="Tasa conversión" value={`${kpi.totalClientes ? Math.round(kpi.clientesActivos / kpi.totalClientes * 100) : 0}%`} sub="Lead → Activo" />
          </div>

          {/* KPI Row 3 — Engagement */}
          <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.75rem' }}>Engagement</div>
          <div className="rsp-grid-4" style={{ marginBottom: '2.5rem' }}>
            <StatCard label="Mensajes esta semana" value={String(kpi.mensajesSemana)} highlight />
            <StatCard label="Conversaciones activas" value={String(kpi.conversacionesActivas)} />
            <StatCard label="Msg por inversor activo" value={kpi.clientesActivos ? (kpi.mensajesSemana / kpi.clientesActivos).toFixed(1) : '0'} sub="Esta semana" />
            <StatCard label="Ratio soporte" value={kpi.totalClientes ? `${Math.round(kpi.conversacionesActivas / kpi.totalClientes * 100)}%` : '0%'} sub="Inversores con chat activo" />
          </div>

          {/* Charts Row 1 */}
          <div className="rsp-grid-2" style={{ marginBottom: '2rem' }}>
            {/* Nuevos inversores */}
            <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', padding: '1.75rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-0)', marginBottom: '0.25rem' }}>Nuevos inversores</div>
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

            {/* Capital captado */}
            <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', padding: '1.75rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-0)', marginBottom: '0.25rem' }}>Capital captado</div>
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

          {/* Charts Row 2 — Pies */}
          <div className="rsp-grid-2" style={{ marginBottom: '2rem' }}>
            {/* Distribución por tipo */}
            <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', padding: '1.75rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-0)', marginBottom: '0.25rem' }}>Capital por tipo</div>
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

            {/* Distribución estado inversores */}
            <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', padding: '1.75rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-0)', marginBottom: '0.25rem' }}>Estado inversores</div>
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

          {/* ── SECCIÓN POSTHOG ── */}
          <div style={{ marginTop: '1rem' }}>
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
                {/* KPI row */}
                <div className="rsp-grid-4" style={{ marginBottom: '1.5rem' }}>
                  <StatCard label="Visitantes únicos (7d)" value={ph.stats7d.visitors.toLocaleString('es-ES')} sub={`${ph.stats30d.visitors.toLocaleString('es-ES')} en 30 días`} highlight />
                  <StatCard label="Pageviews (7d)"         value={ph.stats7d.pageviews.toLocaleString('es-ES')} sub={`${ph.stats30d.pageviews.toLocaleString('es-ES')} en 30 días`} />
                  <StatCard label="Sesiones (7d)"          value={ph.stats7d.sessions.toLocaleString('es-ES')} sub={`Páginas/sesión: ${ph.stats7d.sessions > 0 ? (ph.stats7d.pageviews / ph.stats7d.sessions).toFixed(1) : '—'}`} />
                  <StatCard label="Tasa de rebote (7d)"    value={`${ph.bounceRate}%`} sub="Sesiones de 1 sola página" />
                </div>

                {/* Chart + Top páginas */}
                <div className="rsp-grid-2" style={{ marginBottom: '1rem' }}>
                  {/* Gráfico diario */}
                  <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', padding: '1.75rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-0)', marginBottom: '0.25rem' }}>Tráfico diario</div>
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
                          <Area type="monotone" dataKey="pageviews" name="Pageviews" stroke={GOLD} strokeWidth={2} fill="url(#pvGrad)" dot={false} activeDot={{ r: 4, fill: GOLD }} />
                          <Area type="monotone" dataKey="visitors"  name="Visitantes" stroke="#6dc86d" strokeWidth={1.5} fill="url(#visGrad)" dot={false} activeDot={{ r: 3, fill: '#6dc86d' }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </div>

                  {/* Top páginas */}
                  <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', padding: '1.75rem' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-0)', marginBottom: '0.25rem' }}>Páginas más vistas</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginBottom: '1.25rem' }}>Últimos 30 días · pageviews únicos</div>
                    {ph.topPages.length === 0 ? (
                      <div style={{ color: 'var(--text-3)', fontSize: '0.82rem', textAlign: 'center', padding: '2rem 0' }}>Sin datos</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {ph.topPages.map((p, i) => {
                          const maxViews = ph.topPages[0]?.views ?? 1
                          const pct = Math.round((p.views / maxViews) * 100)
                          const label = p.path === '' ? '/' : p.path.length > 38 ? p.path.slice(0, 38) + '…' : p.path
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
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
