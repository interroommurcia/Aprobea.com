'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'

type Pregunta = { id: string; enunciado: string; tipo: string; opciones: { letra: string; texto: string }[]; dificultad: number; temas?: { titulo: string } }
type Resultado = { puntuacion: number; correctas: number; incorrectas: number; sin_responder: number; tiempo: number; xp_ganado: number }

export default function ExamenesPage() {
  const [uid, setUid]           = useState<string | null>(null)
  const [fase, setFase]         = useState<'config' | 'examen' | 'resultado'>('config')
  const [config, setConfig]     = useState({ tipo: 'practica', oposicion_id: '', n: 20, penalizacion: false })
  const [oposiciones, setOpos]  = useState<any[]>([])
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')
  const [examenId, setExamenId] = useState<string | null>(null)
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [respuestas, setRespuestas] = useState<Record<string, string>>({})
  const [actual, setActual]     = useState(0)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [explicacion, setExplicacion] = useState<Record<string, string>>({})
  const [loadingExpl, setLoadingExpl] = useState<string | null>(null)
  const [tiempo, setTiempo]     = useState(0)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => { if (data.user) setUid(data.user.id) })
    fetch('/api/oposiciones?limit=50').then(r => r.ok ? r.json() : []).then(d => setOpos(Array.isArray(d) ? d : []))
  }, [])

  async function iniciarExamen() {
    if (!uid) return
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/examenes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: uid, ...config }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Error iniciando examen')
      setExamenId(data.examen.id)
      setPreguntas(data.preguntas)
      setRespuestas({}); setActual(0); setTiempo(0)
      setFase('examen')
      timerRef.current = setInterval(() => setTiempo(t => t + 1), 1000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function finalizarExamen() {
    if (!examenId || !uid) return
    setLoading(true)
    if (timerRef.current) clearInterval(timerRef.current)
    const res = await fetch('/api/examenes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ examen_id: examenId, respuestas, finalizar: true }),
    })
    const data = await res.json()
    setResultado(data)
    setFase('resultado')
    setLoading(false)
  }

  async function pedirExplicacion(preguntaId: string) {
    const resp = respuestas[preguntaId]
    setLoadingExpl(preguntaId)
    const res = await fetch('/api/ia/corregir', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pregunta_id: preguntaId, respuesta_dada: resp, user_id: uid }),
    })
    const data = await res.json()
    setExplicacion(prev => ({ ...prev, [preguntaId]: data.explicacion }))
    setLoadingExpl(null)
  }

  const formatTiempo = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
  const pct = resultado ? Math.round((resultado.correctas / preguntas.length) * 100) : 0

  // ── CONFIG ──
  if (fase === 'config') return (
    <div style={{ padding: '2.5rem', maxWidth: '700px' }}>
      <h1 className="serif" style={{ fontSize: '2rem', fontWeight: 300, marginBottom: '2rem', color: 'var(--text-0)' }}>Nuevo examen</h1>
      <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '2rem' }}>

        <div className="form-group">
          <label className="form-label">Tipo de examen</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '0.75rem' }}>
            {[
              { value: 'practica', label: 'Práctica libre', icon: '📚', desc: 'Sin límite de tiempo' },
              { value: 'adaptativo', label: 'Adaptativo (IA)', icon: '🧠', desc: 'Ajustado a tu nivel' },
              { value: 'repaso_fallos', label: 'Repaso de fallos', icon: '🔄', desc: 'Solo tus puntos débiles' },
              { value: 'simulacro', label: 'Simulacro oficial', icon: '📋', desc: 'Condiciones reales' },
            ].map(t => (
              <button key={t.value} onClick={() => setConfig(c => ({ ...c, tipo: t.value }))} style={{ background: config.tipo === t.value ? 'rgba(201,160,67,0.1)' : 'rgba(255,255,255,0.02)', border: `0.5px solid ${config.tipo === t.value ? 'var(--gold-200)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 'var(--radius)', padding: '1rem', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' }}>
                <div style={{ fontSize: '1.4rem', marginBottom: '4px' }}>{t.icon}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: config.tipo === t.value ? 'var(--gold-100)' : 'var(--text-0)' }}>{t.label}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>{t.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Oposición</label>
          <select className="form-input" value={config.oposicion_id} onChange={e => setConfig(c => ({ ...c, oposicion_id: e.target.value }))}>
            <option value="">Todas mis oposiciones</option>
            {oposiciones.map(o => <option key={o.id} value={o.id}>{o.nombre_corto ?? o.nombre}</option>)}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Número de preguntas</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {[10, 20, 40, 60].map(n => (
              <button key={n} onClick={() => setConfig(c => ({ ...c, n }))} style={{ flex: 1, padding: '8px', background: config.n === n ? 'rgba(201,160,67,0.1)' : 'rgba(255,255,255,0.02)', border: `0.5px solid ${config.n === n ? 'var(--gold-200)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 'var(--radius)', cursor: 'pointer', color: config.n === n ? 'var(--gold-100)' : 'var(--text-2)', fontSize: '0.9rem', fontWeight: 600 }}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input type="checkbox" id="pen" checked={config.penalizacion} onChange={e => setConfig(c => ({ ...c, penalizacion: e.target.checked }))} />
          <label htmlFor="pen" className="form-label" style={{ margin: 0 }}>Penalización por fallo (-0.25 pts)</label>
        </div>

        {error && <p style={{ color: '#e05', fontSize: '0.82rem', marginBottom: '1rem' }}>{error}</p>}

        <button onClick={iniciarExamen} disabled={loading} style={{ width: '100%', padding: '14px', background: 'var(--gold-200)', color: '#000', border: 'none', borderRadius: 'var(--radius)', fontWeight: 700, fontSize: '1rem', cursor: 'pointer', opacity: loading ? 0.7 : 1 }}>
          {loading ? 'Preparando examen…' : 'Empezar examen →'}
        </button>
      </div>
    </div>
  )

  // ── EXAMEN ──
  if (fase === 'examen') {
    const p = preguntas[actual]
    const respondidas = Object.keys(respuestas).length
    return (
      <div style={{ padding: '2rem', maxWidth: '820px' }}>
        {/* Header del examen */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.5rem' }}>
          <div>
            <span style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Pregunta</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-0)' }}>{actual + 1} / {preguntas.length}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ height: '4px', width: '200px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
              <div style={{ height: '100%', width: `${((actual + 1) / preguntas.length) * 100}%`, background: 'var(--gold-200)', borderRadius: '2px', transition: 'width 0.3s' }} />
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '4px' }}>{respondidas} respondidas</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Tiempo</span>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--gold-100)', fontFamily: 'monospace' }}>{formatTiempo(tiempo)}</div>
          </div>
        </div>

        {/* Pregunta */}
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '2rem', marginBottom: '1.5rem' }}>
          {p?.temas?.titulo && <div style={{ fontSize: '11px', color: 'var(--gold-200)', marginBottom: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{p.temas.titulo}</div>}
          <p style={{ fontSize: '1rem', color: 'var(--text-0)', lineHeight: 1.7, marginBottom: '1.75rem' }}>{p?.enunciado}</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {p?.opciones?.map(op => {
              const seleccionada = respuestas[p.id] === op.letra
              return (
                <button key={op.letra} onClick={() => setRespuestas(r => ({ ...r, [p.id]: op.letra }))} style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '1rem 1.25rem', background: seleccionada ? 'rgba(201,160,67,0.1)' : 'rgba(255,255,255,0.02)', border: `0.5px solid ${seleccionada ? 'var(--gold-200)' : 'rgba(255,255,255,0.08)'}`, borderRadius: 'var(--radius)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s', width: '100%' }}>
                  <span style={{ width: '24px', height: '24px', borderRadius: '50%', background: seleccionada ? 'var(--gold-200)' : 'rgba(255,255,255,0.06)', color: seleccionada ? '#000' : 'var(--text-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>{op.letra}</span>
                  <span style={{ fontSize: '0.88rem', color: seleccionada ? 'var(--gold-100)' : 'var(--text-1)', lineHeight: 1.6 }}>{op.texto}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Navegación */}
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'space-between' }}>
          <button onClick={() => setActual(a => Math.max(0, a - 1))} disabled={actual === 0} style={{ padding: '10px 20px', background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', color: 'var(--text-2)', borderRadius: 'var(--radius)', cursor: 'pointer', opacity: actual === 0 ? 0.4 : 1 }}>
            ← Anterior
          </button>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            {actual < preguntas.length - 1 ? (
              <button onClick={() => setActual(a => a + 1)} style={{ padding: '10px 24px', background: 'var(--bg-3)', border: '0.5px solid var(--gold-border)', color: 'var(--text-0)', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 600 }}>
                Siguiente →
              </button>
            ) : null}
            <button onClick={finalizarExamen} disabled={loading} style={{ padding: '10px 24px', background: 'var(--gold-200)', color: '#000', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', fontWeight: 700, opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Calculando…' : 'Finalizar examen'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── RESULTADO ──
  if (fase === 'resultado' && resultado) return (
    <div style={{ padding: '2rem', maxWidth: '820px' }}>
      {/* Score */}
      <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '2.5rem', textAlign: 'center', marginBottom: '2rem' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.75rem' }}>Resultado del examen</div>
        <div className="serif" style={{ fontSize: '5rem', fontWeight: 300, color: pct >= 70 ? '#4db87a' : pct >= 50 ? 'var(--gold-100)' : '#e07a4d', lineHeight: 1 }}>
          {resultado.puntuacion.toFixed(1)}
        </div>
        <div style={{ fontSize: '1rem', color: 'var(--text-2)', marginTop: '0.5rem' }}>sobre 10</div>
        <div style={{ display: 'flex', gap: '2rem', justifyContent: 'center', marginTop: '2rem', flexWrap: 'wrap' }}>
          {[['✅', resultado.correctas, 'Correctas', '#4db87a'], ['❌', resultado.incorrectas, 'Incorrectas', '#e05'], ['⏭️', resultado.sin_responder, 'Sin responder', 'var(--text-3)'], ['⏱️', formatTiempo(resultado.tiempo), 'Tiempo', 'var(--gold-100)'], ['⭐', `+${resultado.xp_ganado}`, 'XP ganados', 'var(--gold-200)']].map(([icon, val, label, color]) => (
            <div key={String(label)}>
              <div style={{ fontSize: '1.5rem' }}>{icon as string}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: color as string }}>{val as any}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>{label as string}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Revisión pregunta a pregunta */}
      <div style={{ marginBottom: '1.5rem' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '1rem' }}>Revisión detallada</div>
        {preguntas.map((p, i) => {
          const respDada = respuestas[p.id]
          return (
            <div key={p.id} style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '10px', color: 'var(--text-3)', flexShrink: 0, marginTop: '2px' }}>#{i + 1}</span>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-0)', lineHeight: 1.6, flex: 1 }}>{p.enunciado}</p>
              </div>
              {respDada && (
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '11px', padding: '3px 10px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', color: 'var(--text-2)' }}>Tu respuesta: <strong>{respDada}</strong></span>
                </div>
              )}
              {!respDada && <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>Sin responder</span>}

              {explicacion[p.id] ? (
                <div style={{ background: 'rgba(201,160,67,0.05)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius)', padding: '0.875rem', fontSize: '0.85rem', color: 'var(--text-1)', lineHeight: 1.7 }}>
                  {explicacion[p.id]}
                </div>
              ) : (
                <button onClick={() => pedirExplicacion(p.id)} disabled={loadingExpl === p.id} style={{ fontSize: '11px', color: 'var(--gold-200)', background: 'rgba(201,160,67,0.06)', border: '0.5px solid var(--gold-border)', borderRadius: '6px', padding: '5px 12px', cursor: 'pointer', opacity: loadingExpl === p.id ? 0.6 : 1 }}>
                  {loadingExpl === p.id ? 'Generando explicación…' : '🤖 Ver explicación IA'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <button onClick={() => { setFase('config'); setResultado(null); setPreguntas([]) }} style={{ padding: '14px 32px', background: 'var(--gold-200)', color: '#000', border: 'none', borderRadius: 'var(--radius)', fontWeight: 700, cursor: 'pointer', fontSize: '1rem' }}>
        Hacer otro examen →
      </button>
    </div>
  )

  return null
}
