'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { downloadCSV, downloadExcel } from '@/lib/export'

type Participacion = {
  id: string; nombre_operacion: string; tipo: string; importe: number
  fecha_entrada: string; fecha_vencimiento: string
  rentabilidad_anual: number; rentabilidad_acum: number; estado: string
  clientes?: { nombre: string; apellidos: string; email: string }
  movimientos?: { id: string; tipo: string; importe: number; fecha: string }[]
}

const ESTADO_COLOR: Record<string, string> = { activa: '#6dc86d', finalizada: 'var(--text-3)', pendiente: 'var(--gold-200)', cancelada: '#e05' }

export default function ParticipacionesPage() {
  const [parts, setParts] = useState<Participacion[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetch('/api/backoffice/participaciones').then(r => r.json()).then(d => {
      setParts(Array.isArray(d) ? d : [])
      setLoading(false)
    })
  }, [])

  const filtered = filter === 'all' ? parts : parts.filter(p => p.estado === filter || p.tipo === filter)
  const totalCapital = parts.filter(p => p.estado !== 'cancelada').reduce((s, p) => s + p.importe, 0)
  const totalRent = parts.reduce((s, p) => s + (p.rentabilidad_acum ?? 0), 0)

  return (
    <div style={{ padding: '2.5rem 3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.5rem' }}>CRM</div>
          <h1 className="serif" style={{ fontSize: '2.2rem', fontWeight: 300, color: 'var(--text-0)' }}>Participaciones</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-export" onClick={() => downloadCSV(parts.map(p => ({ Cliente: p.clientes ? `${p.clientes.nombre} ${p.clientes.apellidos}` : '', Operación: p.nombre_operacion, Tipo: p.tipo, Capital: p.importe, 'Rentab. %': p.rentabilidad_anual, 'Rentab. acum.': p.rentabilidad_acum, Estado: p.estado, 'F. entrada': p.fecha_entrada, 'F. vto.': p.fecha_vencimiento ?? '' })), 'participaciones')}>CSV</button>
          <button className="btn-export-excel" onClick={() => downloadExcel(parts.map(p => ({ Cliente: p.clientes ? `${p.clientes.nombre} ${p.clientes.apellidos}` : '', Operación: p.nombre_operacion, Tipo: p.tipo, Capital: p.importe, 'Rentab. %': p.rentabilidad_anual, 'Rentab. acum.': p.rentabilidad_acum, Estado: p.estado, 'F. entrada': p.fecha_entrada, 'F. vto.': p.fecha_vencimiento ?? '' })), 'participaciones')}>Excel</button>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '2rem' }}>
        {[
          { label: 'Total participaciones', value: parts.length },
          { label: 'Capital gestionado', value: `${totalCapital.toLocaleString('es-ES')}€` },
          { label: 'Rentabilidad generada', value: `${totalRent.toLocaleString('es-ES')}€` },
        ].map(s => (
          <div key={s.label} style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem 2rem' }}>
            <div className="serif" style={{ fontSize: '2rem', color: 'var(--gold-100)', fontWeight: 300 }}>{s.value}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', marginTop: '4px' }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        {['all', 'activa', 'pendiente', 'finalizada', 'npl', 'crowdfunding'].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: '5px 14px', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase',
            border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius)', cursor: 'pointer',
            background: filter === f ? 'var(--gold-200)' : 'transparent',
            color: filter === f ? 'var(--bg-0)' : 'var(--text-2)',
          }}>{f === 'all' ? 'Todas' : f}</button>
        ))}
      </div>

      {loading ? <p style={{ color: 'var(--text-2)' }}>Cargando…</p> : (
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--gold-border)' }}>
                {['Cliente', 'Operación', 'Tipo', 'Importe', 'R.anual', 'R.acum', 'Estado', ''].map(h => (
                  <th key={h} style={{ padding: '0.85rem 1.25rem', textAlign: 'left', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => (
                <tr key={p.id} style={{ borderBottom: '0.5px solid rgba(62,59,53,0.4)' }}>
                  <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.82rem', color: 'var(--text-0)' }}>
                    {p.clientes ? `${p.clientes.nombre} ${p.clientes.apellidos}` : '—'}
                  </td>
                  <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-0)', fontWeight: 500 }}>{p.nombre_operacion}</td>
                  <td style={{ padding: '0.9rem 1.25rem' }}>
                    <span style={{ padding: '3px 7px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', border: '0.5px solid var(--gold-border)', color: 'var(--gold-200)', borderRadius: 'var(--radius)' }}>{p.tipo}</span>
                  </td>
                  <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.85rem', color: 'var(--text-1)', fontWeight: 500 }}>{p.importe.toLocaleString('es-ES')}€</td>
                  <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.82rem', color: 'var(--gold-200)' }}>{p.rentabilidad_anual}%</td>
                  <td style={{ padding: '0.9rem 1.25rem', fontSize: '0.82rem', color: '#6dc86d' }}>{(p.rentabilidad_acum ?? 0).toLocaleString('es-ES')}€</td>
                  <td style={{ padding: '0.9rem 1.25rem' }}>
                    <span style={{ fontSize: '10px', color: ESTADO_COLOR[p.estado] ?? 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{p.estado}</span>
                  </td>
                  <td style={{ padding: '0.9rem 1.25rem' }}>
                    {p.clientes && <Link href={`/backoffice/clientes/${(parts.find(x => x.id === p.id) as any)?.cliente_id ?? ''}`} style={{ fontSize: '11px', color: 'var(--gold-200)', textDecoration: 'none' }}>Ver →</Link>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.85rem' }}>No hay participaciones</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
