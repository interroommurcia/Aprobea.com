'use client'

import { useEffect, useState, useRef } from 'react'
import { downloadCSV, downloadExcel } from '@/lib/export'

type Apunte = { id: string; concepto: string; tipo: 'ingreso' | 'gasto'; importe: number; fecha: string; categoria: string; notas: string }
type Cliente = { id: string; nombre: string; apellidos: string; email: string }

const CATEGORIAS = ['Comisiones', 'Gestión', 'Marketing', 'Legal', 'Operaciones', 'Dividendos', 'Otro']
const TIPOS_PART = ['npl', 'crowdfunding']

export default function ContabilidadPage() {
  const [apuntes, setApuntes] = useState<Apunte[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'all' | 'ingreso' | 'gasto'>('all')
  const [saving, setSaving] = useState(false)

  // Form fields
  const [form, setForm] = useState({ concepto: '', tipo: 'ingreso', importe: '', fecha: '', categoria: 'Comisiones', notas: '' })

  // Vinculación a cliente
  const [vincular, setVincular] = useState(false)
  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteSelected, setClienteSelected] = useState<Cliente | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)
  const [partForm, setPartForm] = useState({ nombre_operacion: '', tipo: 'crowdfunding', rentabilidad_anual: '', fecha_vencimiento: '' })
  const dropRef = useRef<HTMLDivElement>(null)

  const load = () => {
    Promise.all([
      fetch('/api/backoffice/contabilidad').then(r => r.json()),
      fetch('/api/backoffice/clientes').then(r => r.json()),
    ]).then(([d, c]) => {
      setApuntes(Array.isArray(d) ? d : [])
      setClientes(Array.isArray(c) ? c : [])
      setLoading(false)
    })
  }
  useEffect(load, [])

  // Close dropdown on outside click
  useEffect(() => {
    function h(e: MouseEvent) { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDropdown(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filteredClientes = clientes.filter(c =>
    `${c.nombre} ${c.apellidos} ${c.email}`.toLowerCase().includes(clienteSearch.toLowerCase())
  ).slice(0, 8)

  function resetForm() {
    setForm({ concepto: '', tipo: 'ingreso', importe: '', fecha: '', categoria: 'Comisiones', notas: '' })
    setVincular(false)
    setClienteSearch('')
    setClienteSelected(null)
    setPartForm({ nombre_operacion: '', tipo: 'crowdfunding', rentabilidad_anual: '', fecha_vencimiento: '' })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    // 1. Create accounting entry
    await fetch('/api/backoffice/contabilidad', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, importe: Number(form.importe) }),
    })

    // 2. If linked to client, create participación
    if (vincular && clienteSelected) {
      await fetch('/api/backoffice/participaciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: clienteSelected.id,
          tipo: partForm.tipo,
          nombre_operacion: partForm.nombre_operacion || form.concepto,
          importe: Number(form.importe),
          fecha_entrada: form.fecha,
          fecha_vencimiento: partForm.fecha_vencimiento || null,
          rentabilidad_anual: Number(partForm.rentabilidad_anual) || 0,
          rentabilidad_acum: 0,
          estado: 'activa',
        }),
      })
    }

    setSaving(false)
    setShowForm(false)
    resetForm()
    load()
  }

  async function handleDelete(id: string) {
    if (!confirm('¿Eliminar este apunte?')) return
    await fetch('/api/backoffice/contabilidad', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    load()
  }

  const filtered = filter === 'all' ? apuntes : apuntes.filter(a => a.tipo === filter)
  const ingresos = apuntes.filter(a => a.tipo === 'ingreso').reduce((s, a) => s + a.importe, 0)
  const gastos = apuntes.filter(a => a.tipo === 'gasto').reduce((s, a) => s + a.importe, 0)
  const balance = ingresos - gastos

  return (
    <div style={{ padding: '2.5rem 3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
        <div>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.5rem' }}>Finanzas</div>
          <h1 className="serif" style={{ fontSize: '2.2rem', fontWeight: 300, color: 'var(--text-0)' }}>Contabilidad</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button className="btn-export" onClick={() => downloadCSV(apuntes.map(a => ({ Fecha: a.fecha, Concepto: a.concepto, Tipo: a.tipo, Categoría: a.categoria, Importe: a.importe, Notas: a.notas ?? '' })), 'contabilidad')}>CSV</button>
          <button className="btn-export-excel" onClick={() => downloadExcel(apuntes.map(a => ({ Fecha: a.fecha, Concepto: a.concepto, Tipo: a.tipo, Categoría: a.categoria, Importe: a.importe, Notas: a.notas ?? '' })), 'contabilidad')}>Excel</button>
          <button className="btn-primary" style={{ padding: '10px 24px', fontSize: '11px' }} onClick={() => setShowForm(true)}>+ Nuevo apunte</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid rgba(100,200,100,0.3)', borderRadius: 'var(--radius-lg)', padding: '1.75rem 2rem' }}>
          <div className="serif" style={{ fontSize: '2rem', color: '#6dc86d', fontWeight: 300 }}>+{ingresos.toLocaleString('es-ES')}€</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', marginTop: '4px' }}>Ingresos totales</div>
        </div>
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid rgba(220,80,80,0.3)', borderRadius: 'var(--radius-lg)', padding: '1.75rem 2rem' }}>
          <div className="serif" style={{ fontSize: '2rem', color: '#e05', fontWeight: 300 }}>-{gastos.toLocaleString('es-ES')}€</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', marginTop: '4px' }}>Gastos totales</div>
        </div>
        <div style={{ background: 'var(--bg-2)', border: `0.5px solid ${balance >= 0 ? 'var(--gold-border-strong)' : 'rgba(220,80,80,0.3)'}`, borderRadius: 'var(--radius-lg)', padding: '1.75rem 2rem' }}>
          <div className="serif" style={{ fontSize: '2rem', color: balance >= 0 ? 'var(--gold-100)' : '#e05', fontWeight: 300 }}>{balance >= 0 ? '+' : ''}{balance.toLocaleString('es-ES')}€</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', marginTop: '4px' }}>Balance neto</div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
        {(['all', 'ingreso', 'gasto'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '5px 14px', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase',
            border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius)', cursor: 'pointer',
            background: filter === f ? 'var(--gold-200)' : 'transparent',
            color: filter === f ? 'var(--bg-0)' : 'var(--text-2)',
          }}>{f === 'all' ? 'Todos' : f === 'ingreso' ? 'Ingresos' : 'Gastos'}</button>
        ))}
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="modal-overlay active" onClick={e => { if (e.target === e.currentTarget) { setShowForm(false); resetForm() } }}>
          <div className="modal" style={{ maxWidth: '580px', maxHeight: '90vh', overflowY: 'auto' }}>
            <button className="modal-close" onClick={() => { setShowForm(false); resetForm() }}>×</button>
            <h2 className="modal-title serif">Nuevo apunte contable</h2>
            <form onSubmit={handleCreate}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tipo</label>
                  <select className="form-input" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                    <option value="ingreso">Ingreso</option>
                    <option value="gasto">Gasto</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Categoría</label>
                  <select className="form-input" value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                    {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Concepto</label>
                <input className="form-input" required value={form.concepto} onChange={e => setForm(f => ({ ...f, concepto: e.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Importe (€)</label>
                  <input type="number" step="0.01" className="form-input" required value={form.importe} onChange={e => setForm(f => ({ ...f, importe: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha</label>
                  <input type="date" className="form-input" required value={form.fecha} onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Notas</label>
                <input className="form-input" value={form.notas} onChange={e => setForm(f => ({ ...f, notas: e.target.value }))} />
              </div>

              {/* Vincular a cliente */}
              <div style={{ margin: '1.5rem 0 0', borderTop: '0.5px solid var(--gold-border)', paddingTop: '1.25rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginBottom: '1rem' }}>
                  <input type="checkbox" checked={vincular} onChange={e => setVincular(e.target.checked)} style={{ accentColor: 'var(--gold-200)', width: '16px', height: '16px' }} />
                  <span style={{ fontSize: '0.83rem', color: 'var(--text-1)' }}>Vincular a un cliente y crear participación</span>
                </label>

                {vincular && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {/* Buscador cliente */}
                    <div className="form-group" ref={dropRef} style={{ position: 'relative' }}>
                      <label className="form-label">Buscar cliente</label>
                      <input
                        className="form-input"
                        placeholder="Nombre, apellidos o email…"
                        value={clienteSelected ? `${clienteSelected.nombre} ${clienteSelected.apellidos}` : clienteSearch}
                        onChange={e => { setClienteSearch(e.target.value); setClienteSelected(null); setShowDropdown(true) }}
                        onFocus={() => setShowDropdown(true)}
                        autoComplete="off"
                      />
                      {showDropdown && filteredClientes.length > 0 && !clienteSelected && (
                        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', zIndex: 100, boxShadow: '0 8px 30px rgba(0,0,0,0.4)', marginTop: '4px', overflow: 'hidden' }}>
                          {filteredClientes.map(c => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => { setClienteSelected(c); setClienteSearch(''); setShowDropdown(false) }}
                              style={{ width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: '0.5px solid rgba(62,59,53,0.3)', display: 'block' }}
                            >
                              <div style={{ fontSize: '0.85rem', color: 'var(--text-0)', fontWeight: 500 }}>{c.nombre} {c.apellidos}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{c.email}</div>
                            </button>
                          ))}
                        </div>
                      )}
                      {clienteSelected && (
                        <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: 'rgba(201,160,67,0.08)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius)' }}>
                          <span style={{ fontSize: '0.82rem', color: 'var(--gold-100)', flex: 1 }}>✓ {clienteSelected.nombre} {clienteSelected.apellidos}</span>
                          <button type="button" onClick={() => { setClienteSelected(null); setClienteSearch('') }} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '14px' }}>×</button>
                        </div>
                      )}
                    </div>

                    {/* Datos de la participación */}
                    <div className="form-group">
                      <label className="form-label">Nombre de la operación</label>
                      <input
                        className="form-input"
                        placeholder={form.concepto || 'Nombre de la participación…'}
                        value={partForm.nombre_operacion}
                        onChange={e => setPartForm(p => ({ ...p, nombre_operacion: e.target.value }))}
                      />
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">Tipo operación</label>
                        <select className="form-input" value={partForm.tipo} onChange={e => setPartForm(p => ({ ...p, tipo: e.target.value }))}>
                          {TIPOS_PART.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Rentabilidad anual (%)</label>
                        <input type="number" step="0.1" className="form-input" placeholder="0" value={partForm.rentabilidad_anual} onChange={e => setPartForm(p => ({ ...p, rentabilidad_anual: e.target.value }))} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="form-label">Fecha vencimiento (opcional)</label>
                      <input type="date" className="form-input" value={partForm.fecha_vencimiento} onChange={e => setPartForm(p => ({ ...p, fecha_vencimiento: e.target.value }))} />
                    </div>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '-0.5rem' }}>
                      El importe ({form.importe || '0'}€) y la fecha ({form.fecha || '—'}) se tomarán del apunte contable.
                    </p>
                  </div>
                )}
              </div>

              <button type="submit" className="form-submit" disabled={saving} style={{ marginTop: '1.5rem' }}>
                {saving ? 'Guardando…' : vincular && clienteSelected ? 'Registrar apunte y crear participación →' : 'Registrar apunte →'}
              </button>
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
                {['Fecha', 'Concepto', 'Categoría', 'Tipo', 'Importe', ''].map(h => (
                  <th key={h} style={{ padding: '0.85rem 1.5rem', textAlign: 'left', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(a => (
                <tr key={a.id} style={{ borderBottom: '0.5px solid rgba(62,59,53,0.4)' }}>
                  <td style={{ padding: '0.9rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-2)' }}>{a.fecha}</td>
                  <td style={{ padding: '0.9rem 1.5rem', fontSize: '0.85rem', color: 'var(--text-0)', fontWeight: 500 }}>{a.concepto}</td>
                  <td style={{ padding: '0.9rem 1.5rem', fontSize: '0.8rem', color: 'var(--text-2)' }}>{a.categoria}</td>
                  <td style={{ padding: '0.9rem 1.5rem' }}>
                    <span style={{ padding: '3px 8px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', borderRadius: 'var(--radius)', background: a.tipo === 'ingreso' ? 'rgba(100,200,100,0.1)' : 'rgba(220,80,80,0.1)', color: a.tipo === 'ingreso' ? '#6dc86d' : '#e05', border: `0.5px solid ${a.tipo === 'ingreso' ? 'rgba(100,200,100,0.3)' : 'rgba(220,80,80,0.3)'}` }}>
                      {a.tipo}
                    </span>
                  </td>
                  <td style={{ padding: '0.9rem 1.5rem', fontSize: '0.9rem', fontWeight: 500, color: a.tipo === 'ingreso' ? '#6dc86d' : '#e05' }}>
                    {a.tipo === 'ingreso' ? '+' : '-'}{a.importe.toLocaleString('es-ES')}€
                  </td>
                  <td style={{ padding: '0.9rem 1.5rem' }}>
                    <button onClick={() => handleDelete(a.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '16px' }}>×</button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.85rem' }}>No hay apuntes</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
