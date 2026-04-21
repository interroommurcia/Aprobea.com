'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts'

type Perfil  = { nombre: string; plan: string; xp_total: number; racha_dias: number; ultima_actividad: string }
type Resumen = {
  examenes_total: number; correctas_total: number; total_preguntas: number
  temas_dominados: number; temas_en_progreso: number; temas_sin_iniciar: number
  examen_reciente: { puntuacion: number; tipo: string; created_at: string; oposicion?: string } | null
  temas_debiles: { titulo: string; porcentaje_acierto: number; tema_id: string }[]
  temas_fuertes: { titulo: string; porcentaje_acierto: number; tema_id: string }[]
  proximas_revisiones: { titulo: string; fecha: string }[]
  oposicion_activa: { id: string; nombre: string; nombre_corto: string } | null
}

function XpBar({ xp }: { xp: number }) {
  const nivel  = Math.floor(xp / 500) + 1
  const progreso = ((xp % 500) / 500) * 100
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
        <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>Nivel {nivel}</span>
        <span style={{ fontSize: '10px', color: 'var(--gold-200)' }}>{xp} XP</span>
      </div>
      <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
        <div style={{ height: '100%', width: `${progreso}%`, background: 'linear-gradient(90deg,var(--gold-300),var(--gold-100))', borderRadius: '2px', transition: 'width 0.5s ease' }} />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [perfil, setPerfil]   = useState<Perfil | null>(null)
  const [resumen, setResumen] = useState<Resumen | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const uid = data.user.id

      const [{ data: p }, { data: res }] = await Promise.all([
        supabase.from('perfiles').select('nombre,plan,xp_total,racha_dias,ultima_actividad').eq('id', uid).single(),
        fetch(`/api/dashboard/resumen?user_id=${uid}`).then(r => r.ok ? r.json() : null),
      ])
      setPerfil(p)
      setResumen(res)
      setLoading(false)
    })
  }, [])

  if (loading) return (
    <div style={{ padding: '3rem', color: 'var(--text-2)', fontSize: '0.85rem' }}>Cargando tu dashboard…</div>
  )

  const pctAcierto = resumen && resumen.total_preguntas > 0
    ? Math.round((resumen.correctas_total / resumen.total_preguntas) * 100)
    : 0

  const radarData = [
    { tema: 'Dominados', valor: resumen?.temas_dominados ?? 0 },
    { tema: 'Progreso', valor: resumen?.temas_en_progreso ?? 0 },
    { tema: 'Exámenes', valor: resumen?.examenes_total ?? 0 },
    { tema: 'Acierto %', valor: pctAcierto },
    { tema: 'Racha días', valor: perfil?.racha_dias ?? 0 },
  ]

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: '1200px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.4rem' }}>
            Bienvenido de nuevo
          </div>
          <h1 className="serif" style={{ fontSize: '2.2rem', fontWeight: 300, color: 'var(--text-0)', lineHeight: 1 }}>
            {perfil?.nombre ?? 'Opositor'}
          </h1>
          {perfil && <XpBar xp={perfil.xp_total ?? 0} />}
        </div>
        {perfil?.racha_dias ? (
          <div style={{ textAlign: 'center', background: 'rgba(224,122,77,0.08)', border: '0.5px solid rgba(224,122,77,0.3)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.5rem' }}>
            <div style={{ fontSize: '2rem' }}>🔥</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#e07a4d' }}>{perfil.racha_dias}</div>
            <div style={{ fontSize: '10px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>días de racha</div>
          </div>
        ) : null}
      </div>

      {/* KPIs rápidos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Exámenes realizados', value: resumen?.examenes_total ?? 0, icon: '📝', color: 'var(--gold-100)' },
          { label: 'Tasa de acierto', value: `${pctAcierto}%`, icon: '🎯', color: pctAcierto >= 70 ? '#4db87a' : '#e07a4d' },
          { label: 'Temas dominados', value: resumen?.temas_dominados ?? 0, icon: '🏆', color: '#4db87a' },
          { label: 'XP total', value: (perfil?.xp_total ?? 0).toLocaleString('es-ES'), icon: '⭐', color: 'var(--gold-200)' },
        ].map(k => (
          <div key={k.label} style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem' }}>
            <div style={{ fontSize: '1.4rem', marginBottom: '6px' }}>{k.icon}</div>
            <div className="serif" style={{ fontSize: '1.8rem', fontWeight: 300, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

        {/* Acciones rápidas */}
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '1.25rem' }}>
            Continuar estudiando
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { href: '/dashboard/examenes?tipo=adaptativo', icon: '🧠', label: 'Examen adaptativo', desc: 'Ajustado a tu nivel actual', color: 'var(--gold-100)' },
              { href: '/dashboard/examenes?tipo=repaso_fallos', icon: '🔄', label: 'Repasar mis fallos', desc: `${resumen?.temas_debiles?.length ?? 0} temas para reforzar`, color: '#e07a4d' },
              { href: '/dashboard/flashcards', icon: '🃏', label: 'Flashcards del día', desc: `${resumen?.proximas_revisiones?.length ?? 0} tarjetas pendientes`, color: '#4d9fd4' },
              { href: '/dashboard/examenes?tipo=simulacro', icon: '📋', label: 'Simulacro real', desc: 'Condiciones de examen oficial', color: '#4db87a' },
            ].map(a => (
              <Link key={a.href} href={a.href} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0.875rem', background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.06)', borderRadius: 'var(--radius)', textDecoration: 'none', transition: 'background 0.2s' }}>
                <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>{a.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: a.color }}>{a.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{a.desc}</div>
                </div>
                <span style={{ color: 'var(--text-3)', fontSize: '14px' }}>›</span>
              </Link>
            ))}
          </div>
        </div>

        {/* Radar de rendimiento */}
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
          <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '1rem' }}>
            Radar de rendimiento
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.06)" />
              <PolarAngleAxis dataKey="tema" tick={{ fontSize: 10, fill: 'rgba(255,255,255,0.4)' }} />
              <Tooltip contentStyle={{ background: '#1a1610', border: '0.5px solid rgba(201,160,67,0.3)', borderRadius: '8px', fontSize: '12px' }} />
              <Radar dataKey="valor" stroke="#C9A043" fill="#C9A043" fillOpacity={0.15} strokeWidth={1.5} />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>

        {/* Temas débiles */}
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '0.5px solid var(--gold-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#e07a4d' }}>⚠️ Temas a reforzar</span>
            <Link href="/dashboard/progreso" style={{ fontSize: '10px', color: 'var(--gold-200)', textDecoration: 'none' }}>Ver progreso →</Link>
          </div>
          <div style={{ padding: '0.5rem 0' }}>
            {!resumen?.temas_debiles?.length ? (
              <p style={{ padding: '1rem 1.5rem', color: 'var(--text-3)', fontSize: '0.82rem' }}>¡Ningún tema débil detectado aún!</p>
            ) : resumen.temas_debiles.slice(0, 5).map((t, i) => (
              <div key={t.tema_id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0.75rem 1.5rem' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(224,122,77,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#e07a4d', fontWeight: 700, flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.titulo}</div>
                  <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', marginTop: '5px' }}>
                    <div style={{ height: '100%', width: `${t.porcentaje_acierto}%`, background: '#e07a4d', borderRadius: '2px' }} />
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#e07a4d', fontWeight: 600, flexShrink: 0 }}>{Math.round(t.porcentaje_acierto)}%</div>
              </div>
            ))}
          </div>
        </div>

        {/* Temas dominados */}
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <div style={{ padding: '1.25rem 1.5rem', borderBottom: '0.5px solid var(--gold-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#4db87a' }}>✅ Temas dominados</span>
            <Link href="/dashboard/progreso" style={{ fontSize: '10px', color: 'var(--gold-200)', textDecoration: 'none' }}>Ver todos →</Link>
          </div>
          <div style={{ padding: '0.5rem 0' }}>
            {!resumen?.temas_fuertes?.length ? (
              <p style={{ padding: '1rem 1.5rem', color: 'var(--text-3)', fontSize: '0.82rem' }}>Completa algunos exámenes para ver tus puntos fuertes.</p>
            ) : resumen.temas_fuertes.slice(0, 5).map((t, i) => (
              <div key={t.tema_id} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '0.75rem 1.5rem' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(77,184,122,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: '#4db87a', fontWeight: 700, flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.titulo}</div>
                  <div style={{ height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', marginTop: '5px' }}>
                    <div style={{ height: '100%', width: `${t.porcentaje_acierto}%`, background: '#4db87a', borderRadius: '2px' }} />
                  </div>
                </div>
                <div style={{ fontSize: '11px', color: '#4db87a', fontWeight: 600, flexShrink: 0 }}>{Math.round(t.porcentaje_acierto)}%</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* BOE / Noticias recientes */}
      {resumen?.oposicion_activa && (
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-200)' }}>
              📡 BOE · {resumen.oposicion_activa.nombre_corto ?? resumen.oposicion_activa.nombre}
            </div>
            <Link href="/dashboard/boe-radar" style={{ fontSize: '10px', color: 'var(--gold-200)', textDecoration: 'none' }}>Ver radar →</Link>
          </div>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-3)' }}>Sin publicaciones recientes para esta oposición. El radar monitorea el BOE cada 24h.</p>
        </div>
      )}
    </div>
  )
}
