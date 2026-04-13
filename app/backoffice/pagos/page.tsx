'use client'

import { useEffect, useState } from 'react'

type Config = {
  precio_suscripcion_anual:    string
  precio_reserva_npl:          string
  precio_reserva_crowdfunding: string
  pagos_activos:               string
}

const DEFAULTS: Config = {
  precio_suscripcion_anual:    '29',
  precio_reserva_npl:          '1000',
  precio_reserva_crowdfunding: '100',
  pagos_activos:               'false',
}

export default function PagosPage() {
  const [cfg, setCfg]       = useState<Config>(DEFAULTS)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [saved, setSaved]     = useState(false)
  const [error, setError]     = useState('')

  const stripeConfigured = !!(
    process.env.NEXT_PUBLIC_STRIPE_CONFIGURED === 'true' ||
    (typeof window !== 'undefined' && (window as any).__stripeOk)
  )

  useEffect(() => {
    fetch('/api/backoffice/config')
      .then(r => r.json())
      .then(d => { setCfg({ ...DEFAULTS, ...d }); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  async function save() {
    setSaving(true); setError(''); setSaved(false)
    const res = await fetch('/api/backoffice/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cfg),
    })
    if (res.ok) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      const d = await res.json()
      setError(d.error ?? 'Error al guardar')
    }
    setSaving(false)
  }

  const togglePagos = () =>
    setCfg(c => ({ ...c, pagos_activos: c.pagos_activos === 'true' ? 'false' : 'true' }))

  const pagosActivos = cfg.pagos_activos === 'true'

  if (loading) return (
    <div style={{ padding: '2.5rem 3rem', color: 'var(--text-3)', fontSize: '0.85rem' }}>Cargando…</div>
  )

  return (
    <div style={{ padding: '2.5rem 3rem', maxWidth: '780px' }}>

      {/* Cabecera */}
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.5rem' }}>Backoffice</div>
        <h1 className="serif" style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--text-0)' }}>Pagos y precios</h1>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', marginTop: '4px' }}>
          Configura los precios de suscripción y reservas. Los cambios se aplican en el siguiente pago.
        </p>
      </div>

      {/* Estado Stripe */}
      <div className="bo-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(99,91,255,0.12)', border: '1px solid rgba(99,91,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" stroke="#635bff" strokeWidth="1.5"/>
              <path d="M8 12.5c0-1.5 1.5-2.5 3-2s2.5 1.5 2 3-1.5 2-3 1.5" stroke="#635bff" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-0)' }}>Stripe</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '1px' }}>
              Procesador de pagos · Europa
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{
            fontSize: '11px', padding: '4px 10px', borderRadius: '20px',
            background: 'rgba(201,160,67,0.1)', color: 'var(--gold-200)',
            border: '1px solid rgba(201,160,67,0.25)',
          }}>
            ⚠ Pendiente de claves
          </span>
          <a
            href="https://dashboard.stripe.com/apikeys"
            target="_blank" rel="noopener noreferrer"
            className="bo-btn bo-btn-ghost bo-btn-sm"
            style={{ textDecoration: 'none' }}
          >
            Ver claves ↗
          </a>
        </div>
      </div>

      {/* .env reminder */}
      <div style={{ background: 'rgba(201,160,67,0.05)', border: '1px solid rgba(201,160,67,0.2)', borderRadius: '12px', padding: '1rem 1.25rem', marginBottom: '2rem', fontSize: '0.78rem', color: 'var(--text-2)', lineHeight: 1.65 }}>
        <div style={{ fontWeight: 600, color: 'var(--gold-200)', marginBottom: '6px' }}>Añade estas claves al archivo <code style={{ background: 'rgba(255,255,255,0.07)', padding: '1px 6px', borderRadius: '4px', fontFamily: 'monospace' }}>.env.local</code></div>
        <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'var(--text-3)', lineHeight: 2 }}>
          <div>STRIPE_SECRET_KEY=<span style={{ color: 'var(--gold-100)' }}>sk_live_…</span></div>
          <div>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<span style={{ color: 'var(--gold-100)' }}>pk_live_…</span></div>
          <div>STRIPE_WEBHOOK_SECRET=<span style={{ color: 'var(--gold-100)' }}>whsec_…</span></div>
          <div>NEXT_PUBLIC_APP_URL=<span style={{ color: 'var(--gold-100)' }}>https://gruposkyline.org</span></div>
        </div>
      </div>

      {/* Activar/desactivar pagos */}
      <div className="bo-card" style={{ padding: '1.25rem 1.5rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-0)', marginBottom: '2px' }}>Activar cobros</div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>
            Los botones de pago aparecerán en el marketplace y en el registro
          </div>
        </div>
        <button
          onClick={togglePagos}
          style={{
            width: '44px', height: '24px', borderRadius: '12px', border: 'none', cursor: 'pointer',
            background: pagosActivos ? 'var(--gold-200)' : 'rgba(255,255,255,0.1)',
            position: 'relative', transition: 'background 0.2s', flexShrink: 0,
          }}
        >
          <span style={{
            position: 'absolute', top: '3px',
            left: pagosActivos ? '23px' : '3px',
            width: '18px', height: '18px', borderRadius: '50%',
            background: pagosActivos ? '#060709' : 'rgba(255,255,255,0.4)',
            transition: 'left 0.2s',
          }} />
        </button>
      </div>

      {/* ── Precios ── */}
      <div className="bo-section-title" style={{ marginBottom: '1rem' }}>Precios</div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>

        {/* Suscripción anual */}
        <div className="bo-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '14px' }}>🔑</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-0)' }}>Suscripción anual de inversor</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
                Acceso completo a la plataforma, marketplace y documentos. Se cobra una vez al año.
              </div>
              <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className="bo-badge bo-status-active" style={{ fontSize: '9px' }}>Recurrente · Anual</span>
                <span className="bo-badge" style={{ fontSize: '9px', color: 'rgba(99,91,255,0.9)', borderColor: 'rgba(99,91,255,0.3)' }}>Stripe Subscriptions</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <input
                type="number"
                min="1" max="9999" step="1"
                value={cfg.precio_suscripcion_anual}
                onChange={e => setCfg(c => ({ ...c, precio_suscripcion_anual: e.target.value }))}
                className="bo-input"
                style={{ width: '100px', textAlign: 'right', fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold-200)' }}
              />
              <span style={{ fontSize: '0.875rem', color: 'var(--text-3)', fontWeight: 500 }}>€ / año</span>
            </div>
          </div>
        </div>

        {/* Reserva NPL */}
        <div className="bo-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '14px', color: '#b87333' }}>◈</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-0)' }}>Reserva de ticket · NPL</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
                Importe mínimo por ticket en operaciones de cartera NPL. Pago único por operación.
              </div>
              <div style={{ marginTop: '8px' }}>
                <span className="bo-badge" style={{ fontSize: '9px', color: '#b87333', borderColor: 'rgba(184,115,51,0.3)' }}>NPL · Pago único</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <input
                type="number"
                min="1" max="999999" step="100"
                value={cfg.precio_reserva_npl}
                onChange={e => setCfg(c => ({ ...c, precio_reserva_npl: e.target.value }))}
                className="bo-input"
                style={{ width: '120px', textAlign: 'right', fontSize: '1.1rem', fontWeight: 700, color: '#b87333' }}
              />
              <span style={{ fontSize: '0.875rem', color: 'var(--text-3)', fontWeight: 500 }}>€</span>
            </div>
          </div>
        </div>

        {/* Reserva Crowdfunding */}
        <div className="bo-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '14px', color: 'var(--gold-200)' }}>◎</span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-0)' }}>Reserva de ticket · Crowdfunding</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', lineHeight: 1.5 }}>
                Importe mínimo por ticket en operaciones de crowdfunding inmobiliario.
              </div>
              <div style={{ marginTop: '8px' }}>
                <span className="bo-badge" style={{ fontSize: '9px' }}>Crowdfunding · Pago único</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
              <input
                type="number"
                min="1" max="999999" step="100"
                value={cfg.precio_reserva_crowdfunding}
                onChange={e => setCfg(c => ({ ...c, precio_reserva_crowdfunding: e.target.value }))}
                className="bo-input"
                style={{ width: '120px', textAlign: 'right', fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold-200)' }}
              />
              <span style={{ fontSize: '0.875rem', color: 'var(--text-3)', fontWeight: 500 }}>€</span>
            </div>
          </div>
        </div>
      </div>

      {/* Preview de lo que ven los inversores */}
      <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '12px', padding: '1.25rem 1.5rem', marginBottom: '2rem' }}>
        <div style={{ fontSize: '9px', color: 'var(--text-3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>Vista previa para el inversor</div>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Acceso anual', price: `${cfg.precio_suscripcion_anual}€/año`, color: 'rgba(99,91,255,0.9)' },
            { label: 'Ticket NPL', price: `${cfg.precio_reserva_npl}€`, color: '#b87333' },
            { label: 'Ticket Crowdfunding', price: `${cfg.precio_reserva_crowdfunding}€`, color: 'var(--gold-200)' },
          ].map(item => (
            <div key={item.label} style={{
              background: 'var(--bg-0)', borderRadius: '10px', padding: '12px 16px',
              border: '1px solid rgba(255,255,255,0.06)', minWidth: '140px',
            }}>
              <div style={{ fontSize: '9px', color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>{item.label}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 700, color: item.color, fontFamily: "'Outfit',sans-serif" }}>{item.price}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Guardar */}
      {error && (
        <p style={{ fontSize: '0.8rem', color: '#e05', marginBottom: '1rem', background: 'rgba(238,0,85,0.07)', border: '1px solid rgba(238,0,85,0.2)', borderRadius: '10px', padding: '10px 14px' }}>
          {error}
        </p>
      )}

      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        <button onClick={save} disabled={saving} className="bo-btn bo-btn-primary">
          {saving ? 'Guardando…' : 'Guardar configuración'}
        </button>
        {saved && (
          <span style={{ fontSize: '0.78rem', color: '#6dc86d', display: 'flex', alignItems: 'center', gap: '5px' }}>
            ✓ Guardado correctamente
          </span>
        )}
      </div>

      {/* SQL helper */}
      <details style={{ marginTop: '2.5rem' }}>
        <summary style={{ fontSize: '0.78rem', color: 'var(--text-3)', cursor: 'pointer', userSelect: 'none' }}>
          ▸ SQL necesario en Supabase (ejecutar una vez)
        </summary>
        <pre style={{
          marginTop: '0.75rem', background: 'var(--bg-0)', borderRadius: '8px',
          padding: '1rem', fontSize: '11px', color: 'var(--gold-100)',
          border: '1px solid rgba(255,255,255,0.06)', overflowX: 'auto',
          fontFamily: 'monospace', lineHeight: 1.7,
        }}>{`CREATE TABLE IF NOT EXISTS configuracion (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO configuracion (key, value) VALUES
  ('precio_suscripcion_anual',    '29'),
  ('precio_reserva_npl',          '1000'),
  ('precio_reserva_crowdfunding', '100'),
  ('pagos_activos',               'false')
ON CONFLICT (key) DO NOTHING;

-- Columna en clientes para rastrear suscripción
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS suscripcion_activa BOOLEAN DEFAULT false;

-- Columna en participaciones para rastrear pago Stripe
ALTER TABLE participaciones
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
  ADD COLUMN IF NOT EXISTS importe NUMERIC(14,2);`}
        </pre>
      </details>
    </div>
  )
}
