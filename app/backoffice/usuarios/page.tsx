'use client'

import { useEffect, useState } from 'react'

type Usuario = { id: string; email: string; nombre: string; apellidos: string; plan: string; plan_activo: boolean; xp_total: number; racha_dias: number; created_at: string }

export default function BackofficeUsuarios() {
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [loading, setLoading]  = useState(true)
  const [search, setSearch]    = useState('')
  const [filtroPlan, setPlan]  = useState<string>('todos')

  useEffect(() => {
    fetch('/api/backoffice/usuarios').then(r => r.ok ? r.json() : []).then(d => { setUsuarios(Array.isArray(d) ? d : []); setLoading(false) })
  }, [])

  const filtrados = usuarios.filter(u => {
    const matchSearch = !search || u.email?.toLowerCase().includes(search.toLowerCase()) || u.nombre?.toLowerCase().includes(search.toLowerCase())
    const matchPlan   = filtroPlan === 'todos' || u.plan === filtroPlan
    return matchSearch && matchPlan
  })

  const planColor: Record<string, string> = { free: 'var(--text-3)', basico: '#4d9fd4', pro: 'var(--gold-100)', elite: '#e07a4d' }

  return (
    <div style={{ padding: '2.5rem 3rem' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.4rem' }}>Gestión</div>
        <h1 className="serif" style={{ fontSize: '2.2rem', fontWeight: 300, color: 'var(--text-0)' }}>Usuarios</h1>
      </div>

      {/* Stats rápidas */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Total', value: usuarios.length },
          { label: 'Free', value: usuarios.filter(u => u.plan === 'free').length },
          { label: 'Pro', value: usuarios.filter(u => u.plan === 'pro').length },
          { label: 'Elite', value: usuarios.filter(u => u.plan === 'elite').length },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.5rem' }}>
            <div className="serif" style={{ fontSize: '1.6rem', fontWeight: 300, color: 'var(--gold-100)' }}>{s.value}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{s.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input className="form-input" placeholder="Buscar por nombre o email…" value={search} onChange={e => setSearch(e.target.value)} style={{ maxWidth: '320px' }} />
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {['todos','free','basico','pro','elite'].map(p => (
            <button key={p} onClick={() => setPlan(p)} style={{ padding: '7px 14px', background: filtroPlan === p ? 'rgba(201,160,67,0.1)' : 'transparent', border: `0.5px solid ${filtroPlan === p ? 'var(--gold-200)' : 'rgba(255,255,255,0.08)'}`, color: filtroPlan === p ? 'var(--gold-100)' : 'var(--text-3)', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', textTransform: 'capitalize' }}>{p}</button>
          ))}
        </div>
      </div>

      <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        {loading ? <p style={{ padding: '2rem', color: 'var(--text-3)' }}>Cargando…</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--gold-border)' }}>
                {['Usuario', 'Plan', 'XP', 'Racha', 'Registro'].map(h => (
                  <th key={h} style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map(u => (
                <tr key={u.id} style={{ borderBottom: '0.5px solid rgba(62,59,53,0.3)' }}>
                  <td style={{ padding: '0.9rem 1.5rem' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-0)', fontWeight: 500 }}>{u.nombre ? `${u.nombre} ${u.apellidos ?? ''}`.trim() : '—'}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{u.email}</div>
                  </td>
                  <td style={{ padding: '0.9rem 1.5rem' }}>
                    <span style={{ fontSize: '10px', padding: '2px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', color: planColor[u.plan] ?? 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{u.plan}</span>
                  </td>
                  <td style={{ padding: '0.9rem 1.5rem', fontSize: '0.82rem', color: 'var(--gold-200)', fontWeight: 600 }}>{(u.xp_total ?? 0).toLocaleString('es-ES')}</td>
                  <td style={{ padding: '0.9rem 1.5rem', fontSize: '0.85rem', color: u.racha_dias > 0 ? '#e07a4d' : 'var(--text-3)' }}>{u.racha_dias > 0 ? `🔥 ${u.racha_dias}d` : '—'}</td>
                  <td style={{ padding: '0.9rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-3)' }}>{new Date(u.created_at).toLocaleDateString('es-ES')}</td>
                </tr>
              ))}
              {!filtrados.length && <tr><td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.85rem' }}>Sin usuarios</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
