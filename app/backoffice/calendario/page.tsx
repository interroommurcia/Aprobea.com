'use client'

import { useEffect, useState } from 'react'
import Calendario, { EventoCalendario } from '@/components/Calendario'

export default function BackofficeCalendarioPage() {
  const [eventos, setEventos] = useState<EventoCalendario[]>([])
  const [loading, setLoading] = useState(true)
  const [clienteId, setClienteId] = useState('')
  const [clientes, setClientes] = useState<{ id: string; nombre: string; apellidos: string }[]>([])

  const load = async (cid?: string) => {
    setLoading(true)
    const url = cid ? `/api/backoffice/calendario?cliente_id=${cid}` : '/api/backoffice/calendario'
    const data = await fetch(url).then(r => r.json())
    setEventos(Array.isArray(data) ? data : [])
    setLoading(false)
  }

  useEffect(() => {
    fetch('/api/backoffice/clientes').then(r => r.json()).then(d => {
      setClientes(Array.isArray(d) ? d.map((c: any) => ({ id: c.id, nombre: c.nombre, apellidos: c.apellidos })) : [])
    })
    load()
  }, [])

  async function handleAdd(ev: Omit<EventoCalendario, 'id'>) {
    await fetch('/api/backoffice/calendario', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...ev, cliente_id: clienteId || undefined }),
    })
    load(clienteId || undefined)
  }

  async function handleDelete(id: string) {
    await fetch('/api/backoffice/calendario', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    load(clienteId || undefined)
  }

  return (
    <div style={{ padding: '2.5rem 3rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.5rem' }}>Agenda</div>
          <h1 className="serif" style={{ fontSize: '2.2rem', fontWeight: 300, color: 'var(--text-0)' }}>Calendario</h1>
        </div>

        {/* Filtro por cliente */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <label style={{ fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Filtrar por cliente</label>
          <select
            className="form-input" style={{ width: '220px' }}
            value={clienteId}
            onChange={e => { setClienteId(e.target.value); load(e.target.value || undefined) }}
          >
            <option value="">Todos los clientes</option>
            {clientes.map(c => (
              <option key={c.id} value={c.id}>{c.nombre} {c.apellidos}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <p style={{ color: 'var(--text-2)' }}>Cargando…</p>
      ) : (
        <Calendario
          eventos={eventos}
          onAddEvento={handleAdd}
          onDeleteEvento={handleDelete}
          isAdmin={true}
        />
      )}
    </div>
  )
}
