'use client'

import { useEffect, useState, useRef } from 'react'

type Codigo = { id: string; codigo: string; comision_pct: number; max_usos: number | null; usos: number; activo: boolean; created_at: string; clientes: { nombre: string; apellidos: string; email: string } }
type Relacion = { id: string; created_at: string; codigo_usado: string; comision_pct: number; comision_importe: number; comision_pagada: boolean; referrer: { nombre: string; apellidos: string; email: string }; referred: { nombre: string; apellidos: string; email: string } }
type Cliente = { id: string; nombre: string; apellidos: string; email: string }

export default function ReferidosPage() {
  const [codigos, setCodigos] = useState<Codigo[]>([])
  const [relaciones, setRelaciones] = useState<Relacion[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [tab, setTab] = useState<'codigos' | 'relaciones'>('codigos')
  const [loading, setLoading] = useState(true)

  // Create code form
  const [showForm, setShowForm] = useState(false)
  const [clienteSearch, setClienteSearch] = useState('')
  const [clienteSelected, setClienteSelected] = useState<Cliente | null>(null)
  const [showDrop, setShowDrop] = useState(false)
  const [comisionPct, setComisionPct] = useState('5')
  const [maxUsos, setMaxUsos] = useState('')
  const [creating, setCreating] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  function load() {
    Promise.all([
      fetch('/api/backoffice/referidos').then(r => r.json()),
      fetch('/api/backoffice/referidos?tipo=relaciones').then(r => r.json()),
      fetch('/api/backoffice/clientes').then(r => r.json()),
    ]).then(([c, r, cl]) => {
      setCodigos(Array.isArray(c) ? c : [])
      setRelaciones(Array.isArray(r) ? r : [])
      setClientes(Array.isArray(cl) ? cl : [])
      setLoading(false)
    })
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    function h(e: MouseEvent) { if (dropRef.current && !dropRef.current.contains(e.target as Node)) setShowDrop(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filteredClientes = clientes.filter(c =>
    `${c.nombre} ${c.apellidos} ${c.email}`.toLowerCase().includes(clienteSearch.toLowerCase())
  ).slice(0, 8)

  async function createCodigo() {
    if (!clienteSelected) return
    setCreating(true)
    const res = await fetch('/api/backoffice/referidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente_id: clienteSelected.id, comision_pct: Number(comisionPct), max_usos: maxUsos ? Number(maxUsos) : null }),
    })
    if (res.ok) {
      setShowForm(false)
      setClienteSelected(null)
      setClienteSearch('')
      setComisionPct('5')
      setMaxUsos('')
      load()
    }
    setCreating(false)
  }

  async function toggleComisionPagada(r: Relacion) {
    await fetch('/api/backoffice/referidos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: r.id, comision_pagada: !r.comision_pagada }),
    })
    setRelaciones(prev => prev.map(x => x.id === r.id ? { ...x, comision_pagada: !x.comision_pagada } : x))
  }

  async function updateComisionImporte(r: Relacion, importe: number) {
    await fetch('/api/backoffice/referidos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: r.id, comision_importe: importe }),
    })
    setRelaciones(prev => prev.map(x => x.id === r.id ? { ...x, comision_importe: importe } : x))
  }

  async function deleteCodigo(id: string) {
    if (!confirm('¿Eliminar este código?')) return
    await fetch('/api/backoffice/referidos', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, tipo: 'codigo' }) })
    setCodigos(prev => prev.filter(c => c.id !== id))
  }

  const totalComisiones = relaciones.reduce((s, r) => s + (r.comision_importe || 0), 0)
  const pendientes = relaciones.filter(r => !r.comision_pagada && r.comision_importe > 0).reduce((s, r) => s + r.comision_importe, 0)

  return (
    <div style={{ padding: '2.5rem 3rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem' }}>
        <div>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.5rem' }}>Marketing</div>
          <h1 className="serif" style={{ fontSize: '2.2rem', fontWeight: 300, color: 'var(--text-0)' }}>Referidos</h1>
        </div>
        <button onClick={() => setShowForm(true)} style={{ background: 'var(--gold-200)', color: 'var(--bg-0)', border: 'none', padding: '10px 24px', borderRadius: 'var(--radius)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 600 }}>
          + Nuevo código
        </button>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '2.5rem' }}>
        {[
          { label: 'Códigos activos', value: codigos.filter(c => c.activo).length },
          { label: 'Referidos totales', value: relaciones.length },
          { label: 'Comisiones generadas', value: `${totalComisiones.toLocaleString('es-ES')}€` },
          { label: 'Comisiones pendientes', value: `${pendientes.toLocaleString('es-ES')}€`, color: pendientes > 0 ? 'var(--gold-100)' : '#6dc86d' },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem 1.75rem' }}>
            <div className="serif" style={{ fontSize: '1.8rem', fontWeight: 300, color: (s as any).color || 'var(--gold-100)' }}>{s.value}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem' }}>
        {(['codigos', 'relaciones'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '6px 18px', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius)', cursor: 'pointer', background: tab === t ? 'var(--gold-200)' : 'transparent', color: tab === t ? 'var(--bg-0)' : 'var(--text-2)' }}>
            {t === 'codigos' ? `Códigos (${codigos.length})` : `Relaciones (${relaciones.length})`}
          </button>
        ))}
      </div>

      {/* CODIGOS TAB */}
      {tab === 'codigos' && (
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--gold-border)' }}>
                {['Cliente', 'Código', 'Comisión', 'Usos', 'Máx. usos', 'Estado', ''].map(h => (
                  <th key={h} style={{ padding: '0.85rem 1.5rem', textAlign: 'left', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 400 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>Cargando…</td></tr>
              ) : codigos.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.85rem' }}>No hay códigos creados</td></tr>
              ) : codigos.map(c => (
                <tr key={c.id} style={{ borderBottom: '0.5px solid rgba(62,59,53,0.3)' }}>
                  <td style={{ padding: '0.85rem 1.5rem' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-0)', fontWeight: 500 }}>{c.clientes?.nombre} {c.clientes?.apellidos}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>{c.clientes?.email}</div>
                  </td>
                  <td style={{ padding: '0.85rem 1.5rem' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.95rem', color: 'var(--gold-100)', letterSpacing: '0.1em' }}>{c.codigo}</span>
                  </td>
                  <td style={{ padding: '0.85rem 1.5rem', fontSize: '0.88rem', color: 'var(--text-1)' }}>{c.comision_pct}%</td>
                  <td style={{ padding: '0.85rem 1.5rem', fontSize: '0.88rem', color: 'var(--text-1)' }}>{c.usos}</td>
                  <td style={{ padding: '0.85rem 1.5rem', fontSize: '0.88rem', color: 'var(--text-3)' }}>{c.max_usos ?? '∞'}</td>
                  <td style={{ padding: '0.85rem 1.5rem' }}>
                    <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: c.activo ? '#6dc86d' : 'var(--text-3)', border: `0.5px solid ${c.activo ? '#6dc86d' : 'rgba(62,59,53,0.5)'}`, padding: '2px 8px', borderRadius: 'var(--radius)' }}>{c.activo ? 'Activo' : 'Inactivo'}</span>
                  </td>
                  <td style={{ padding: '0.85rem 1.5rem' }}>
                    <button onClick={() => deleteCodigo(c.id)} style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '16px' }}>×</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* RELACIONES TAB */}
      {tab === 'relaciones' && (
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--gold-border)' }}>
                {['Referidor', 'Referido', 'Código usado', 'Comisión %', 'Comisión €', 'Pagada', ''].map(h => (
                  <th key={h} style={{ padding: '0.85rem 1.5rem', textAlign: 'left', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 400 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)' }}>Cargando…</td></tr>
              ) : relaciones.length === 0 ? (
                <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.85rem' }}>No hay relaciones de referido aún</td></tr>
              ) : relaciones.map(r => (
                <tr key={r.id} style={{ borderBottom: '0.5px solid rgba(62,59,53,0.3)' }}>
                  <td style={{ padding: '0.85rem 1.5rem' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-0)', fontWeight: 500 }}>{r.referrer?.nombre} {r.referrer?.apellidos}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{r.referrer?.email}</div>
                  </td>
                  <td style={{ padding: '0.85rem 1.5rem' }}>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-0)' }}>{r.referred?.nombre} {r.referred?.apellidos}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>{r.referred?.email}</div>
                  </td>
                  <td style={{ padding: '0.85rem 1.5rem' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: 'var(--gold-200)' }}>{r.codigo_usado}</span>
                  </td>
                  <td style={{ padding: '0.85rem 1.5rem', fontSize: '0.88rem', color: 'var(--text-1)' }}>{r.comision_pct}%</td>
                  <td style={{ padding: '0.85rem 1.5rem' }}>
                    <input
                      type="number"
                      defaultValue={r.comision_importe}
                      onBlur={e => updateComisionImporte(r, Number(e.target.value))}
                      style={{ width: '90px', background: 'var(--bg-0)', border: '0.5px solid var(--gold-border)', color: 'var(--gold-100)', padding: '4px 8px', borderRadius: 'var(--radius)', fontSize: '0.85rem' }}
                    />
                    <span style={{ marginLeft: '4px', fontSize: '0.8rem', color: 'var(--text-3)' }}>€</span>
                  </td>
                  <td style={{ padding: '0.85rem 1.5rem' }}>
                    <button onClick={() => toggleComisionPagada(r)} style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', padding: '4px 10px', borderRadius: 'var(--radius)', cursor: 'pointer', background: r.comision_pagada ? 'rgba(100,200,100,0.1)' : 'transparent', color: r.comision_pagada ? '#6dc86d' : 'var(--text-3)', border: `0.5px solid ${r.comision_pagada ? '#6dc86d' : 'rgba(62,59,53,0.5)'}` }}>
                      {r.comision_pagada ? '✓ Pagada' : 'Pendiente'}
                    </button>
                  </td>
                  <td style={{ padding: '0.85rem 1.5rem', fontSize: '0.75rem', color: 'var(--text-3)' }}>
                    {new Date(r.created_at).toLocaleDateString('es-ES')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crear código */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }} onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div style={{ background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '2.5rem', width: '480px', position: 'relative' }}>
            <button onClick={() => setShowForm(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'var(--text-2)', cursor: 'pointer', fontSize: '20px' }}>×</button>
            <h2 className="serif" style={{ fontSize: '1.6rem', fontWeight: 300, color: 'var(--text-0)', marginBottom: '1.75rem' }}>Crear código de referido</h2>

            {/* Buscar cliente */}
            <div ref={dropRef} style={{ position: 'relative', marginBottom: '1rem' }}>
              <label style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: '6px' }}>Asignar a cliente</label>
              <input
                value={clienteSelected ? `${clienteSelected.nombre} ${clienteSelected.apellidos}` : clienteSearch}
                onChange={e => { setClienteSearch(e.target.value); setClienteSelected(null); setShowDrop(true) }}
                onFocus={() => setShowDrop(true)}
                placeholder="Buscar por nombre o email…"
                autoComplete="off"
                style={{ width: '100%', background: 'var(--bg-0)', border: '0.5px solid var(--gold-border)', color: 'var(--text-0)', padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: '0.85rem', boxSizing: 'border-box' }}
              />
              {showDrop && !clienteSelected && filteredClientes.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', zIndex: 200, boxShadow: '0 8px 30px rgba(0,0,0,0.5)', marginTop: '4px' }}>
                  {filteredClientes.map(c => (
                    <button key={c.id} type="button" onClick={() => { setClienteSelected(c); setClienteSearch(''); setShowDrop(false) }}
                      style={{ width: '100%', textAlign: 'left', padding: '0.75rem 1rem', background: 'transparent', border: 'none', borderBottom: '0.5px solid rgba(62,59,53,0.3)', cursor: 'pointer', display: 'block' }}>
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

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <div>
                <label style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: '6px' }}>Comisión (%)</label>
                <input type="number" step="0.5" value={comisionPct} onChange={e => setComisionPct(e.target.value)} style={{ width: '100%', background: 'var(--bg-0)', border: '0.5px solid var(--gold-border)', color: 'var(--text-0)', padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: '0.85rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: '6px' }}>Máx. usos (vacío = ilimitado)</label>
                <input type="number" value={maxUsos} onChange={e => setMaxUsos(e.target.value)} placeholder="∞" style={{ width: '100%', background: 'var(--bg-0)', border: '0.5px solid var(--gold-border)', color: 'var(--text-0)', padding: '10px 14px', borderRadius: 'var(--radius)', fontSize: '0.85rem', boxSizing: 'border-box' }} />
              </div>
            </div>

            <button onClick={createCodigo} disabled={creating || !clienteSelected} style={{ width: '100%', background: clienteSelected ? 'var(--gold-200)' : 'rgba(201,160,67,0.3)', color: 'var(--bg-0)', border: 'none', padding: '12px', borderRadius: 'var(--radius)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: clienteSelected ? 'pointer' : 'not-allowed', fontWeight: 600 }}>
              {creating ? 'Creando…' : 'Generar código →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
