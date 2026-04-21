'use client'

import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'

type Stats = {
  usuarios_total: number
  usuarios_pro: number
  oposiciones: number
  preguntas: number
  examenes_hoy: number
  ia_coste_mes: number
  boe_pendientes: number
  nuevos_7d: number[]
}

function Kpi({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1.75rem 2rem' }}>
      <div className="serif" style={{ fontSize: '2rem', fontWeight: 300, color: color ?? 'var(--gold-100)' }}>{value}</div>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', marginTop: '4px' }}>{label}</div>
      {sub && <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px' }}>{sub}</div>}
    </div>
  )
}

export default function BackofficeDashboard() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [boeRecientes, setBoeRecientes] = useState<any[]>([])
  const [topOpos, setTopOpos] = useState<any[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/api/backoffice/stats').then(r => r.ok ? r.json() : null),
      fetch('/api/backoffice/boe?limit=5').then(r => r.ok ? r.json() : []),
      fetch('/api/backoffice/oposiciones?top=5').then(r => r.ok ? r.json() : []),
    ]).then(([s, boe, ops]) => {
      setStats(s)
      setBoeRecientes(Array.isArray(boe?.items) ? boe.items : [])
      setTopOpos(Array.isArray(ops) ? ops : [])
      setLoading(false)
    })
  }, [])

  const chartData = stats?.nuevos_7d?.map((v, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    return { dia: d.toLocaleDateString('es-ES', { weekday: 'short' }), usuarios: v }
  }) ?? []

  return (
    <div style={{ padding: '2.5rem 3rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.5rem' }}>
          Resumen general
        </div>
        <h1 className="serif" style={{ fontSize: '2.5rem', fontWeight: 300, color: 'var(--text-0)' }}>Dashboard</h1>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-2)' }}>Cargando datos…</p>
      ) : (
        <>
          {/* KPIs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
            <Kpi label="Usuarios totales"   value={stats?.usuarios_total ?? 0} />
            <Kpi label="Usuarios Pro/Elite" value={stats?.usuarios_pro ?? 0}   color="var(--gold-100)" />
            <Kpi label="Exámenes hoy"       value={stats?.examenes_hoy ?? 0}   color="#4db87a" />
            <Kpi label="Coste IA este mes"  value={`${(stats?.ia_coste_mes ?? 0).toFixed(2)}€`} sub="Claude API" color="#4d9fd4" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '3rem' }}>
            <Kpi label="Oposiciones activas"   value={stats?.oposiciones ?? 0} />
            <Kpi label="Preguntas en banco"    value={(stats?.preguntas ?? 0).toLocaleString('es-ES')} />
            <Kpi label="BOE sin procesar"      value={stats?.boe_pendientes ?? 0} color={stats?.boe_pendientes ? '#e07a4d' : 'var(--gold-100)'} />
            <Kpi label="Nuevos usuarios 7 días" value={stats?.nuevos_7d?.reduce((a, b) => a + b, 0) ?? 0} color="#4db87a" />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>

            {/* Gráfico nuevos usuarios */}
            <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '1.25rem' }}>
                Nuevos usuarios · últimos 7 días
              </div>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="gradU" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C9A043" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#C9A043" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="dia" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} width={24} />
                  <Tooltip contentStyle={{ background: '#1a1610', border: '0.5px solid rgba(201,160,67,0.3)', borderRadius: '8px', fontSize: '12px' }} />
                  <Area type="monotone" dataKey="usuarios" stroke="#C9A043" strokeWidth={1.5} fill="url(#gradU)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Top oposiciones */}
            <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
              <div style={{ padding: '1.25rem 1.5rem', borderBottom: '0.5px solid var(--gold-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-200)' }}>Top oposiciones</span>
                <a href="/backoffice/oposiciones" style={{ fontSize: '10px', color: 'var(--gold-200)', textDecoration: 'none' }}>Ver todas →</a>
              </div>
              <div style={{ padding: '0.5rem 0' }}>
                {topOpos.length === 0 ? (
                  <p style={{ padding: '1rem 1.5rem', color: 'var(--text-3)', fontSize: '0.82rem' }}>Sin datos aún</p>
                ) : topOpos.map((op: any, i: number) => (
                  <div key={op.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0.7rem 1.5rem' }}>
                    <div className="serif" style={{ fontSize: '1.2rem', fontWeight: 300, color: 'var(--text-3)', width: '20px' }}>{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text-0)', fontWeight: 500 }}>{op.nombre_corto ?? op.nombre}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>{op.suscriptores_count ?? 0} suscriptores</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* BOE recientes */}
          <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '0.5px solid var(--gold-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-200)' }}>📡 BOE · Últimas publicaciones</span>
              <a href="/backoffice/boe" style={{ fontSize: '10px', color: 'var(--gold-200)', textDecoration: 'none' }}>Ver radar →</a>
            </div>
            {boeRecientes.length === 0 ? (
              <p style={{ padding: '1.5rem', color: 'var(--text-3)', fontSize: '0.82rem' }}>Sin publicaciones recientes.</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '0.5px solid var(--gold-border)' }}>
                    {['Título', 'Tipo', 'Fuente', 'Fecha', 'Estado'].map(h => (
                      <th key={h} style={{ padding: '0.65rem 1.5rem', textAlign: 'left', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {boeRecientes.map((item: any) => (
                    <tr key={item.id} style={{ borderBottom: '0.5px solid rgba(62,59,53,0.3)' }}>
                      <td style={{ padding: '0.8rem 1.5rem', fontSize: '0.82rem', color: 'var(--text-0)', maxWidth: '340px' }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.titulo}</div>
                      </td>
                      <td style={{ padding: '0.8rem 1.5rem' }}>
                        <span style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(201,160,67,0.1)', color: 'var(--gold-200)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{item.tipo}</span>
                      </td>
                      <td style={{ padding: '0.8rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-2)' }}>{item.boe_fuente?.toUpperCase()}</td>
                      <td style={{ padding: '0.8rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-2)' }}>
                        {item.fecha_publicacion ? new Date(item.fecha_publicacion).toLocaleDateString('es-ES') : '—'}
                      </td>
                      <td style={{ padding: '0.8rem 1.5rem' }}>
                        <span style={{ fontSize: '9px', padding: '2px 8px', borderRadius: '6px', background: item.procesado ? 'rgba(77,184,122,0.1)' : 'rgba(224,122,77,0.1)', color: item.procesado ? '#4db87a' : '#e07a4d' }}>
                          {item.procesado ? 'Procesado' : 'Pendiente'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}
    </div>
  )
}
