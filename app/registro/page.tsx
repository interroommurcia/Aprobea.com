'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default function RegistroPage() {
  const [form, setForm] = useState({ nombre: '', apellidos: '', email: '', telefono: '', tipo_inversor: 'crowdfunding', capital_inicial: '', password: '', codigo_referido: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')

    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })
    if (authError) { setError(authError.message); setLoading(false); return }

    // 2. Create client profile via admin API (bypasses RLS)
    const userId = authData.user?.id
    if (userId) {
      await fetch('/api/registro', {
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
    }
    setDone(true)
    setLoading(false)
  }

  if (done) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', maxWidth: '400px', padding: '2rem' }}>
        <div style={{ width: '64px', height: '64px', border: '1px solid var(--gold-200)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '24px', color: 'var(--gold-100)' }}>✓</div>
        <h2 className="serif" style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--text-0)', marginBottom: '1rem' }}>Registro completado</h2>
        <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', lineHeight: 1.7, marginBottom: '2rem' }}>
          Revisa tu email para confirmar tu cuenta. Un asesor de GrupoSkyLine se pondrá en contacto contigo en breve.
        </p>
        <Link href="/login" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-block', padding: '12px 32px' }}>Ir al login</Link>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border-strong)', borderRadius: 'var(--radius-lg)', padding: '3rem', width: '100%', maxWidth: '500px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2.5rem' }}>
          <Link href="/" style={{ textDecoration: 'none', display: 'block' }}>
            <img src="/logo.png" alt="Grupo SkyLine Investment" style={{ height: '56px', width: 'auto', display: 'block' }} />
          </Link>
        </div>
        <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.75rem' }}>Inversores</div>
        <h1 className="serif" style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--text-0)', marginBottom: '2rem' }}>Crear mi cuenta</h1>
        <form onSubmit={handleRegister}>
          <div className="form-row">
            <div className="form-group"><label className="form-label">Nombre</label><input className="form-input" required value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} /></div>
            <div className="form-group"><label className="form-label">Apellidos</label><input className="form-input" required value={form.apellidos} onChange={e => setForm(f => ({ ...f, apellidos: e.target.value }))} /></div>
          </div>
          <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Contraseña</label><input type="password" className="form-input" required minLength={6} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 6 caracteres" /></div>
          <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} placeholder="+34 600 000 000" /></div>
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
          <div className="form-group">
            <label className="form-label">Código de referido (opcional)</label>
            <input className="form-input" value={form.codigo_referido} onChange={e => setForm(f => ({ ...f, codigo_referido: e.target.value }))} placeholder="Ej: SL-ABC12" style={{ textTransform: 'uppercase' }} />
          </div>
          {error && <p style={{ color: '#e05', fontSize: '0.82rem', marginBottom: '1rem' }}>{error}</p>}
          <button type="submit" className="form-submit" disabled={loading}>{loading ? 'Registrando…' : 'Crear mi cuenta →'}</button>
          <p className="form-disclaimer">Al registrarte aceptas que GrupoSkyLine se ponga en contacto contigo. Tus datos están protegidos.</p>
        </form>
        <p style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-2)' }}>
          ¿Ya tienes cuenta? <Link href="/login" style={{ color: 'var(--gold-200)', textDecoration: 'none' }}>Acceder</Link>
        </p>
      </div>
    </div>
  )
}
