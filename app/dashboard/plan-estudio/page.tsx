'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Semana = { semana: number; objetivo: string; temas: { numero: number; titulo: string; horas: number; prioridad: string }[]; examenes: string[] }
type Plan   = { resumen: string; semanas: Semana[]; recomendaciones: string[] }

export default function PlanEstudioPage() {
  const [uid, setUid]           = useState<string | null>(null)
  const [oposiciones, setOpos]  = useState<any[]>([])
  const [planGuardado, setPlan] = useState<Plan | null>(null)
  const [form, setForm]         = useState({ oposicion_id: '', fecha_examen: '', horas_semana: 10 })
  const [loading, setLoading]   = useState(false)
  const [generando, setGenerando] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      setUid(data.user.id)
      const [{ data: subs }, { data: plan }] = await Promise.all([
        supabase.from('suscripciones_oposicion').select('oposiciones(id,nombre,nombre_corto)').eq('user_id', data.user.id).eq('activa', true),
        supabase.from('planes_estudio').select('*').eq('user_id', data.user.id).eq('activo', true).order('updated_at', { ascending: false }).limit(1).single(),
      ])
      setOpos(subs?.map((s: any) => s.oposiciones).filter(Boolean) ?? [])
      if (plan?.plan) { setPlan(plan.plan as Plan); setForm(f => ({ ...f, oposicion_id: plan.oposicion_id ?? '' })) }
      setLoading(false)
    })
  }, [])

  async function generarPlan() {
    if (!uid || !form.oposicion_id) return
    setGenerando(true)
    const res = await fetch('/api/ia/plan-estudio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: uid, ...form }),
    })
    const data = await res.json()
    if (data.plan) setPlan(data.plan)
    setGenerando(false)
  }

  const prioridadColor: Record<string, string> = { alta: '#e07a4d', media: 'var(--gold-100)', baja: 'var(--text-3)' }

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: '1000px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.4rem' }}>Generado por IA</div>
        <h1 className="serif" style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--text-0)' }}>Plan de estudio</h1>
      </div>

      {/* Configuración */}
      <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1.75rem', marginBottom: '2rem' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '1.25rem' }}>Configurar plan</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '1rem', marginBottom: '1.25rem' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Oposición</label>
            <select className="form-input" value={form.oposicion_id} onChange={e => setForm(f => ({ ...f, oposicion_id: e.target.value }))}>
              <option value="">Selecciona…</option>
              {oposiciones.map((o: any) => <option key={o.id} value={o.id}>{o.nombre_corto ?? o.nombre}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Fecha del examen</label>
            <input type="date" className="form-input" value={form.fecha_examen} onChange={e => setForm(f => ({ ...f, fecha_examen: e.target.value }))} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label">Horas disponibles / semana</label>
            <select className="form-input" value={form.horas_semana} onChange={e => setForm(f => ({ ...f, horas_semana: parseInt(e.target.value) }))}>
              {[5,8,10,15,20,30].map(h => <option key={h} value={h}>{h}h / semana</option>)}
            </select>
          </div>
        </div>
        <button onClick={generarPlan} disabled={generando || !form.oposicion_id} style={{ padding: '10px 24px', background: 'var(--gold-200)', color: '#000', border: 'none', borderRadius: 'var(--radius)', fontWeight: 700, cursor: 'pointer', opacity: generando || !form.oposicion_id ? 0.6 : 1 }}>
          {generando ? '🤖 Generando plan con IA…' : planGuardado ? '🔄 Regenerar plan' : '🤖 Generar plan con IA'}
        </button>
        {!form.oposicion_id && <p style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '8px' }}>Primero suscríbete a una oposición en "Mis Oposiciones"</p>}
      </div>

      {planGuardado && (
        <>
          {/* Resumen */}
          <div style={{ background: 'rgba(201,160,67,0.05)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.75rem' }}>Resumen del plan</div>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-1)', lineHeight: 1.7 }}>{planGuardado.resumen}</p>
          </div>

          {/* Semanas */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '1rem' }}>Distribución semanal</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {planGuardado.semanas?.map((semana) => (
                <div key={semana.semana} style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
                  <div style={{ padding: '1rem 1.5rem', borderBottom: '0.5px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(201,160,67,0.04)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span className="serif" style={{ fontSize: '1.4rem', color: 'var(--gold-200)', fontWeight: 300 }}>S{semana.semana}</span>
                      <span style={{ fontSize: '0.85rem', color: 'var(--text-0)', fontWeight: 500 }}>{semana.objetivo}</span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                      {semana.temas?.reduce((s, t) => s + (t.horas ?? 0), 0)}h estimadas
                    </span>
                  </div>
                  <div style={{ padding: '1rem 1.5rem', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)', marginBottom: '0.5rem' }}>Temas</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {semana.temas?.map((t, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: prioridadColor[t.prioridad] ?? 'var(--text-3)', flexShrink: 0 }} />
                            <span style={{ fontSize: '0.82rem', color: 'var(--text-1)' }}>{t.numero ? `T${t.numero} ` : ''}{t.titulo}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-3)', marginLeft: 'auto' }}>{t.horas}h</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {semana.examenes?.length > 0 && (
                      <div>
                        <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-3)', marginBottom: '0.5rem' }}>Exámenes de repaso</div>
                        {semana.examenes.map((ex, i) => (
                          <div key={i} style={{ fontSize: '0.8rem', color: 'var(--text-2)', marginBottom: '4px' }}>📝 {ex}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recomendaciones */}
          {planGuardado.recomendaciones?.length > 0 && (
            <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem' }}>
              <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '1rem' }}>Recomendaciones de la IA</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {planGuardado.recomendaciones.map((r, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', fontSize: '0.85rem', color: 'var(--text-1)', lineHeight: 1.6 }}>
                    <span style={{ color: 'var(--gold-200)', flexShrink: 0 }}>→</span>
                    {r}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!planGuardado && !generando && (
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📅</div>
          <h3 className="serif" style={{ fontSize: '1.4rem', fontWeight: 300, marginBottom: '0.75rem', color: 'var(--text-0)' }}>Sin plan activo</h3>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem', maxWidth: '400px', margin: '0 auto' }}>
            Configura tu oposición y fecha de examen arriba. La IA analizará tu progreso actual y generará un plan semana a semana adaptado a ti.
          </p>
        </div>
      )}
    </div>
  )
}
