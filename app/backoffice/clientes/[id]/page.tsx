'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type Movimiento = { id: string; tipo: string; importe: number; fecha: string; descripcion: string; confirmado: boolean }
type Participacion = {
  id: string; nombre_operacion: string; tipo: string; importe: number
  fecha_entrada: string; fecha_vencimiento: string; rentabilidad_anual: number
  rentabilidad_acum: number; estado: string; movimientos?: Movimiento[]
}
type AuthUser = {
  created_at: string | null
  last_sign_in_at: string | null
  email_confirmed_at: string | null
  phone: string | null
  user_metadata: Record<string, unknown>
}
type Cliente = {
  id: string; nombre: string; apellidos: string; email: string; telefono: string
  tipo_inversor: string; capital_inicial: number; estado: string; notas: string
  created_at: string; user_id: string | null
  authUser?: AuthUser | null
}

const TIPO_COLORS: Record<string, string> = { npl: '#b87333', crowdfunding: 'var(--gold-200)' }
const ESTADO_MAP: Record<string, { label: string; cls: string }> = {
  activo:    { label: 'Activo',    cls: 'bo-status-active' },
  lead:      { label: 'Lead',      cls: 'bo-status-pending' },
  inactivo:  { label: 'Inactivo',  cls: 'bo-status-dim' },
  rechazado: { label: 'Rechazado', cls: 'bo-status-closed' },
}
const MOV_COLOR: Record<string, string> = {
  entrada: '#6dc86d', interes: '#C9A043', dividendo: '#C9A043',
  salida: '#ee0055', comision: '#ee0055',
}

