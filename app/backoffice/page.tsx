'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function BackofficeLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/backoffice/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    if (res.ok) {
      router.push('/backoffice/dashboard')
    } else {
      setError('Credenciales incorrectas')
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border-strong)', borderRadius: 'var(--radius-lg)', padding: '3rem', width: '100%', maxWidth: '420px' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <span className="serif" style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--gold-100)' }}>Aprobea</span>
          <span style={{ fontSize: '10px', color: 'var(--text-3)', marginLeft: '2px' }}>.com</span>
        </div>
        <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.75rem' }}>
          Panel de administración
        </div>
        <h1 className="serif" style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--text-0)', marginBottom: '2rem' }}>
          Acceso privado
        </h1>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@aprobea.com"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input
              type="password"
              className="form-input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••••"
              required
            />
          </div>
          {error && <p style={{ color: '#e05', fontSize: '0.82rem', marginBottom: '1rem' }}>{error}</p>}
          <button type="submit" className="form-submit" disabled={loading} style={{ marginTop: '0.5rem' }}>
            {loading ? 'Verificando…' : 'Entrar al panel →'}
          </button>
        </form>
      </div>
    </div>
  )
}
