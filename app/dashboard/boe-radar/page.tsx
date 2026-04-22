'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Pub = { id: string; titulo: string; tipo: string; fecha_publicacion: string; url_pdf: string; resumen_ia: string; procesado: boolean }

export default function BoeRadarPage() {
  const [uid, setUid]         = useState<string | null>(null)
  const [pubs, setPubs]       = useState<Pub[]>([])
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState<string>('todos')
  const [alertas, setAlertas] = useState<any[]>([])
  const [oposiciones, setOpos] = useState<any[]>([])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return
      const uid = data.user.id; setUid(uid)
      const [{ data: pubs }, { data: alts }, { data: ops }] = await Promise.all([
        supabase.from('boe_publicaciones').select('*').order('fecha_publicacion', { ascending: false }).limit(200),
        supabase.from('alertas_boe').select('*,oposiciones(nombre_corto)').eq('user_id', uid),
        supabase.from('suscripciones_oposicion').select('oposiciones(id,nombre,nombre_corto)').eq('user_id', uid).eq('activa', true),
      ])
      setPubs(pubs ?? [])
      setAlertas(alts ?? [])
      setOpos(ops?.map((s: any) => s.oposiciones).filter(Boolean) ?? [])
      setLoading(false)
    })
  }, [])

  async function activarAlerta(oposicion_id: string) {
    if (!uid) return
    await supabase.from('alertas_boe').upsert({ user_id: uid, oposicion_id, activa: true, email: true }, { onConflict: 'user_id,oposicion_id' })
    const { data } = await supabase.from('alertas_boe').select('*,oposiciones(nombre_corto)').eq('user_id', uid)
    setAlertas(data ?? [])
  }

  async function desactivarAlerta(alertaId: string) {
    await supabase.from('alertas_boe').update({ activa: false }).eq('id', alertaId)
    setAlertas(prev => prev.map(a => a.id === alertaId ? { ...a, activa: false } : a))
  }

  const tipoColor: Record<string, string> = {
    convocatoria: '#4db87a', bases: 'var(--gold-100)', resultado: '#4d9fd4',
    temario: '#e07a4d', rectificacion: '#e05', otro: 'var(--text-3)',
  }

  const tipoOrden: Record<string, number> = { convocatoria: 0, bases: 1, resultado: 2, rectificacion: 3, temario: 4, otro: 5 }

  const filtradas = pubs
    .filter(p => filtroTipo === 'todos' || p.tipo === filtroTipo)
    .sort((a, b) => {
      const diff = (tipoOrden[a.tipo] ?? 5) - (tipoOrden[b.tipo] ?? 5)
      if (diff !== 0) return diff
      return new Date(b.fecha_publicacion).getTime() - new Date(a.fecha_publicacion).getTime()
    })

  return (
    <div style={{ padding: '2rem 2.5rem', maxWidth: '1100px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.4rem' }}>Monitoreo 24/7</div>
          <h1 className="serif" style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--text-0)' }}>BOE Radar</h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(77,184,122,0.08)', border: '0.5px solid rgba(77,184,122,0.2)', borderRadius: '10px', padding: '8px 14px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#4db87a', animation: 'pulse 2s infinite', display: 'inline-block' }} />
          <span style={{ fontSize: '12px', color: '#4db87a' }}>Activo · Actualización 08:00 y 17:30</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1.5rem', alignItems: 'start' }}>

        {/* Feed principal */}
        <div>
          {/* Filtros */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {['todos', 'convocatoria', 'bases', 'resultado', 'temario', 'rectificacion', 'otro'].map(t => (
              <button key={t} onClick={() => setFiltroTipo(t)} style={{ padding: '5px 12px', background: filtroTipo === t ? 'rgba(201,160,67,0.1)' : 'transparent', border: `0.5px solid ${filtroTipo === t ? 'var(--gold-200)' : 'rgba(255,255,255,0.08)'}`, color: filtroTipo === t ? 'var(--gold-100)' : 'var(--text-3)', borderRadius: '8px', cursor: 'pointer', fontSize: '11px', textTransform: 'capitalize' }}>
                {t === 'todos' ? 'Todas' : t}
              </button>
            ))}
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Cargando publicaciones…</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {filtradas.map(pub => (
                <div key={pub.id} style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: tipoColor[pub.tipo] ?? 'var(--text-3)', flexShrink: 0, marginTop: '6px' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '6px' }}>
                        <span style={{ fontSize: '9px', padding: '2px 7px', borderRadius: '5px', background: `${tipoColor[pub.tipo]}20`, color: tipoColor[pub.tipo] ?? 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{pub.tipo}</span>
                        <span style={{ fontSize: '9px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>BOE</span>
                        {pub.fecha_publicacion && <span style={{ fontSize: '9px', color: 'var(--text-3)' }}>{new Date(pub.fecha_publicacion).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</span>}
                      </div>
                      <h3 style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-0)', lineHeight: 1.5, marginBottom: '8px' }}>{pub.titulo}</h3>
                      {pub.resumen_ia && (
                        <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: '8px' }}>{pub.resumen_ia}</p>
                      )}
                      {pub.url_pdf && (
                        <a href={pub.url_pdf} target="_blank" rel="noopener noreferrer" style={{ fontSize: '11px', color: 'var(--gold-200)', textDecoration: 'none' }}>
                          Ver PDF oficial →
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {!filtradas.length && (
                <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '2.5rem', textAlign: 'center' }}>
                  <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Sin publicaciones con estos filtros.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar: alertas */}
        <div>
          <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', marginBottom: '1rem' }}>
            <div style={{ fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '1rem' }}>Mis alertas</div>
            {alertas.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>Sin alertas activas</p>
            ) : alertas.map(a => (
              <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0', borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
                <div>
                  <div style={{ fontSize: '0.82rem', color: 'var(--text-0)' }}>{a.oposiciones?.nombre_corto ?? 'Oposición'}</div>
                  <div style={{ fontSize: '10px', color: a.activa ? '#4db87a' : 'var(--text-3)' }}>{a.activa ? '● Activa' : '○ Pausada'}</div>
                </div>
                <button onClick={() => desactivarAlerta(a.id)} style={{ background: 'transparent', border: '0.5px solid rgba(255,255,255,0.08)', color: 'var(--text-3)', padding: '3px 8px', borderRadius: '5px', fontSize: '10px', cursor: 'pointer' }}>
                  Pausar
                </button>
              </div>
            ))}

            <div style={{ marginTop: '1.25rem' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '0.5rem' }}>Activar alerta para:</div>
              {oposiciones.map((op: any) => {
                const tieneAlerta = alertas.some(a => a.oposicion_id === op.id && a.activa)
                return (
                  <div key={op.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-1)' }}>{op.nombre_corto ?? op.nombre}</span>
                    {tieneAlerta ? (
                      <span style={{ fontSize: '10px', color: '#4db87a' }}>✓ Activa</span>
                    ) : (
                      <button onClick={() => activarAlerta(op.id)} style={{ background: 'rgba(201,160,67,0.08)', border: '0.5px solid var(--gold-border)', color: 'var(--gold-200)', padding: '3px 10px', borderRadius: '5px', fontSize: '10px', cursor: 'pointer' }}>
                        + Activar
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ background: 'rgba(77,184,122,0.06)', border: '0.5px solid rgba(77,184,122,0.2)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#4db87a', marginBottom: '0.5rem' }}>¿Cómo funciona?</div>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-2)', lineHeight: 1.7 }}>El BOE Radar analiza diariamente el BOE estatal y los 17 boletines autonómicos. Cuando detecta una publicación relevante para tus oposiciones, recibes un email inmediatamente.</p>
          </div>
        </div>
      </div>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  )
}