function fmt(date: string | null | undefined) {
  if (!date) return '—'
  return new Date(date).toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtDate(date: string | null | undefined) {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ClienteDetalle() {
  const { id } = useParams<{ id: string }>()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [parts, setParts] = useState<Participacion[]>([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Cliente>>({})
  const [saving, setSaving] = useState(false)
  const [saveOk, setSaveOk] = useState(false)

  // Participacion / movimiento forms
  const [showPartForm, setShowPartForm] = useState(false)
  const [showMovForm, setShowMovForm] = useState<string | null>(null)
  const [partForm, setPartForm] = useState({ tipo: 'crowdfunding', nombre_operacion: '', importe: '', fecha_entrada: '', fecha_vencimiento: '', rentabilidad_anual: '', estado: 'activa' })
  const [movForm, setMovForm] = useState({ tipo: 'entrada', importe: '', fecha: '', descripcion: '' })
  const [savingForm, setSavingForm] = useState(false)

  const load = () => {
    Promise.all([
      fetch(`/api/backoffice/clientes/${id}`).then(r => r.json()),
      fetch(`/api/backoffice/participaciones?cliente_id=${id}`).then(r => r.json()),
    ]).then(([c, ps]) => {
      setCliente(c.error ? null : c)
      setParts(Array.isArray(ps) ? ps : [])
      setLoading(false)
    })
  }
  useEffect(load, [id])

  function startEdit() {
    if (!cliente) return
    setEditForm({
      nombre: cliente.nombre, apellidos: cliente.apellidos,
      email: cliente.email, telefono: cliente.telefono,
      tipo_inversor: cliente.tipo_inversor,
      capital_inicial: cliente.capital_inicial,
      estado: cliente.estado, notas: cliente.notas,
    })
    setEditMode(true)
  }

  async function saveEdit() {
    setSaving(true)
    const res = await fetch(`/api/backoffice/clientes/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    if (res.ok) {
      const updated = await res.json()
      setCliente(prev => prev ? { ...prev, ...updated } : null)
      setEditMode(false)
      setSaveOk(true)
      setTimeout(() => setSaveOk(false), 2500)
    }
    setSaving(false)
  }

  async function createParticipacion(e: React.FormEvent) {
    e.preventDefault(); setSavingForm(true)
    await fetch('/api/backoffice/participaciones', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...partForm, cliente_id: id, importe: Number(partForm.importe), rentabilidad_anual: Number(partForm.rentabilidad_anual) }),
    })
    setSavingForm(false); setShowPartForm(false); load()
  }

  async function createMovimiento(e: React.FormEvent, participacion_id: string) {
    e.preventDefault(); setSavingForm(true)
    await fetch('/api/backoffice/movimientos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...movForm, participacion_id, cliente_id: id, importe: Number(movForm.importe) }),
    })
    setSavingForm(false); setShowMovForm(null); load()
  }

  const totalInvertido = parts.filter(p => p.estado !== 'cancelada').reduce((s, p) => s + p.importe, 0)
  const totalRentabilidad = parts.reduce((s, p) => s + (p.rentabilidad_acum ?? 0), 0)

  if (loading) return <div style={{ padding: '3rem', color: 'var(--text-2)', fontSize: '0.85rem' }}>Cargando…</div>
  if (!cliente) return <div style={{ padding: '3rem', color: 'var(--text-2)', fontSize: '0.85rem' }}>Cliente no encontrado</div>

  const initials = `${cliente.nombre?.[0] ?? ''}${cliente.apellidos?.[0] ?? ''}`.toUpperCase()
  const estadoInfo = ESTADO_MAP[cliente.estado] ?? { label: cliente.estado, cls: 'bo-status-dim' }

  return (
    <div style={{ padding: '2.5rem 3rem', maxWidth: '1100px' }}>

      {/* ── Breadcrumb + Header ── */}
      <div style={{ marginBottom: '2rem' }}>
        <a href="/backoffice/clientes" style={{ fontSize: '11px', color: 'var(--gold-200)', textDecoration: 'none', letterSpacing: '0.1em', textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
          ← Clientes
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', marginTop: '1rem' }}>
          {/* Avatar */}
          <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--gold-muted)', border: '1.5px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-cormorant)', fontSize: '1.4rem', color: 'var(--gold-100)', flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <h1 className="serif" style={{ fontSize: '1.9rem', fontWeight: 300, color: 'var(--text-0)', margin: 0 }}>
                {cliente.nombre} {cliente.apellidos}
              </h1>
              <span className={`bo-badge ${estadoInfo.cls}`}>{estadoInfo.label}</span>
              {cliente.authUser?.email_confirmed_at && (
                <span className="bo-badge bo-status-active" style={{ fontSize: '8px' }}>✓ Email verificado</span>
              )}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-2)', marginTop: '4px', display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
              <span>{cliente.email}</span>
              {cliente.telefono && <span>· {cliente.telefono}</span>}
              <span style={{ color: 'var(--text-3)' }}>Registrado {fmtDate(cliente.created_at)}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            {saveOk && <span style={{ fontSize: '11px', color: '#6dc86d', alignSelf: 'center' }}>✓ Guardado</span>}
            {editMode ? (
              <>
                <button onClick={() => setEditMode(false)} className="bo-btn bo-btn-neutral bo-btn-sm">Cancelar</button>
                <button onClick={saveEdit} disabled={saving} className="bo-btn bo-btn-primary bo-btn-sm">
                  {saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </>
            ) : (
              <button onClick={startEdit} className="bo-btn bo-btn-ghost bo-btn-sm">✏ Editar ficha</button>
            )}
          </div>
        </div>
      </div>

      {/* ── KPI Stats ── */}
      <div className="rsp-grid-4" style={{ marginBottom: '2rem' }}>
        {[
          { label: 'Capital inicial', value: `${(cliente.capital_inicial ?? 0).toLocaleString('es-ES')} €`, sub: 'declarado al registro' },
          { label: 'Total invertido', value: `${totalInvertido.toLocaleString('es-ES')} €`, sub: 'participaciones activas' },
          { label: 'Rentabilidad acum.', value: `${totalRentabilidad.toLocaleString('es-ES')} €`, sub: 'todas las participaciones' },
          { label: 'Participaciones', value: parts.length, sub: `${parts.filter(p => p.estado === 'activa').length} activas` },
        ].map(s => (
          <div key={s.label} className="bo-stat">
            <div className="bo-stat-value">{s.value}</div>
            <div className="bo-stat-label">{s.label}</div>
            <div style={{ fontSize: '9px', color: 'var(--text-3)', marginTop: '2px' }}>{s.sub}</div>
          </div>
        ))}
      </div>

      {/* ── Two-column info layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>

        {/* Datos personales */}
        <div className="bo-card-flat" style={{ padding: '1.5rem' }}>
          <div className="bo-section-title">Datos personales</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {editMode ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div><label className="bo-label">Nombre</label><input className="bo-input" value={editForm.nombre ?? ''} onChange={e => setEditForm(f => ({ ...f, nombre: e.target.value }))} /></div>
                  <div><label className="bo-label">Apellidos</label><input className="bo-input" value={editForm.apellidos ?? ''} onChange={e => setEditForm(f => ({ ...f, apellidos: e.target.value }))} /></div>
                </div>
                <div><label className="bo-label">Email</label><input type="email" className="bo-input" value={editForm.email ?? ''} onChange={e => setEditForm(f => ({ ...f, email: e.target.value }))} /></div>
                <div><label className="bo-label">Teléfono</label><input className="bo-input" value={editForm.telefono ?? ''} onChange={e => setEditForm(f => ({ ...f, telefono: e.target.value }))} /></div>
              </>
            ) : (
              <>
                <InfoRow label="Nombre completo" value={`${cliente.nombre} ${cliente.apellidos}`} />
                <InfoRow label="Email" value={cliente.email} />
                <InfoRow label="Teléfono" value={cliente.telefono || '—'} />
                <InfoRow label="Fecha de registro" value={fmtDate(cliente.created_at)} />
              </>
            )}
          </div>
        </div>

        {/* Perfil inversor */}
        <div className="bo-card-flat" style={{ padding: '1.5rem' }}>
          <div className="bo-section-title">Perfil inversor</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
            {editMode ? (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="bo-label">Tipo de inversión</label>
                    <select className="bo-input" value={editForm.tipo_inversor ?? ''} onChange={e => setEditForm(f => ({ ...f, tipo_inversor: e.target.value }))}>
                      <option value="crowdfunding">Crowdfunding</option>
                      <option value="npl">NPL</option>
                      <option value="hipotecario">Hipotecario</option>
                    </select>
                  </div>
                  <div>
                    <label className="bo-label">Capital inicial (€)</label>
                    <input type="number" className="bo-input" value={editForm.capital_inicial ?? ''} onChange={e => setEditForm(f => ({ ...f, capital_inicial: Number(e.target.value) }))} />
                  </div>
                </div>
                <div>
                  <label className="bo-label">Estado</label>
                  <select className="bo-input" value={editForm.estado ?? ''} onChange={e => setEditForm(f => ({ ...f, estado: e.target.value }))}>
                    <option value="lead">Lead</option>
                    <option value="activo">Activo</option>
                    <option value="inactivo">Inactivo</option>
                    <option value="rechazado">Rechazado</option>
                  </select>
                </div>
              </>
            ) : (
              <>
                <InfoRow label="Tipo de inversión" value={cliente.tipo_inversor} badge badgeColor={TIPO_COLORS[cliente.tipo_inversor]} />
                <InfoRow label="Capital inicial declarado" value={`${(cliente.capital_inicial ?? 0).toLocaleString('es-ES')} €`} />
                <InfoRow label="Estado" value={estadoInfo.label} badge badgeColor={estadoInfo.cls.includes('active') ? '#6dc86d' : estadoInfo.cls.includes('pending') ? '#C9A043' : '#888'} />
                <InfoRow label="Participaciones activas" value={parts.filter(p => p.estado === 'activa').length} />
              </>
            )}
          </div>
        </div>

        {/* Conexión / Auth */}
        <div className="bo-card-flat" style={{ padding: '1.5rem' }}>
          <div className="bo-section-title">Acceso a la plataforma</div>
          {cliente.authUser ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <InfoRow label="Usuario vinculado" value={cliente.user_id ? `✓ ${cliente.user_id.slice(0, 8)}…` : '—'} />
              <InfoRow label="Email verificado" value={cliente.authUser.email_confirmed_at ? `✓ ${fmtDate(cliente.authUser.email_confirmed_at)}` : '✗ Sin verificar'} />
              <InfoRow label="Última conexión" value={fmt(cliente.authUser.last_sign_in_at)} />
              <InfoRow label="Cuenta creada" value={fmt(cliente.authUser.created_at)} />
              {cliente.authUser.phone && <InfoRow label="Teléfono auth" value={cliente.authUser.phone} />}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', border: '0.5px dashed rgba(255,255,255,0.08)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>
                  {cliente.user_id ? 'Sin datos de auth disponibles' : 'Este cliente no tiene cuenta de acceso creada. Solo existe como registro en el CRM.'}
                </div>
              </div>
              <InfoRow label="User ID" value={cliente.user_id ?? '—'} />
            </div>
          )}
        </div>

        {/* Notas internas */}
        <div className="bo-card-flat" style={{ padding: '1.5rem' }}>
          <div className="bo-section-title">Notas internas</div>
          {editMode ? (
            <textarea
              className="bo-input"
              rows={6}
              value={editForm.notas ?? ''}
              onChange={e => setEditForm(f => ({ ...f, notas: e.target.value }))}
              placeholder="Notas privadas sobre este cliente…"
              style={{ resize: 'vertical' }}
            />
          ) : (
            <div style={{ fontSize: '0.85rem', color: cliente.notas ? 'var(--text-1)' : 'var(--text-3)', lineHeight: 1.7, whiteSpace: 'pre-wrap', minHeight: '80px' }}>
              {cliente.notas || 'Sin notas. Pulsa "Editar ficha" para añadir.'}
            </div>
          )}
        </div>
      </div>

      {/* ── Participaciones ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <span className="bo-section-title" style={{ marginBottom: 0 }}>Participaciones</span>
        <button className="bo-btn bo-btn-primary bo-btn-sm" onClick={() => setShowPartForm(true)}>+ Nueva participación</button>
      </div>

      {parts.length === 0 && (
        <div className="bo-card-flat" style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.85rem' }}>
          Este cliente aún no tiene participaciones registradas.
        </div>
      )}

      {parts.map(p => (
        <div key={p.id} className="bo-card" style={{ marginBottom: '0.875rem', overflow: 'hidden' }}>
          <div style={{ padding: '1.125rem 1.5rem', borderBottom: p.movimientos?.length ? '0.5px solid rgba(255,255,255,0.05)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <span className="bo-badge" style={{ color: TIPO_COLORS[p.tipo] ?? 'var(--gold-200)', borderColor: TIPO_COLORS[p.tipo] ?? 'var(--gold-border)', background: `${TIPO_COLORS[p.tipo] ?? 'var(--gold-200)'}18` }}>
                {p.tipo}
              </span>
              <div>
                <div style={{ fontWeight: 600, color: 'var(--text-0)', fontSize: '0.88rem' }}>{p.nombre_operacion}</div>
                <div style={{ fontSize: '0.73rem', color: 'var(--text-3)', marginTop: '2px' }}>
                  Entrada: {fmtDate(p.fecha_entrada)}{p.fecha_vencimiento ? ` · Vence: ${fmtDate(p.fecha_vencimiento)}` : ''}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ textAlign: 'right' }}>
                <div className="serif" style={{ fontSize: '1.3rem', color: 'var(--gold-100)' }}>{p.importe.toLocaleString('es-ES')} €</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>R.anual: {p.rentabilidad_anual}%</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.88rem', color: '#6dc86d', fontWeight: 500 }}>+{(p.rentabilidad_acum ?? 0).toLocaleString('es-ES')} €</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>acumulado</div>
              </div>
              <span className="bo-badge" style={{ color: p.estado === 'activa' ? '#6dc86d' : p.estado === 'pendiente' ? '#C9A043' : 'var(--text-3)', borderColor: 'currentColor', background: 'transparent' }}>
                {p.estado}
              </span>
              <button onClick={() => setShowMovForm(p.id)} className="bo-btn bo-btn-ghost bo-btn-sm">
                + Movimiento
              </button>
            </div>
          </div>
          {/* Movimientos */}
          {p.movimientos && p.movimientos.length > 0 && (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '0.5px solid rgba(255,255,255,0.05)' }}>
                  {['Fecha', 'Tipo', 'Importe', 'Descripción'].map(h => (
                    <th key={h} style={{ padding: '0.5rem 1.5rem', fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', textAlign: 'left', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {p.movimientos.map(m => (
                  <tr key={m.id} style={{ borderBottom: '0.5px solid rgba(255,255,255,0.03)' }}>
                    <td style={{ padding: '0.6rem 1.5rem', fontSize: '0.78rem', color: 'var(--text-2)' }}>{fmtDate(m.fecha)}</td>
                    <td style={{ padding: '0.6rem 1.5rem' }}>
                      <span className="bo-badge" style={{ color: MOV_COLOR[m.tipo] ?? 'var(--text-2)', borderColor: MOV_COLOR[m.tipo] ?? 'var(--text-3)', background: `${MOV_COLOR[m.tipo] ?? '#888'}15`, fontSize: '8px' }}>
                        {m.tipo}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 1.5rem', fontSize: '0.85rem', fontWeight: 600, color: ['salida','comision'].includes(m.tipo) ? '#ee0055' : '#6dc86d' }}>
                      {['salida','comision'].includes(m.tipo) ? '−' : '+'}
                      {m.importe.toLocaleString('es-ES')} €
                    </td>
                    <td style={{ padding: '0.6rem 1.5rem', fontSize: '0.78rem', color: 'var(--text-2)' }}>{m.descripcion || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}

      {/* ── Modal nueva participación ── */}
      {showPartForm && (
        <div className="modal-overlay active" onClick={e => { if (e.target === e.currentTarget) setShowPartForm(false) }}>
          <div className="modal">
            <button className="modal-close" onClick={() => setShowPartForm(false)}>×</button>
            <h2 className="modal-title serif">Nueva participación</h2>
            <form onSubmit={createParticipacion}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tipo</label>
                  <select className="form-input" value={partForm.tipo} onChange={e => setPartForm(f => ({ ...f, tipo: e.target.value }))}>
                    <option value="crowdfunding">Crowdfunding</option>
                    <option value="npl">NPL</option>
                    <option value="hipotecario">Hipotecario</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Estado</label>
                  <select className="form-input" value={partForm.estado} onChange={e => setPartForm(f => ({ ...f, estado: e.target.value }))}>
                    <option value="activa">Activa</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="finalizada">Finalizada</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Nombre de la operación</label>
                <input className="form-input" required value={partForm.nombre_operacion} onChange={e => setPartForm(f => ({ ...f, nombre_operacion: e.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Importe (€)</label>
                  <input type="number" className="form-input" required value={partForm.importe} onChange={e => setPartForm(f => ({ ...f, importe: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Rentabilidad anual (%)</label>
                  <input type="number" step="0.01" className="form-input" value={partForm.rentabilidad_anual} onChange={e => setPartForm(f => ({ ...f, rentabilidad_anual: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Fecha entrada</label>
                  <input type="date" className="form-input" required value={partForm.fecha_entrada} onChange={e => setPartForm(f => ({ ...f, fecha_entrada: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha vencimiento</label>
                  <input type="date" className="form-input" value={partForm.fecha_vencimiento} onChange={e => setPartForm(f => ({ ...f, fecha_vencimiento: e.target.value }))} />
                </div>
              </div>
              <button type="submit" className="form-submit" disabled={savingForm}>
                {savingForm ? 'Guardando…' : 'Crear participación →'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal nuevo movimiento ── */}
      {showMovForm && (
        <div className="modal-overlay active" onClick={e => { if (e.target === e.currentTarget) setShowMovForm(null) }}>
          <div className="modal">
            <button className="modal-close" onClick={() => setShowMovForm(null)}>×</button>
            <h2 className="modal-title serif">Nuevo movimiento</h2>
            <form onSubmit={e => createMovimiento(e, showMovForm)}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Tipo</label>
                  <select className="form-input" value={movForm.tipo} onChange={e => setMovForm(f => ({ ...f, tipo: e.target.value }))}>
                    <option value="entrada">Entrada</option>
                    <option value="salida">Salida</option>
                    <option value="interes">Interés</option>
                    <option value="dividendo">Dividendo</option>
                    <option value="comision">Comisión</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Importe (€)</label>
                  <input type="number" className="form-input" required value={movForm.importe} onChange={e => setMovForm(f => ({ ...f, importe: e.target.value }))} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Fecha</label>
                <input type="date" className="form-input" required value={movForm.fecha} onChange={e => setMovForm(f => ({ ...f, fecha: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Descripción</label>
                <input className="form-input" value={movForm.descripcion} onChange={e => setMovForm(f => ({ ...f, descripcion: e.target.value }))} />
              </div>
              <button type="submit" className="form-submit" disabled={savingForm}>
                {savingForm ? 'Guardando…' : 'Registrar movimiento →'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Helper component ──────────────────────────────────────────────
function InfoRow({ label, value, badge, badgeColor }: { label: string; value: string | number; badge?: boolean; badgeColor?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
      <span style={{ fontSize: '0.78rem', color: 'var(--text-3)', letterSpacing: '0.04em', flexShrink: 0 }}>{label}</span>
      {badge && badgeColor ? (
        <span style={{ padding: '2px 10px', borderRadius: '99px', fontSize: '9px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: badgeColor, border: `0.5px solid ${badgeColor}`, background: `${badgeColor}18` }}>
          {value}
        </span>
      ) : (
        <span style={{ fontSize: '0.83rem', color: 'var(--text-1)', textAlign: 'right', wordBreak: 'break-all' }}>{value}</span>
      )}
    </div>
  )
}
