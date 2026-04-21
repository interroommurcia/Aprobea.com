'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Entry = { nombre: string; xp_total: number; racha_dias: number; plan: string; pos: number; isMe: boolean }

export default function RankingPage() {
  const [plan, setPlan] = useState<string | null>(null)
  const [ranking, setRanking] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const { data: p } = await supabase.from('perfiles').select('plan,plan_activo').eq('id', data.user.id).single()
      setPlan(p?.plan ?? 'free')

      const { data: rows } = await supabase
        .from('perfiles')
        .select('id,nombre,xp_total,racha_dias,plan')
        .order('xp_total', { ascending: false })
        .limit(50)

      setRanking(
        (rows ?? []).map((r: any, i: number) => ({
          nombre: r.nombre ?? 'Anónimo',
          xp_total: r.xp_total ?? 0,
          racha_dias: r.racha_dias ?? 0,
          plan: r.plan ?? 'free',
          pos: i + 1,
          isMe: r.id === data.user!.id,
        }))
      )
      setLoading(false)
    })
  }, [])

  const planBadge: Record<string, string> = { free: 'var(--text-3)', basico: '#4d9fd4', pro: 'var(--gold-200)', elite: '#e07a4d' }

  return (
    <div className="dash-content" style={{ padding: '2rem 1.5rem', maxWidth: '860px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.5rem' }}>Comunidad</div>
        <h1 className="serif" style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--text-0)' }}>Ranking Semanal</h1>
        <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', marginTop: '0.5rem' }}>Comparativa anónima por XP acumulado esta semana.</p>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Cargando…</p>
      ) : ranking.length === 0 ? (
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>Aún no hay datos de ranking.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {ranking.map(e => (
            <div key={e.pos} style={{
              background: e.isMe ? 'rgba(29,158,117,0.08)' : 'var(--bg-2)',
              border: `0.5px solid ${e.isMe ? 'var(--gold-border-strong)' : 'var(--gold-border)'}`,
              borderRadius: '12px', padding: '1rem 1.5rem',
              display: 'flex', alignItems: 'center', gap: '1rem',
            }}>
              <div style={{ width: '32px', textAlign: 'center', fontFamily: 'var(--font-cormorant), serif', fontSize: e.pos <= 3 ? '1.4rem' : '1rem', color: e.pos === 1 ? '#fbbf24' : e.pos === 2 ? '#9ca3af' : e.pos === 3 ? '#d97706' : 'var(--text-3)', fontWeight: 300 }}>
                {e.pos <= 3 ? ['🥇', '🥈', '🥉'][e.pos - 1] : `#${e.pos}`}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.9rem', fontWeight: e.isMe ? 700 : 500, color: e.isMe ? 'var(--gold-100)' : 'var(--text-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {e.nombre}{e.isMe && ' (tú)'}
                </div>
                <div style={{ fontSize: '10px', color: planBadge[e.plan], letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: '2px' }}>{e.plan}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--gold-100)' }}>{e.xp_total.toLocaleString()} XP</div>
                {e.racha_dias > 0 && <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>🔥 {e.racha_dias}d</div>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
