'use client'

import { useEffect, useState } from 'react'

type Cliente = { id: string; nombre: string; apellidos: string; estado: string; participaciones?: { importe: number; estado: string }[] }
type Movimiento = { importe: number; tipo: string }

export default function BackofficeDashboard() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [participaciones, setParticipaciones] = useState<{ importe: number; rentabilidad_acum: number; estado: string }[]>([])
  const [contabilidad, setContabilidad] = useState<{ tipo: string; importe: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/backoffice/clientes').then(r => r.json()),
      fetch('/api/backoffice/participaciones').then(r => r.json()),
      fetch('/api/backoffice/contabilidad').then(r => r.json()),
    ]).then(([c, p, cont]) => {
      setClientes(Array.isArray(c) ? c : [])
      setParticipaciones(Array.isArray(p) ? p : [])
      setContabilidad(Array.isArray(cont) ? cont : [])
      setLoading(false)
    })
  }, [])

  const totalInvertido = participaciones.filter(p => p.estado !== 'cancelada').reduce((s, p) => s + (p.importe || 0), 0)
  const totalRentabilidad = participaciones.reduce((s, p) => s + (p.rentabilidad_acum || 0), 0)
  const ingresos = contabilidad.filter(c => c.tipo === 'ingreso').reduce((s, c) => s + c.importe, 0)
  const gastos = contabilidad.filter(c => c.tipo === 'gasto').reduce((s, c) => s + c.importe, 0)

  const stats = [
    { label: 'Clientes totales', value: clientes.length, suffix: '' },
    { label: 'Clientes activos', value: clientes.filter(c => c.estado === 'activo').length, suffix: '' },
    { label: 'Capital gestionado', value: `${(totalInvertido / 1000).toFixed(0)}K`, suffix: '€' },
    { label: 'Rentabilidad generada', value: `${(totalRentabilidad / 1000).toFixed(1)}K`, suffix: '€' },
    { label: 'Ingresos empresa', value: `${(ingresos / 1000).toFixed(1)}K`, suffix: '€' },
    { label: 'Balance empresa', value: `${((ingresos - gastos) / 1000).toFixed(1)}K`, suffix: '€' },
  ]

  return (
    <div style={{ padding: '2.5rem 3rem' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.5rem' }}>
          Resumen general
        </div>
        <h1 className="serif" style={{ fontSize: '2.5rem', fontWeight: 300, color: 'var(--text-0)' }}>Dashboard</h1>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-2)' }}>Cargando datos…</p>
      ) : (
        <>
          {/* Stats grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '3rem' }}>
            {stats.map(s => (
              <div key={s.label} style={{
                background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)',
                borderRadius: 'var(--radius-lg)', padding: '1.75rem 2rem',
              }}>
                <div className="serif" style={{ fontSize: '2.2rem', fontWeight: 300, color: 'var(--gold-100)' }}>
                  {s.value}{s.suffix}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', marginTop: '4px', letterSpacing: '0.05em' }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Recent clients */}
          <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '1.5rem 2rem', borderBottom: '0.5px solid var(--gold-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 500, color: 'var(--text-0)' }}>Últimos clientes</span>
              <a href="/backoffice/clientes" style={{ fontSize: '11px', color: 'var(--gold-200)', letterSpacing: '0.1em', textTransform: 'uppercase', textDecoration: 'none' }}>Ver todos →</a>
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid var(--gold-border)' }}>
                  {['Nombre', 'Estado', 'Participaciones'].map(h => (
                    <th key={h} style={{ padding: '0.75rem 2rem', textAlign: 'left', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clientes.slice(0, 8).map(c => (
                  <tr key={c.id} style={{ borderBottom: '0.5px solid rgba(62,59,53,0.4)' }}>
                    <td style={{ padding: '0.9rem 2rem', fontSize: '0.85rem', color: 'var(--text-0)' }}>{c.nombre} {c.apellidos}</td>
                    <td style={{ padding: '0.9rem 2rem' }}>
                      <span style={{
                        padding: '3px 8px', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase',
                        borderRadius: 'var(--radius)',
                        background: c.estado === 'activo' ? 'rgba(100,200,100,0.1)' : c.estado === 'lead' ? 'rgba(201,160,67,0.1)' : 'rgba(255,255,255,0.05)',
                        color: c.estado === 'activo' ? '#6dc86d' : c.estado === 'lead' ? 'var(--gold-200)' : 'var(--text-3)',
                        border: `0.5px solid ${c.estado === 'activo' ? 'rgba(100,200,100,0.3)' : c.estado === 'lead' ? 'var(--gold-border)' : 'var(--text-3)'}`,
                      }}>
                        {c.estado}
                      </span>
                    </td>
                    <td style={{ padding: '0.9rem 2rem', fontSize: '0.82rem', color: 'var(--text-2)' }}>
                      {c.participaciones?.length ?? 0}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
