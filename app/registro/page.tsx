'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

const COMUNIDADES = [
  'Andalucía', 'Aragón', 'Asturias', 'Islas Baleares', 'Canarias',
  'Cantabria', 'Castilla-La Mancha', 'Castilla y León', 'Cataluña',
  'Comunitat Valenciana', 'Extremadura', 'Galicia', 'La Rioja',
  'Madrid', 'Murcia', 'Navarra', 'País Vasco',
]

const CAPITAL_OPCIONES = [
  { label: 'Hasta 10.000 €',       value: 10000 },
  { label: '10.000 € – 50.000 €',  value: 50000 },
  { label: '50.000 € – 150.000 €', value: 150000 },
  { label: '150.000 € – 500.000 €',value: 500000 },
  { label: 'Más de 500.000 €',     value: 1000000 },
]

export default function RegistroPage() {
  const [step, setStep] = useState<1 | 2>(1)
  const [form, setForm] = useState({
    nombre: '', apellidos: '', email: '', telefono: '',
    tipo_inversor: 'crowdfunding', capital_inicial: '', password: '', codigo_referido: '',
  })

  // Leer plan desde URL (?plan=gratuito)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const plan = params.get('plan')
    if (plan === 'gratuito') setForm(f => ({ ...f, tipo_inversor: 'gratuito' }))
  }, [])
  const [prefs, setPrefs] = useState({
    comunidades: [] as string[],
    capital: 0,
    acepta_emails: false,
  })
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  function toggleComunidad(c: string) {
    setPrefs(p => ({
      ...p,
      comunidades: p.comunidades.includes(c)
        ? p.comunidades.filter(x => x !== c)
        : [...p.comunidades, c],
    }))
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })
    if (authError) { setError(authError.message); setLoading(false); return }

    const userId = authData.user?.id
    if (userId) {
      const res = await fetch('/api/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          nombre: form.nombre,
          apellidos: form.apellidos,
          email: form.email,
          telefono: form.telefono,
          tipo_inversor: form.tipo_inversor,
          capital_inicial: Number(form.capital_inicial) || 0,
          codigo_referido: form.codigo_referido || null,
        }),
      })
      if (!res.ok) { setError('Error al crear el perfil.'); setLoading(false); return }
    }

    // Guardar token para el paso 2
    const { data: { session } } = await supabase.auth.getSession()
    setToken(session?.access_token ?? '')
    setStep(2)
    setLoading(false)
  }

  async function handlePrefs(omitir = false) {
    setLoading(true)
    if (!omitir && token) {
      await fetch('/api/registro/preferencias', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          comunidades_interes: prefs.comunidades,
          capital_disponible: prefs.capital,
          acepta_emails: prefs.acepta_emails,
        }),
      })
    }
    setDone(true)
    setLoading(false)
  }

  // ── DONE ────────────────────────────────────────────────────────────────────
  if (done) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: '420px', padding: '2rem' }}>
        <div style={{ width: '72px', height: '72px', background: 'linear-gradient(135deg,#C9A043,#a07828)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '28px', boxShadow: '0 8px 32px rgba(201,160,67,0.35)' }}>✓</div>
        <h2 className="serif" style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--text-0)', marginBottom: '1rem' }}>¡Cuenta creada!</h2>
        <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '2rem' }}>
          Revisa tu email para confirmar tu cuenta.<br />
          Un asesor de GrupoSkyLine se pondrá en contacto contigo en breve.
        </p>
        <Link href="/login" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block', padding: '12px 32px' }}>
          Ir al login →
        </Link>
      </div>
    </div>
  )

  // ── STEP 2: PREFERENCIAS ────────────────────────────────────────────────────
  if (step === 2) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border-strong)', borderRadius: 'var(--radius-lg)', padding: '3rem', width: '100%', maxWidth: '580px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <img src="/logo.png" alt="GrupoSkyLine" style={{ height: '48px', width: 'auto' }} />
          </Link>
        </div>

        <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.5rem' }}>Paso 2 de 2</div>
        <h2 className="serif" style={{ fontSize: '1.8rem', fontWeight: 300, color: 'var(--text-0)', marginBottom: '0.5rem' }}>Personaliza tu experiencia</h2>
        <p style={{ color: 'var(--text-3)', fontSize: '13px', marginBottom: '2rem', lineHeight: 1.6 }}>
          Así te avisamos cuando publiquemos oportunidades que encajen con tus criterios.
        </p>

        {/* Comunidades */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '0.75rem', letterSpacing: '0.04em' }}>
            📍 ¿En qué comunidades te interesa invertir?
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', marginBottom: '0.75rem' }}>
            Selecciona las que quieras (puedes dejar todas para recibir todo)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
            {COMUNIDADES.map(c => {
              const sel = prefs.comunidades.includes(c)
              return (
                <button key={c} type="button" onClick={() => toggleComunidad(c)}
                  style={{
                    padding: '5px 14px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s',
                    background: sel ? 'linear-gradient(135deg,#C9A043,#a07828)' : 'var(--bg-3)',
                    color: sel ? '#0a0a0a' : 'var(--text-2)',
                    border: sel ? 'none' : '0.5px solid var(--gold-border)',
                    fontWeight: sel ? 600 : 400,
                  }}>
                  {c}
                </button>
              )
            })}
          </div>
        </div>

        {/* Capital disponible */}
        <div style={{ marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '0.75rem', letterSpacing: '0.04em' }}>
            💰 Capital disponible para invertir
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
            {CAPITAL_OPCIONES.map(opt => {
              const sel = prefs.capital === opt.value
              return (
                <button key={opt.value} type="button"
                  onClick={() => setPrefs(p => ({ ...p, capital: sel ? 0 : opt.value }))}
                  style={{
                    padding: '6px 16px', borderRadius: '20px', fontSize: '12px', cursor: 'pointer', transition: 'all 0.15s',
                    background: sel ? 'linear-gradient(135deg,#C9A043,#a07828)' : 'var(--bg-3)',
                    color: sel ? '#0a0a0a' : 'var(--text-2)',
                    border: sel ? 'none' : '0.5px solid var(--gold-border)',
                    fontWeight: sel ? 600 : 400,
                  }}>
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Acepta emails */}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', marginBottom: '2rem', padding: '1rem', background: 'var(--bg-3)', borderRadius: '12px', border: `0.5px solid ${prefs.acepta_emails ? 'rgba(201,160,67,0.4)' : 'var(--gold-border)'}` }}>
          <div style={{ position: 'relative', flexShrink: 0, marginTop: '2px' }}>
            <input type="checkbox" checked={prefs.acepta_emails} onChange={e => setPrefs(p => ({ ...p, acepta_emails: e.target.checked }))}
              style={{ opacity: 0, position: 'absolute', width: '100%', height: '100%', cursor: 'pointer' }} />
            <div style={{
              width: '20px', height: '20px', borderRadius: '6px', border: `1.5px solid ${prefs.acepta_emails ? '#C9A043' : 'rgba(255,255,255,0.2)'}`,
              background: prefs.acepta_emails ? '#C9A043' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
            }}>
              {prefs.acepta_emails && <span style={{ color: '#0a0a0a', fontSize: '12px', fontWeight: 700 }}>✓</span>}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-0)', marginBottom: '3px' }}>
              ✉️ Quiero recibir alertas por email
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.55 }}>
              Te avisamos por email cuando publiquemos oportunidades que encajen con tus criterios de búsqueda. Sin spam, solo oportunidades reales.
            </div>
          </div>
        </label>

        {/* Botones */}
        <div style={{ display: 'flex', gap: '10px', flexDirection: 'column' }}>
          <button onClick={() => handlePrefs(false)} disabled={loading}
            style={{ padding: '13px', borderRadius: '12px', background: 'linear-gradient(135deg,#C9A043,#a07828)', border: 'none', color: '#0a0a0a', fontSize: '13px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}>
            {loading ? 'Guardando…' : 'Guardar preferencias →'}
          </button>
          <button onClick={() => handlePrefs(true)} disabled={loading}
            style={{ padding: '10px', borderRadius: '12px', background: 'transparent', border: '0.5px solid var(--gold-border)', color: 'var(--text-3)', fontSize: '12px', cursor: 'pointer' }}>
            Omitir por ahora
          </button>
        </div>
      </div>
    </div>
  )

  // ── STEP 1: REGISTRO ────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border-strong)', borderRadius: 'var(--radius-lg)', padding: '3rem', width: '100%', maxWidth: '500px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2.5rem' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'block' }}>
            <img src="/logo.png" alt="Grupo SkyLine Investment" style={{ height: '56px', width: 'auto', display: 'block' }} />
          </Link>
        </div>
        <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.35rem' }}>Paso 1 de 2 · Inversores</div>
        <h1 className="serif" style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--text-0)', marginBottom: '2rem' }}>Crear mi cuenta</h1>
        <form onSubmit={handleRegister}>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Nombre</label><input className="form-input" required value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Apellidos</label><input className="form-input" required value={form.apellidos} onChange={e => setForm(f => ({ ...f, apellidos: e.target.value }))} /></div>
          </div>
          <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Contraseña</label><input type="password" className="form-input" required minLength={6} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 6 caracteres" /></div>
          <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} placeholder="+34 600 000 000" /></div>
          {form.tipo_inversor === 'gratuito' ? (
            <div className="form-group" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '0.85rem 1rem', marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '4px' }}>Plan seleccionado</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '13px', color: 'var(--text-0)', fontWeight: 500 }}>✦ Cuenta Gratuita</span>
                <button type="button" onClick={() => setForm(f => ({ ...f, tipo_inversor: 'crowdfunding' }))}
                  style={{ fontSize: '10px', color: 'var(--gold-200)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                  Cambiar plan
                </button>
              </div>
            </div>
          ) : (
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Tipo de inversión</label>
                <select className="form-input" value={form.tipo_inversor} onChange={e => setForm(f => ({ ...f, tipo_inversor: e.target.value }))}>
                  <option value="crowdfunding">Crowdfunding</option>
                  <option value="npl">NPL</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Capital inicial (€)</label>
                <input type="number" className="form-input" value={form.capital_inicial} onChange={e => setForm(f => ({ ...f, capital_inicial: e.target.value }))} placeholder="0" />
              </div>
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Código de referido (opcional)</label>
            <input className="form-input" value={form.codigo_referido} onChange={e => setForm(f => ({ ...f, codigo_referido: e.target.value }))} placeholder="Ej: SL-ABC12" style={{ textTransform: 'uppercase' }} />
          </div>
          {error && <p style={{ color: '#e05', fontSize: '0.82rem', marginBottom: '1rem' }}>{error}</p>}
          <button type="submit" className="form-submit" disabled={loading}>{loading ? 'Registrando…' : 'Continuar →'}</button>
          <p className="form-disclaimer">Al registrarte aceptas que GrupoSkyLine se ponga en contacto contigo. Tus datos están protegidos.</p>
        </form>
        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-2)' }}>
          ¿Ya tienes cuenta? <Link href="/login" style={{ color: 'var(--gold-200)', textDecoration: 'none' }}>Acceder</Link>
        </p>
      </div>
    </div>
  )
}
