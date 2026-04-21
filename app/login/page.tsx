'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError('Email o contraseña incorrectos')
      setLoading(false)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border-strong)', borderRadius: 'var(--radius-lg)', padding: '3rem', width: '100%', maxWidth: '420px' }}>
        <a href="/" style={{ textDecoration: 'none', display: 'inline-block', marginBottom: '2.5rem' }}>
          <span className="serif" style={{ fontSize: '1.6rem', fontWeight: 300, color: 'var(--gold-100)' }}>Aprobea</span>
          <span style={{ fontSize: '10px', color: 'var(--text-3)', marginLeft: '2px' }}>.com</span>
        </a>
        <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.5rem' }}>
          Acceder a tu cuenta
        </div>
        <h1 className="serif" style={{ fontSize: '1.8rem', fontWeight: 300, color: 'var(--text-0)', marginBottom: '2rem' }}>Iniciar sesión</h1>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="tu@email.com" required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {error && <p style={{ color: '#e05', fontSize: '0.82rem', marginBottom: '1rem' }}>{error}</p>}
          <button type="submit" className="form-submit" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Entrando…' : 'Entrar →'}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>¿No tienes cuenta? </span>
          <a href="/" style={{ fontSize: '0.82rem', color: 'var(--gold-200)', textDecoration: 'none' }}>Regístrate gratis →</a>
        </div>
      </div>
    </div>
  )
}
