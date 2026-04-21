'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Suscripcion = {
  id: string
  oposicion_id: string
  creado_en: string
  oposiciones: { nombre: string; categoria: string; comunidad: string } | null
}

export default function MisOposicionesPage() {
  const [suscripciones, setSuscripciones] = useState<Suscripcion[]>([])
  const [loading, setLoading] = useState(true)
  const [nueva, setNueva] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      supabase
        .from('suscripciones_oposicion')
        .select('*, oposiciones(nombre,categoria,comunidad)')
        .eq('user_id', data.user.id)
        .then(({ data: rows }) => { setSuscripciones(rows ?? []); setLoading(false) })
    })
  }, [])

  async function agregarOposicion() {
    if (!nueva.trim()) return
    setSaving(true)
    const { data: auth } = await supabase.auth.getUser()
    if (!auth.user) return
    const { data: op } = await supabase
      .from('oposiciones')
      .select('id')
      .ilike('nombre', `%${nueva.trim()}%`)
      .limit(1)
      .single()
    if (op) {
      await supabase.from('suscripciones_oposicion').insert({ user_id: auth.user.id, oposicion_id: op.id })
      const { data: rows } = await supabase
        .from('suscripciones_oposicion')
        .select('*, oposiciones(nombre,categoria,comunidad)')
        .eq('user_id', auth.user.id)
      setSuscripciones(rows ?? [])
    }
    setNueva('')
    setSaving(false)
  }

  return (
    <div className="dash-content" style={{ padding: '2rem 1.5rem', maxWidth: '900px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.5rem' }}>Dashboard</div>
        <h1 className="serif" style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--text-0)' }}>Mis Oposiciones</h1>
        <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', marginTop: '0.5rem' }}>Gestiona las oposiciones que estás preparando.</p>
      </div>

      {/* Agregar */}
      <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '12px', padding: '1.5rem', marginBottom: '2rem', display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={{ display: 'block', fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '6px' }}>Añadir oposición</label>
          <input
            type="text"
            className="bo-input"
            placeholder="Ej: Auxiliar Administrativo, Policía Local…"
            value={nueva}
            onChange={e => setNueva(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && agregarOposicion()}
          />
        </div>
        <button className="bo-btn bo-btn-primary" onClick={agregarOposicion} disabled={saving || !nueva.trim()}>
          {saving ? 'Añadiendo…' : 'Añadir →'}
        </button>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Cargando…</p>
      ) : suscripciones.length === 0 ? (
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '12px', padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>📚</div>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>Aún no tienes oposiciones activas.<br />Añade la primera arriba.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {suscripciones.map(s => (
            <div key={s.id} style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '12px', padding: '1.25rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--text-0)', marginBottom: '2px' }}>
                  {s.oposiciones?.nombre ?? 'Oposición'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>
                  {[s.oposiciones?.categoria, s.oposiciones?.comunidad].filter(Boolean).join(' · ')}
                </div>
              </div>
              <button
                className="bo-btn bo-btn-danger bo-btn-sm"
                onClick={async () => {
                  await supabase.from('suscripciones_oposicion').delete().eq('id', s.id)
                  setSuscripciones(prev => prev.filter(x => x.id !== s.id))
                }}
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
