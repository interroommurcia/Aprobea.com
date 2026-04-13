'use client'
import { useEffect, useRef, useState } from 'react'

interface TicketProgressProps {
  total: number
  vendidos: number
  tipo?: string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  animate?: boolean
}

function easeOutCubic(t: number) { return 1 - Math.pow(1 - t, 3) }

export default function TicketProgress({
  total,
  vendidos,
  tipo = 'crowdfunding',
  size = 'md',
  showLabel = true,
  animate = true,
}: TicketProgressProps) {
  const [displayed, setDisplayed] = useState(animate ? 0 : vendidos)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const DURATION = 1200

  // Animate fill on mount / when vendidos changes
  useEffect(() => {
    if (!animate) { setDisplayed(vendidos); return }
    startRef.current = null
    const target = Math.min(vendidos, total)
    const step = (ts: number) => {
      if (startRef.current === null) startRef.current = ts
      const progress = Math.min((ts - startRef.current) / DURATION, 1)
      setDisplayed(Math.round(easeOutCubic(progress) * target))
      if (progress < 1) rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [vendidos, total, animate])

  const pct = total > 0 ? Math.min(displayed / total, 1) : 0
  const isFull = vendidos >= total
  const isUrgent = !isFull && pct >= 0.75
  const libre = Math.max(total - vendidos, 0)

  // Height by size
  const barH = size === 'sm' ? 8 : size === 'lg' ? 18 : 12
  const fontSize = size === 'sm' ? '10px' : size === 'lg' ? '13px' : '11px'

  // Color palette
  const isNpl = tipo === 'npl'
  const fillStart = isNpl ? '#b87333' : '#c9a043'
  const fillEnd = isNpl ? '#d4956a' : '#f0d080'
  const glowColor = isNpl ? 'rgba(184,115,51,0.55)' : 'rgba(201,160,67,0.55)'

  // Show individual slots if total <= 24
  const showSlots = total > 0 && total <= 24

  return (
    <div style={{ width: '100%' }}>
      {/* Header row */}
      {showLabel && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: size === 'sm' ? '5px' : '8px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize, color: 'var(--text-3)', letterSpacing: '0.05em' }}>
              {isFull ? (
                <span style={{ color: '#e05', fontWeight: 600 }}>● CERRADO</span>
              ) : isUrgent ? (
                <span style={{ color: '#e8a020', fontWeight: 600 }}>⚡ ¡Solo quedan {libre}!</span>
              ) : (
                <span style={{ color: 'var(--text-2)' }}>
                  <span style={{ color: fillStart, fontWeight: 700, fontSize: `calc(${fontSize} + 1px)` }}>{displayed}</span>
                  <span style={{ color: 'var(--text-3)' }}> / {total} tickets</span>
                </span>
              )}
            </span>
          </div>
          <span style={{
            fontSize: `calc(${fontSize} - 1px)`,
            color: isFull ? '#e05' : isUrgent ? '#e8a020' : 'var(--text-3)',
            fontWeight: isFull || isUrgent ? 700 : 400,
            letterSpacing: '0.08em',
          }}>
            {Math.round(pct * 100)}%
          </span>
        </div>
      )}

      {/* Track */}
      <div style={{
        position: 'relative',
        height: barH,
        background: 'rgba(255,255,255,0.04)',
        borderRadius: barH / 2,
        overflow: showSlots ? 'visible' : 'hidden',
        border: '0.5px solid rgba(255,255,255,0.06)',
      }}>
        {/* Slot dividers (visible behind fill) */}
        {showSlots && total > 1 && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            borderRadius: barH / 2, overflow: 'hidden',
          }}>
            {Array.from({ length: total }).map((_, i) => (
              <div key={i} style={{
                flex: 1,
                borderRight: i < total - 1 ? '1px solid rgba(0,0,0,0.35)' : 'none',
                background: i < displayed
                  ? `linear-gradient(90deg, ${fillStart}, ${fillEnd})`
                  : 'transparent',
                transition: 'background 0.15s',
              }} />
            ))}
          </div>
        )}

        {/* Smooth fill (when no slots or large count) */}
        {!showSlots && (
          <div style={{
            position: 'absolute',
            left: 0, top: 0, bottom: 0,
            width: `${pct * 100}%`,
            borderRadius: barH / 2,
            background: isFull
              ? 'linear-gradient(90deg, #c0392b, #e74c3c)'
              : `linear-gradient(90deg, ${fillStart}, ${fillEnd})`,
            boxShadow: pct > 0 ? `0 0 ${barH * 1.5}px ${glowColor}` : 'none',
            transition: 'none',
          }}>
            {/* Shimmer sweep */}
            {pct > 0 && !isFull && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.18) 50%, transparent 100%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer-sweep 2.2s infinite linear',
                borderRadius: 'inherit',
              }} />
            )}
          </div>
        )}

        {/* Shimmer for slot mode */}
        {showSlots && pct > 0 && !isFull && (
          <div style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.12) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer-sweep 2.2s infinite linear',
            borderRadius: barH / 2,
          }} />
        )}

        {/* Pulse at tip when active */}
        {pct > 0 && pct < 1 && (
          <div style={{
            position: 'absolute',
            left: `calc(${pct * 100}% - ${barH / 2}px)`,
            top: '50%', transform: 'translateY(-50%)',
            width: barH, height: barH,
            borderRadius: '50%',
            background: fillEnd,
            boxShadow: `0 0 0 0 ${glowColor}`,
            animation: 'ticket-pulse 1.8s infinite',
          }} />
        )}

        {/* Full marker */}
        {isFull && (
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(90deg, #c0392b, #e74c3c)',
            borderRadius: barH / 2,
            animation: 'full-glow 1.5s ease-in-out infinite alternate',
          }} />
        )}
      </div>

      {/* Bottom micro-info */}
      {showLabel && size !== 'sm' && (
        <div style={{
          display: 'flex', justifyContent: 'space-between', marginTop: '6px',
        }}>
          <span style={{ fontSize: '9px', color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {isFull ? 'Operación cerrada' : `${libre} plaza${libre === 1 ? '' : 's'} disponible${libre === 1 ? '' : 's'}`}
          </span>
          {total > 0 && (
            <span style={{ fontSize: '9px', color: 'var(--text-3)', letterSpacing: '0.05em' }}>
              {showSlots ? `${total} tickets` : `${total} plazas`}
            </span>
          )}
        </div>
      )}

      {/* CSS animations */}
      <style>{`
        @keyframes shimmer-sweep {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes ticket-pulse {
          0%   { box-shadow: 0 0 0 0 ${glowColor}; }
          70%  { box-shadow: 0 0 0 ${barH * 0.8}px transparent; }
          100% { box-shadow: 0 0 0 0 transparent; }
        }
        @keyframes full-glow {
          from { box-shadow: 0 0 6px rgba(192,57,43,0.4); }
          to   { box-shadow: 0 0 18px rgba(231,76,60,0.7); }
        }
      `}</style>
    </div>
  )
}
