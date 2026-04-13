'use client'
import { useState } from 'react'
import TicketProgress from '@/components/TicketProgress'

export type MarketplaceOp = {
  id: string
  titulo: string
  descripcion: string
  tipo: string
  pdf_url: string | null
  activa: boolean
  created_at: string
  tickets_total: number
  tickets_vendidos: number
  tickets_por_participante: number
  importe_objetivo: number | null
  // Property fields
  referencia_catastral: string | null
  municipio: string | null
  provincia: string | null
  valor_mercado: number | null
  precio_compra: number | null
  comision: number | null
  rentabilidad: number | null
  ticket_minimo: number | null
  superficie: number | null
  tipo_propiedad: string | null
  imagen_principal: string | null
  publico: boolean
}

const TIPO_COLORS: Record<string, string> = { npl: '#b87333', crowdfunding: '#C9A043' }

function eur(n: number | null | undefined) {
  if (n == null) return null
  return n.toLocaleString('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 })
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function MarketplaceCard({
  op, onVerPDF, userEmail, userId,
}: {
  op: MarketplaceOp
  onVerPDF?: () => void
  userEmail?: string
  userId?: string
}) {
  const libre = Math.max((op.tickets_total ?? 0) - (op.tickets_vendidos ?? 0), 0)
  const isFull = op.tickets_total > 0 && libre === 0
  const rentDisplay = op.rentabilidad != null ? `${op.rentabilidad.toFixed(2)}%` : null
  const [reservando, setReservando] = useState(false)
  const [reservaError, setReservaError] = useState('')

  async function handleReservar() {
    setReservando(true)
    setReservaError('')
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operacion_id: op.id,
          tipo: op.tipo,
          user_id: userId,
          email: userEmail,
        }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setReservaError(data.error ?? 'Error al iniciar el pago')
      }
    } catch {
      setReservaError('Error de conexión')
    } finally {
      setReservando(false)
    }
  }

  return (
    <div style={{
      background: 'var(--bg-2)',
      border: '0.5px solid var(--gold-border)',
      borderRadius: '20px',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
    }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = 'translateY(-3px)'
        el.style.boxShadow = '0 12px 40px rgba(0,0,0,0.4)'
        el.style.borderColor = 'rgba(201,160,67,0.45)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.transform = ''
        el.style.boxShadow = ''
        el.style.borderColor = 'rgba(201,160,67,0.25)'
      }}
    >
      {/* ── Image ── */}
      <div style={{ position: 'relative', height: '200px', background: 'var(--bg-3)', flexShrink: 0, overflow: 'hidden' }}>
        {op.imagen_principal ? (
          <img
            src={op.imagen_principal}
            alt={op.referencia_catastral ?? op.titulo}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-3)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21,15 16,10 5,21"/>
            </svg>
            <span style={{ fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Sin imagen</span>
          </div>
        )}

        {/* Type badge top-left */}
        <div style={{ position: 'absolute', top: '12px', left: '12px' }}>
          <span style={{
            padding: '4px 10px', borderRadius: '99px',
            fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase',
            color: TIPO_COLORS[op.tipo] ?? '#C9A043',
            background: `${TIPO_COLORS[op.tipo] ?? '#C9A043'}22`,
            border: `0.5px solid ${TIPO_COLORS[op.tipo] ?? '#C9A043'}`,
            backdropFilter: 'blur(8px)',
          }}>
            {op.tipo}
          </span>
        </div>

        {/* Status badge top-right */}
        <div style={{ position: 'absolute', top: '12px', right: '12px' }}>
          <span style={{
            padding: '4px 10px', borderRadius: '99px',
            fontSize: '9px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase',
            color: isFull ? '#ee0055' : op.activa ? '#6dc86d' : 'var(--text-3)',
            background: isFull ? 'rgba(238,0,85,0.18)' : op.activa ? 'rgba(109,200,109,0.18)' : 'rgba(62,59,53,0.6)',
            border: `0.5px solid ${isFull ? '#ee0055' : op.activa ? '#6dc86d' : 'rgba(62,59,53,0.5)'}`,
            backdropFilter: 'blur(8px)',
          }}>
            ● {isFull ? 'Cerrada' : op.activa ? 'Activa' : 'Oculta'}
          </span>
        </div>

        {/* Gradient overlay at bottom */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '80px', background: 'linear-gradient(to top, rgba(6,7,9,0.85), transparent)' }} />

        {/* Location over image */}
        {(op.municipio || op.provincia) && (
          <div style={{ position: 'absolute', bottom: '12px', left: '14px', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--gold-200)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-0)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              {[op.municipio, op.provincia].filter(Boolean).join(', ')}
            </span>
          </div>
        )}
      </div>

      {/* ── Content ── */}
      <div style={{ padding: '1.25rem 1.375rem', display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>

        {/* Title — referencia catastral or titulo */}
        <div>
          <div style={{ fontWeight: 700, color: 'var(--text-0)', fontSize: '0.88rem', letterSpacing: '0.04em', marginBottom: '3px', lineHeight: 1.3 }}>
            {op.referencia_catastral || op.titulo}
          </div>
          {op.referencia_catastral && op.titulo !== op.referencia_catastral && (
            <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden' }}>
              {op.titulo}
            </div>
          )}
        </div>

        {/* Financial grid — row 1 */}
        <div style={{ display: 'grid', gridTemplateColumns: op.valor_mercado && op.precio_compra && op.comision ? '1fr 1fr 1fr' : op.valor_mercado && op.precio_compra ? '1fr 1fr' : '1fr', gap: '0', borderTop: '0.5px solid rgba(255,255,255,0.05)', borderBottom: '0.5px solid rgba(255,255,255,0.05)', padding: '0.75rem 0' }}>
          {op.valor_mercado != null && (
            <div>
              <div style={{ fontSize: '9px', color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '3px' }}>Valor mercado</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-0)' }}>{eur(op.valor_mercado)}</div>
            </div>
          )}
          {op.precio_compra != null && (
            <div>
              <div style={{ fontSize: '9px', color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '3px' }}>Precio compra</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-0)' }}>{eur(op.precio_compra)}</div>
            </div>
          )}
          {op.comision != null && (
            <div>
              <div style={{ fontSize: '9px', color: 'var(--gold-200)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '3px' }}>Comisión</div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--gold-100)' }}>{eur(op.comision)}</div>
            </div>
          )}
        </div>

        {/* Financial grid — row 2 */}
        {(rentDisplay || op.ticket_minimo != null || op.tickets_total > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0' }}>
            {rentDisplay && (
              <div>
                <div style={{ fontSize: '9px', color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '3px' }}>Rentabilidad</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 700, color: '#6dc86d' }}>{rentDisplay}</div>
              </div>
            )}
            {op.ticket_minimo != null && (
              <div>
                <div style={{ fontSize: '9px', color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '3px' }}>Ticket mínimo</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-0)' }}>{eur(op.ticket_minimo)}</div>
              </div>
            )}
            {op.tickets_total > 0 && (
              <div>
                <div style={{ fontSize: '9px', color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '3px' }}>Inversores</div>
                <div style={{ fontSize: '0.82rem', fontWeight: 700, color: isFull ? '#ee0055' : 'var(--text-0)' }}>
                  {op.tickets_vendidos ?? 0}/{op.tickets_total}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Progress bar */}
        {op.tickets_total > 0 && (
          <TicketProgress
            total={op.tickets_total}
            vendidos={op.tickets_vendidos ?? 0}
            tipo={op.tipo}
            size="sm"
            showLabel={false}
            animate
          />
        )}

        {/* Tags row */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          {op.publico && (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 9px', borderRadius: '99px', fontSize: '9px', fontWeight: 600, letterSpacing: '0.08em', color: '#6dc86d', border: '0.5px solid rgba(109,200,109,0.35)', background: 'rgba(109,200,109,0.08)' }}>
              🌐 Público
            </span>
          )}
          {op.superficie != null && (
            <span style={{ padding: '3px 9px', borderRadius: '99px', fontSize: '9px', color: 'var(--text-2)', border: '0.5px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
              {op.superficie.toFixed(0)} m²
            </span>
          )}
          {op.tipo_propiedad && (
            <span style={{ padding: '3px 9px', borderRadius: '99px', fontSize: '9px', color: 'var(--text-2)', border: '0.5px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.03)' }}>
              {op.tipo_propiedad}
            </span>
          )}
          {op.tickets_por_participante > 0 && (
            <span style={{ padding: '3px 9px', borderRadius: '99px', fontSize: '9px', color: 'var(--gold-200)', border: '0.5px solid rgba(201,160,67,0.25)', background: 'rgba(201,160,67,0.06)' }}>
              máx. {op.tickets_por_participante}/inversor
            </span>
          )}
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
          <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>Creada: {fmtDate(op.created_at)}</span>
          {op.pdf_url && (
            <span style={{ fontSize: '10px', color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              📄 PDF disponible
            </span>
          )}
        </div>

        {/* CTAs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Botón reservar (principal) */}
          <button
            onClick={handleReservar}
            disabled={reservando || isFull || !op.activa}
            style={{
              width: '100%', padding: '13px',
              background: isFull || !op.activa
                ? 'rgba(255,255,255,0.05)'
                : 'linear-gradient(135deg, var(--gold-300), var(--gold-200), var(--gold-100))',
              color: isFull || !op.activa ? 'var(--text-3)' : 'var(--bg-0)',
              border: isFull || !op.activa ? '0.5px solid rgba(255,255,255,0.1)' : 'none',
              borderRadius: '12px', fontSize: '11px', fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase',
              cursor: isFull || !op.activa ? 'not-allowed' : reservando ? 'wait' : 'pointer',
              opacity: reservando ? 0.7 : 1,
              transition: 'opacity 0.15s, transform 0.15s, box-shadow 0.15s',
              boxShadow: isFull || !op.activa ? 'none' : '0 4px 16px rgba(201,160,67,0.2)',
            }}
            onMouseEnter={e => {
              if (isFull || !op.activa) return
              const el = e.currentTarget
              el.style.transform = 'translateY(-1px)'
              el.style.boxShadow = '0 8px 24px rgba(201,160,67,0.35)'
            }}
            onMouseLeave={e => {
              const el = e.currentTarget
              el.style.transform = ''
              el.style.boxShadow = isFull || !op.activa ? 'none' : '0 4px 16px rgba(201,160,67,0.2)'
            }}
          >
            {reservando ? '⏳ Redirigiendo…' : isFull ? 'Completa' : !op.activa ? 'No disponible' : 'Reservar ticket →'}
          </button>

          {/* Ver informe PDF (secundario) */}
          {op.pdf_url && (
            <button
              onClick={onVerPDF}
              style={{
                width: '100%', padding: '10px',
                background: 'transparent',
                color: 'var(--gold-200)',
                border: '0.5px solid rgba(201,160,67,0.35)',
                borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                letterSpacing: '0.1em', textTransform: 'uppercase',
                cursor: 'pointer',
                transition: 'background 0.15s, border-color 0.15s',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(201,160,67,0.07)'
                e.currentTarget.style.borderColor = 'rgba(201,160,67,0.6)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = 'rgba(201,160,67,0.35)'
              }}
            >
              Ver informe PDF ↗
            </button>
          )}

          {/* Error de pago */}
          {reservaError && (
            <p style={{ fontSize: '10px', color: '#e05', textAlign: 'center', margin: 0 }}>
              ⚠ {reservaError}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
