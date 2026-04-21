'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'

type Progreso = { tema_id: string; porcentaje_acierto: number; nivel_dominio: string; preguntas_respondidas: number; preguntas_acertadas: number; ultima_sesion: string; temas: { titulo: string; numero: number } }
type Examen   = { id: string; puntuacion: number; tipo: string; created_at: string; correctas: number; total_preguntas: number }

export default function ProgresoPage() {
  const [uid, setUid]         = useState<string | null>(null)
  const [progresos, setProgs] = useState<Progreso[]>([])
  const [examenes, setExams]  = useState<Examen[]>([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro]   = useState<'todos' | 'dominados' | 'en_progreso' | 'debiles'>('todos')

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const uid = data.user.id; setUid(uid)
      const [{ data: progs }, { data: exs }] = await Promise.all([
        supabase.from('progreso_temas').select('*,temas(titulo,numero)').eq('user_id', uid).order('porcentaje_acierto'),
        supabase.from('examenes').select('id,puntuacion,tipo,created_at,correctas,total_preguntas').eq('user_id', uid).eq('estado', 'completado').order('created_at', { ascending: false }).limit(30),
      ])
      setProgs((progs as any) ?? [])
      setExams(exs ?? [])
      setLoading(false)
    })
  }, [])

  const filtrados = progresos.filter(p => {
    if (filtro === 'dominados')    return p.nivel_dominio === 'dominado'
    if (filtro === 'en_progreso')  return p.nivel_dominio === 'en_progreso'
    if (filtro === 'debiles')      return p.porcentaje_acierto < 60 && p.preguntas_respondidas > 0
    return true
  })

  // Gráfico de tendencia de últimos exámenes
  const tendencia = [...examenes].reverse().slice(-14).map((e, i) => ({
    n: i + 1,
    puntuacion: Number(e.puntuacion ?? 0),
    fecha: new Date(e.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }),
  }))

  // Heat map de temas (todos los progresos)
  const heatData = progresos.slice(0, 60).map(p => ({
    titulo: p.temas?.titulo?.slice(0, 20) ?? 'Tema',
    pct: Math.round(p.porcentaje_acierto),
  })).sort((a, b) => b.pct - a.pct)

  const totalRespondidas = progresos.reduce((s, p) => s + p.preguntas_respondidas, 0)
  const totalAcertadas   = progresos.reduce((s, p) => s + p.preguntas_acertadas, 0)
  const pctGlobal        = totalRespondidas > 0 ? Math.round((totalAcertadas / totalRespondidas) * 100) : 0

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-3)' }}>Cargando progreso…</div>

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: '1200px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.4rem' }}>Análisis de rendimiento</div>
        <h1 className="serif" style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--text-0)' }}>Mi progreso</h1>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Temas estudiados',  value: progresos.filter(p => p.preguntas_respondidas > 0).length, color: 'var(--gold-100)' },
          { label: 'Temas dominados',   value: progresos.filter(p => p.nivel_dominio === 'dominado').length, color: '#4db87a' },
          { label: 'Acierto global',    value: `${pctGlobal}%`, color: pctGlobal >= 70 ? '#4db87a' : 'var(--gold-100)' },
          { label: 'Preguntas totales', value: totalRespondidas.toLocaleString('es-ES'), color: 'var(--text-1)' },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem' }}>
            <div className="serif" style={{ fontSize: '1.8rem', fontWeight: 300, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tendencia exámenes */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '1.25rem' }}>Tendencia de puntuación</div>
          {tendencia.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={tendencia}>
                <CartesianGrid stroke="rgba(255,255,255,0.04)" />
                <XAxis dataKey="fecha" tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.3)' }} axisLine={false} tickLine={false} width={20} />
                <Tooltip contentStyle={{ background: '#1a1610', border: '0.5px solid rgba(201,160,67,0.3)', borderRadius: '8px', fontSize: '11px' }} formatter={(v: any) => [`${Number(v).toFixed(1)}/10`, 'Puntuación']} />
                <Line type="monotone" dataKey="puntuacion" stroke="#C9A043" strokeWidth={2} dot={{ fill: '#C9A043', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Completa exámenes para ver tu tendencia.</p>}
        </div>

        {/* Distribución niveles */}
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '1.25rem' }}>Distribución por nivel</div>
          {[
            { label: 'Dominados', count: progresos.filter(p => p.nivel_dominio === 'dominado').length, color: '#4db87a' },
            { label: 'En progreso', count: progresos.filter(p => p.nivel_dominio === 'en_progreso').length, color: 'var(--gold-100)' },
            { label: 'Iniciados', count: progresos.filter(p => p.nivel_dominio === 'iniciado').length, color: '#e07a4d' },
            { label: 'Sin iniciar', count: progresos.filter(p => p.nivel_dominio === 'sin_iniciar').length, color: 'rgba(255,255,255,0.15)' },
          ].map(n => (
            <div key={n.label} style={{ marginBottom: '0.875rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>{n.label}</span>
                <span style={{ fontSize: '12px', color: n.color, fontWeight: 600 }}>{n.count}</span>
              </div>
              <div style={{ height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px' }}>
                <div style={{ height: '100%', width: `${progresos.length > 0 ? (n.count / progresos.length) * 100 : 0}%`, background: n.color, borderRadius: '3px', transition: 'width 0.5s' }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Lista de temas */}
      <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '0.5px solid var(--gold-border)', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {([['todos', 'Todos'], ['dominados', '✅ Dominados'], ['en_progreso', '📈 En progreso'], ['debiles', '⚠️ Reforzar']] as const).map(([k, l]) => (
            <button key={k} onClick={() => setFiltro(k)} style={{ padding: '5px 14px', background: filtro === k ? 'rgba(201,160,67,0.1)' : 'transparent', border: `0.5px solid ${filtro === k ? 'var(--gold-200)' : 'rgba(255,255,255,0.08)'}`, color: filtro === k ? 'var(--gold-100)' : 'var(--text-3)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>
              {l}
            </button>
          ))}
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '0.5px solid var(--gold-border)' }}>
              {['Tema', 'Nivel', 'Acierto', 'Preguntas', 'Última sesión'].map(h => (
                <th key={h} style={{ padding: '0.65rem 1.5rem', textAlign: 'left', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.map(p => (
              <tr key={p.tema_id} style={{ borderBottom: '0.5px solid rgba(62,59,53,0.2)' }}>
                <td style={{ padding: '0.8rem 1.5rem', fontSize: '0.83rem', color: 'var(--text-0)' }}>
                  {p.temas?.numero ? <span style={{ color: 'var(--text-3)', marginRight: '6px' }}>T{p.temas.numero}</span> : null}
                  {p.temas?.titulo ?? 'Tema'}
                </td>
                <td style={{ padding: '0.8rem 1.5rem' }}>
                  <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: p.nivel_dominio === 'dominado' ? 'rgba(77,184,122,0.1)' : p.nivel_dominio === 'en_progreso' ? 'rgba(201,160,67,0.1)' : p.nivel_dominio === 'iniciado' ? 'rgba(224,122,77,0.1)' : 'rgba(255,255,255,0.04)', color: p.nivel_dominio === 'dominado' ? '#4db87a' : p.nivel_dominio === 'en_progreso' ? 'var(--gold-200)' : p.nivel_dominio === 'iniciado' ? '#e07a4d' : 'var(--text-3)' }}>
                    {p.nivel_dominio === 'sin_iniciar' ? 'sin iniciar' : p.nivel_dominio}
                  </span>
                </td>
                <td style={{ padding: '0.8rem 1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '60px', height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px' }}>
                      <div style={{ height: '100%', width: `${p.porcentaje_acierto}%`, background: p.porcentaje_acierto >= 80 ? '#4db87a' : p.porcentaje_acierto >= 60 ? 'var(--gold-100)' : '#e07a4d', borderRadius: '2px' }} />
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-1)' }}>{Math.round(p.porcentaje_acierto)}%</span>
                  </div>
                </td>
                <td style={{ padding: '0.8rem 1.5rem', fontSize: '0.82rem', color: 'var(--text-2)' }}>{p.preguntas_respondidas}</td>
                <td style={{ padding: '0.8rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-3)' }}>
                  {p.ultima_sesion ? new Date(p.ultima_sesion).toLocaleDateString('es-ES') : '—'}
                </td>
              </tr>
            ))}
            {!filtrados.length && (
              <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.85rem' }}>Sin datos en este filtro. Completa algunos exámenes.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
