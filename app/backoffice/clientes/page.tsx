'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { downloadCSV, downloadExcel } from '@/lib/export'

type Cliente = {
  id: string; nombre: string; apellidos: string; email: string; telefono: string;
  tipo_inversor: string; capital_inicial: number; estado: string; created_at: string;
  membresia_crowdfunding_activa?: boolean; membresia_gratis?: boolean; membresia_expira_en?: string;
  participaciones?: { id: string; importe: number; estado: string }[]
}

const ESTADO_COLORS: Record<string, string> = {
  activo: '#6dc86d', lead: 'var(--gold-200)', inactivo: 'var(--text-3)', rechazado: '#e05'
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ nombre: '', apellidos: '', email: '', telefono: '', tipo_inversor: 'crowdfunding', capital_inicial: '', estado: 'lead', notas: '' })
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  const load = () => {
    setLoading(true)
    fetch('/api/backoffice/clientes').then(r => r.json()).then(d => { setClientes(Array.isArray(d) ? d : []); setLoading(false) })
  }
  useEffect(load, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await fetch('/api/backoffice/clientes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, capital_inicial: Number(form.capital_inicial) }) })
    setSaving(false); setShowForm(false); setForm({ nombre: '', apellidos: '', email: '', telefono: '', tipo_inversor: 'crowdfunding', capital_inicial: '', estado: 'lead', notas: '' }); load()
  }

  async function handleEstado(id: string, estado: string) {
    await fetch('/api/backoffice/clientes', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, estado }) })
    load()
  }

  async function toggleMembresia(id: string, gratis: boolean) {
    await fetch('/api/backoffice/clientes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, membresia_gratis: gratis, membresia_crowdfunding_activa: gratis }),
    })
    load()
  }

  const filtered = clientes.filter(c =>
    `${c.nombre} ${c.apellidos} ${c.email}`.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ padding: '2.5rem 3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
        <div>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.5rem' }}>CRM</div>
          <h1 className="serif" style={{ fontSize: '2.2rem', fontWeight: 300, color: 'var(--text-0)' }}>Clientes</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn-export" onClick={() => downloadCSV(clientes.map(c => ({ Nombre: `${c.nombre} ${c.apellidos}`, Email: c.email, Teléfono: c.telefono, Tipo: c.tipo_inversor, Capital: c.capital_inicial, Estado: c.estado, Alta: c.created_at.slice(0, 10) })), 'clientes')}>CSV</button>
          <button className="btn-export-excel" onClick={() => downloadExcel(clientes.map(c => ({ Nombre: `${c.nombre} ${c.apellidos}`, Email: c.email, Teléfono: c.telefono, Tipo: c.tipo_inversor, Capital: c.capital_inicial, Estado: c.estado, Alta: c.created_at.slice(0, 10) })), 'clientes')}>Excel</button>
          <button className="btn-primary" style={{ padding: '10px 24px', fontSize: '11px' }} onClick={() => setShowForm(true)}>
            + Nuevo cliente
          </button>
        </div>
      </div>

      {/* Search */}
      <input
        className="form-input" style={{ maxWidth: '340px', marginBottom: '1.5rem' }}
        placeholder="Buscar por nombre o email…"
        value={search} onChange={e => setSearch(e.target.value)}
      />

      {/* Form modal */}
      {showForm && (
        <div className="modal-overlay active" onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div className="modal">
            <button className="modal-close" onClick={() => setShowForm(false)}>×</button>
            <h2 className="modal-title serif">Nuevo cliente</h2>
            <p className="modal-sub">Registrar un cliente en el CRM</p>
            <form onSubmit={handleCreate}>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Nombre</label><input className="form-input" required value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} /></div>
                <div className="form-group"><label className="form-label">Apellidos</label><input className="form-input" required value={form.apellidos} onChange={e => setForm(f => ({ ...f, apellidos: e.target.value }))} /></div>
              </div>
              <div className="form-group"><label className="form-label">Email</label><input type="email" className="form-input" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Teléfono</label><input className="form-input" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} /></div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tipo inversor</label>
                  <select className="form-input" value={form.tipo_inversor} onChange={e => setForm(f => ({ ...f, tipo_inversor: e.target.value }))}>
                    <option value="crowdfunding">Crowdfunding</option>
                    <option value="npl">NPL</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Capital inicial (€)</label>
                  <input type="number" className="form-input" value={form.capital_inicial} onChange={e => setForm(f => ({ ...f, capital_inicial: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Estado</label>
                <select className="form-input" value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value }))}>
                  <option value="lead">Lead</option><option value="activo">Activo</option><option value="inactivo">Inactivo</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">Notas</label><input className="form-input" value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} /></div>
              <button type="submit" className="form-submit" disabled={saving}>{saving ? 'Guardando…' : 'Crear cliente →'}</button>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? <p style={{ color: 'var(--text-2)' }}>Cargando…</p> : (
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--gold-border)' }}>
                {['Nombre', 'Email', 'Tipo', 'Capital', 'Estado', 'Membresía CF', 'Participaciones', ''].map(h => (
                  <th key={h} style={{ padding: '0.85rem 1.5rem', textAlign: 'left', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(c => (
                <tr key={c.id} style={{ borderBottom: '0.5px solid rgba(62,59,53,0.4)' }}>
                  <td style={{ padding: '0.9rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-0)', fontWeight: 500 }}>{c.nombre} {c.apellidos}</td>
                  <td style={{ padding: '0.9rem 1.5rem', fontSize: '0.82rem', color: 'var(--text-2)' }}>{c.email}</td>
                  <td style={{ padding: '0.9rem 1.5rem' }}>
                    <span style={{ padding: '3px 8px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', border: '0.5px solid var(--gold-border)', color: 'var(--gold-200)', borderRadius: 'var(--radius)' }}>{c.tipo_inversor}</span>
                  </td>
                  <td style={{ padding: '0.9rem 1.5rem', fontSize: '0.82rem', color: 'var(--text-1)' }}>{c.capital_inicial?.toLocaleString('es-ES')}€</td>
                  <td style={{ padding: '0.9rem 1.5rem' }}>
                    <select
                      value={c.estado}
                      onChange={e => handleEstado(c.id, e.target.value)}
                      style={{ background: 'transparent', border: 'none', fontSize: '12px', color: ESTADO_COLORS[c.estado] ?? 'var(--text-2)', cursor: 'pointer', outline: 'none' }}
                    >
                      <option value="lead">Lead</option><option value="activo">Activo</option><option value="inactivo">Inactivo</option><option value="rechazado">Rechazado</option>
                    </select>
                  </td>
                  <td style={{ padding: '0.9rem 1.5rem' }}>
                    {/* Badge estado membresía + toggle acceso gratis */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{
                        padding: '2px 7px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em',
                        borderRadius: 'var(--radius)', fontWeight: 600,
                        background: (c.membresia_crowdfunding_activa || c.membresia_gratis) ? 'rgba(109,200,109,0.12)' : 'rgba(255,255,255,0.04)',
                        color: (c.membresia_crowdfunding_activa || c.membresia_gratis) ? '#6dc86d' : 'var(--text-3)',
                        border: `0.5px solid ${(c.membresia_crowdfunding_activa || c.membresia_gratis) ? '#6dc86d44' : 'var(--gold-border)'}`,
                      }}>
                        {c.membresia_gratis ? '★ Gratis' : c.membresia_crowdfunding_activa ? '✓ Activa' : 'Sin membresía'}
                      </span>
                      {c.membresia_expira_en && !c.membresia_gratis && (
                        <span style={{ fontSize: '9px', color: 'var(--text-3)' }}>
                          Vence {new Date(c.membresia_expira_en).toLocaleDateString('es-ES')}
                        </span>
                      )}
                      <button
                        onClick={() => toggleMembresia(c.id, !c.membresia_gratis)}
                        style={{
                          marginTop: '2px', padding: '2px 7px', fontSize: '9px', cursor: 'pointer',
                          background: 'transparent', borderRadius: 'var(--radius)', letterSpacing: '0.08em',
                          border: '0.5px solid var(--gold-border)', color: 'var(--gold-200)',
                        }}
                      >
                        {c.membresia_gratis ? 'Quitar acceso gratis' : 'Dar acceso gratis'}
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: '0.9rem 1.5rem', fontSize: '0.82rem', color: 'var(--text-2)' }}>{c.participaciones?.length ?? 0}</td>
                  <td style={{ padding: '0.9rem 1.5rem' }}>
                    <Link href={`/backoffice/clientes/${c.id}`} style={{ fontSize: '11px', color: 'var(--gold-200)', textDecoration: 'none', letterSpacing: '0.08em' }}>Ver →</Link>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.85rem' }}>No hay clientes</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
