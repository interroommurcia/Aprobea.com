'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type Flashcard = { id: string; pregunta: string; respuesta: string; tema: string; siguiente_repaso: string }

export default function FlashcardsPage() {
  const [plan, setPlan] = useState<string | null>(null)
  const [cards, setCards] = useState<Flashcard[]>([])
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      supabase.from('perfiles').select('plan,plan_activo').eq('id', data.user.id).single()
        .then(({ data: p }) => {
          setPlan(p?.plan ?? 'free')
          if (p?.plan_activo && p?.plan !== 'free') {
            supabase
              .from('flashcards')
              .select('id,pregunta,respuesta,tema,siguiente_repaso')
              .eq('user_id', data.user!.id)
              .lte('siguiente_repaso', new Date().toISOString())
              .order('siguiente_repaso')
              .limit(20)
              .then(({ data: rows }) => { setCards(rows ?? []); setLoading(false) })
          } else {
            setLoading(false)
          }
        })
    })
  }, [])

  const isPremium = plan !== null && plan !== 'free'

  if (!isPremium && plan !== null) {
    return (
      <div className="dash-content" style={{ padding: '2rem 1.5rem', maxWidth: '700px' }}>
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '16px', padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🃏</div>
          <h2 className="serif" style={{ fontSize: '1.8rem', fontWeight: 300, marginBottom: '0.75rem', color: 'var(--text-0)' }}>Flashcards con Spaced Repetition</h2>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '2rem', maxWidth: '420px', margin: '0 auto 2rem' }}>
            El algoritmo SM-2 decide cuándo repetir cada concepto para maximizar la retención a largo plazo. Disponible en planes Pro y Elite.
          </p>
          <a href="/dashboard/configuracion" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'var(--gold-200)', color: '#fff', padding: '12px 28px', borderRadius: '8px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600 }}>
            Mejorar plan →
          </a>
        </div>
      </div>
    )
  }

  if (loading) return <div style={{ padding: '2rem', color: 'var(--text-3)', fontSize: '0.85rem' }}>Cargando…</div>

  if (cards.length === 0) {
    return (
      <div className="dash-content" style={{ padding: '2rem 1.5rem', maxWidth: '700px' }}>
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.5rem' }}>Spaced Repetition</div>
          <h1 className="serif" style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--text-0)' }}>Flashcards</h1>
        </div>
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '16px', padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '1rem' }}>✅</div>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem' }}>No hay tarjetas pendientes de repaso por ahora.</p>
        </div>
      </div>
    )
  }

  const card = cards[idx]

  return (
    <div className="dash-content" style={{ padding: '2rem 1.5rem', maxWidth: '700px' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.5rem' }}>Spaced Repetition</div>
          <h1 className="serif" style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--text-0)' }}>Flashcards</h1>
        </div>
        <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{idx + 1} / {cards.length}</span>
      </div>

      <div
        onClick={() => setFlipped(f => !f)}
        style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '16px', padding: '3rem', minHeight: '220px', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', transition: 'all 0.2s', userSelect: 'none' }}
      >
        <div style={{ fontSize: '9px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '1.5rem' }}>
          {flipped ? 'Respuesta' : `${card.tema} · Toca para ver`}
        </div>
        <p style={{ fontSize: '1.05rem', color: flipped ? 'var(--gold-100)' : 'var(--text-0)', lineHeight: 1.65 }}>
          {flipped ? card.respuesta : card.pregunta}
        </p>
      </div>

      {flipped && (
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', justifyContent: 'center' }}>
          {[['Difícil', 1, '#ee4444'], ['Regular', 2, '#e07a4d'], ['Bien', 4, 'var(--gold-200)'], ['Perfecto', 5, '#4db87a']].map(([label, q, color]) => (
            <button
              key={String(label)}
              onClick={async () => {
                const next = new Date()
                next.setDate(next.getDate() + (Number(q) <= 2 ? 1 : Number(q) <= 3 ? 3 : 7))
                await supabase.from('flashcards').update({ siguiente_repaso: next.toISOString() }).eq('id', card.id)
                setFlipped(false)
                if (idx + 1 < cards.length) setIdx(i => i + 1)
                else setCards([])
              }}
              style={{ flex: 1, padding: '10px', borderRadius: '8px', border: `0.5px solid ${color}30`, background: `${color}15`, color: color as string, fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {label as string}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
