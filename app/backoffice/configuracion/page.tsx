'use client'

import { useEffect, useState } from 'react'

type Cliente = {
  id: string
  nombre: string
  apellidos: string
  email: string
  telefono: string
  tipo_inversor: string
  capital_inicial: number
  estado: string
  notas: string
  created_at: string
  user_id: string
}

const ESTADO_COLOR: Record<string, string> = {
  lead: 'var(--gold-200)',
  activo: '#6dc86d',
  inactivo: 'var(--text-3)',
  rechazado: '#e05',
}

const TIPO_COLOR: Record<string, string> = {
  npl: '#b87333',
  crowdfunding: 'var(--gold-200)',
}

export default function ConfiguracionPage() {
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Cliente | null>(null)
  const [editNotas, setEditNotas] = useState('')
  const [editEstado, setEditEstado] = useState('')
  const [editCapital, setEditCapital] = useState('')
  const [saving, setSaving] = useState(false)
  const [notifTitulo, setNotifTitulo] = useState('')
  const [notifMensaje, setNotifMensaje] = useState('')
  const [notifTipo, setNotifTipo] = useState('info')
  const [sendingNotif, setSendingNotif] = useState(false)
  const [notifOk, setNotifOk] = useState(false)

  useEffect(() => {
    fetch('/api/backoffice/clientes')
      .then(r => r.json())
      .then(data => { setClientes(Array.isArray(data) ? data : []); setLoading(false) })
  }, [])

  function openFicha(c: Cliente) {
    setSelected(c)
    setEditNotas(c.notas || '')
    setEditEstado(c.estado)
    setEditCapital(String(c.capital_inicial ?? 0))
    setNotifTitulo('')
    setNotifMensaje('')
    setNotifOk(false)
  }

  async function saveChanges() {
    if (!selected) return
    setSaving(true)
    await fetch('/api/backoffice/clientes', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selected.id, estado: editEstado, notas: editNotas, capital_inicial: Number(editCapital) }),
    })
    setClientes(prev => prev.map(c => c.id === selected.id ? { ...c, estado: editEstado, notas: editNotas, capital_inicial: Number(editCapital) } : c))
    setSelected(prev => prev ? { ...prev, estado: editEstado, notas: editNotas, capital_inicial: Number(editCapital) } : prev)
    setSaving(false)
  }

  async function sendNotif() {
    if (!selected || !notifTitulo || !notifMensaje) return
    setSendingNotif(true)
    await fetch('/api/backoffice/notificaciones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cliente_id: selected.id, titulo: notifTitulo, mensaje: notifMensaje, tipo: notifTipo }),
    })
    setNotifTitulo('')
    setNotifMensaje('')
    setNotifOk(true)
    setSendingNotif(false)
    setTimeout(() => setNotifOk(false), 3000)
  }

  if (loading) return <div style={{ padding: '3rem', color: 'var(--text-2)' }}>Cargando…</div>

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Lista clientes */}
      <div style={{ width: '300px', flexShrink: 0, borderRight: '0.5px solid var(--gold-border)', overflowY: 'auto', padding: '2rem 0' }}>
        <div style={{ padding: '0 1.5rem 1.5rem', borderBottom: '0.5px solid var(--gold-border)', marginBottom: '0.5rem' }}>
          <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)' }}>Fichas de clientes</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginTop: '4px' }}>{clientes.length} registrados</div>
        </div>
        {clientes.map(c => (
          <button
            key={c.id}
            onClick={() => openFicha(c)}
            style={{
              width: '100%', textAlign: 'left', padding: '1rem 1.5rem',
              background: selected?.id === c.id ? 'rgba(201,160,67,0.08)' : 'transparent',
              borderLeft: selected?.id === c.id ? '2px solid var(--gold-200)' : '2px solid transparent',
              border: 'none', cursor: 'pointer', display: 'block',
            }}
          >
            <div style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-0)' }}>{c.nombre} {c.apellidos}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '2px' }}>{c.email}</div>
            <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
              <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: ESTADO_COLOR[c.estado] ?? 'var(--text-3)', border: `0.5px solid ${ESTADO_COLOR[c.estado] ?? 'var(--gold-border)'}`, padding: '1px 6px', borderRadius: '3px' }}>{c.estado}</span>
              <span style={{ fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', color: TIPO_COLOR[c.tipo_inversor] ?? 'var(--text-3)', border: `0.5px solid ${TIPO_COLOR[c.tipo_inversor] ?? 'var(--gold-border)'}`, padding: '1px 6px', borderRadius: '3px' }}>{c.tipo_inversor}</span>
            </div>
          </button>
        ))}
      </div>

      {/* Ficha detalle */}
      {selected ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '2.5rem 3rem' }}>
          <div style={{ marginBottom: '2rem' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.5rem' }}>Ficha de cliente</div>
            <h1 className="serif" style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--text-0)' }}>{selected.nombre} {selected.apellidos}</h1>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-3)', marginTop: '4px' }}>Registrado el {new Date(selected.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          </div>

          {/* Info grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
            {[
              { label: 'Email', value: selected.email },
              { label: 'Teléfono', value: selected.telefono || '—' },
              { label: 'Tipo inversor', value: selected.tipo_inversor },
              { label: 'User ID vinculado', value: selected.user_id ? '✓ Cuenta activa' : '— Sin cuenta' },
            ].map(f => (
              <div key={f.label} style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem' }}>
                <div style={{ fontSize: '9px', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '6px' }}>{f.label}</div>
                <div style={{ fontSize: '0.88rem', color: 'var(--text-0)' }}>{f.value}</div>
              </div>
            ))}
          </div>

          {/* Editar */}
          <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1.75rem 2rem', marginBottom: '2rem' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '1.25rem' }}>Editar perfil</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: '6px' }}>Estado</label>
                <select value={editEstado} onChange={e => setEditEstado(e.target.value)} style={{ width: '100%', background: 'var(--bg-0)', border: '0.5px solid var(--gold-border)', color: 'var(--text-0)', padding: '8px 12px', borderRadius: 'var(--radius)', fontSize: '0.83rem' }}>
                  {['lead', 'activo', 'inactivo', 'rechazado'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: '6px' }}>Capital inicial (€)</label>
                <input type="number" value={editCapital} onChange={e => setEditCapital(e.target.value)} style={{ width: '100%', background: 'var(--bg-0)', border: '0.5px solid var(--gold-border)', color: 'var(--text-0)', padding: '8px 12px', borderRadius: 'var(--radius)', fontSize: '0.83rem', boxSizing: 'border-box' }} />
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: '6px' }}>Notas internas</label>
              <textarea value={editNotas} onChange={e => setEditNotas(e.target.value)} rows={3} style={{ width: '100%', background: 'var(--bg-0)', border: '0.5px solid var(--gold-border)', color: 'var(--text-0)', padding: '8px 12px', borderRadius: 'var(--radius)', fontSize: '0.83rem', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <button onClick={saveChanges} disabled={saving} style={{ background: 'var(--gold-200)', color: 'var(--bg-0)', border: 'none', padding: '10px 24px', borderRadius: 'var(--radius)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 600 }}>
              {saving ? 'Guardando…' : 'Guardar cambios'}
            </button>
          </div>

          {/* Enviar notificación */}
          <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1.75rem 2rem' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '1.25rem' }}>Enviar notificación</div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: '6px' }}>Título</label>
                <input value={notifTitulo} onChange={e => setNotifTitulo(e.target.value)} placeholder="Ej: Nueva operación disponible" style={{ width: '100%', background: 'var(--bg-0)', border: '0.5px solid var(--gold-border)', color: 'var(--text-0)', padding: '8px 12px', borderRadius: 'var(--radius)', fontSize: '0.83rem', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: '6px' }}>Tipo</label>
                <select value={notifTipo} onChange={e => setNotifTipo(e.target.value)} style={{ width: '100%', background: 'var(--bg-0)', border: '0.5px solid var(--gold-border)', color: 'var(--text-0)', padding: '8px 12px', borderRadius: 'var(--radius)', fontSize: '0.83rem' }}>
                  <option value="info">Info</option>
                  <option value="alerta">Alerta</option>
                  <option value="operacion">Operación</option>
                </select>
              </div>
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', display: 'block', marginBottom: '6px' }}>Mensaje</label>
              <textarea value={notifMensaje} onChange={e => setNotifMensaje(e.target.value)} rows={3} placeholder="Escribe el mensaje para el cliente…" style={{ width: '100%', background: 'var(--bg-0)', border: '0.5px solid var(--gold-border)', color: 'var(--text-0)', padding: '8px 12px', borderRadius: 'var(--radius)', fontSize: '0.83rem', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <button onClick={sendNotif} disabled={sendingNotif || !notifTitulo || !notifMensaje} style={{ background: 'transparent', color: 'var(--gold-200)', border: '0.5px solid var(--gold-border-strong)', padding: '10px 24px', borderRadius: 'var(--radius)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer' }}>
                {sendingNotif ? 'Enviando…' : 'Enviar notificación →'}
              </button>
              {notifOk && <span style={{ fontSize: '0.78rem', color: '#6dc86d' }}>✓ Notificación enviada</span>}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Selecciona un cliente para ver su ficha</p>
        </div>
      )}
    </div>
  )
}
