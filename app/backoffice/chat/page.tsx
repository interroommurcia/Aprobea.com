'use client'

import { useEffect, useState, useRef, useCallback } from 'react'

// ─── Types ────────────────────────────────────────────────────────────────────
type Cliente = { id: string; nombre: string; apellidos: string; email: string; tipo_inversor: string }
type Conversacion = {
  id: string; created_at: string; cliente_id: string
  operacion_nombre: string | null; referencia_catastral: string | null
  tipo: string; ultimo_mensaje: string | null; ultimo_mensaje_at: string | null
  no_leidos_admin: number; no_leidos_cliente: number; activa: boolean
  cliente: Cliente
}
type Mensaje = {
  id: string; created_at: string; conversacion_id: string
  remitente: 'admin' | 'cliente'; contenido: string | null
  archivo_url: string | null; archivo_nombre: string | null; archivo_tipo: string | null
  leido: boolean; leido_at: string | null
  nota_interna: boolean; requiere_firma: boolean; es_broadcast: boolean
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PLANTILLAS = [
  { label: 'Doc. recibido', texto: 'Hemos recibido correctamente la documentación. La revisaremos y te informaremos en breve.' },
  { label: 'Firma pendiente', texto: 'Tienes un documento pendiente de firma. Por favor, revísalo y confírmalo lo antes posible.' },
  { label: 'Op. actualizada', texto: 'Te informamos de que ha habido una actualización en tu operación. Quedo a tu disposición para cualquier consulta.' },
  { label: 'Reunión', texto: '¿Podrías indicarnos tu disponibilidad para una reunión esta semana? Podemos adaptarnos a tu horario.' },
  { label: 'Pago confirmado', texto: 'Confirmamos la recepción del pago correctamente. Muchas gracias por tu confianza.' },
  { label: 'Due diligence', texto: 'Hemos iniciado el proceso de due diligence sobre el activo. Te mantendremos informado de los avances.' },
]

// ─── Sub-components ───────────────────────────────────────────────────────────
function Avatar({ nombre, apellidos, size = 36 }: { nombre: string; apellidos: string; size?: number }) {
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(201,160,67,0.25), rgba(201,160,67,0.08))', border: '0.5px solid rgba(201,160,67,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.33, fontWeight: 700, color: 'var(--gold-100)', flexShrink: 0, letterSpacing: '0.04em' }}>
      {nombre?.[0]}{apellidos?.[0]}
    </div>
  )
}

function FilePreview({ url, nombre, tipo, isAdmin: asAdmin }: { url: string; nombre: string; tipo: string; isAdmin: boolean }) {
  const isImg = tipo === 'imagen'
  const icon = tipo === 'documento' ? '📄' : tipo === 'imagen' ? '🖼️' : '📎'
  return isImg ? (
    <a href={url} target="_blank" rel="noopener noreferrer">
      <img src={url} alt={nombre} style={{ maxWidth: '220px', maxHeight: '160px', borderRadius: '8px', display: 'block', marginTop: '6px' }} />
    </a>
  ) : (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginTop: '6px', background: asAdmin ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.3)', border: '0.5px solid rgba(201,160,67,0.2)', borderRadius: '8px', padding: '8px 12px', textDecoration: 'none', color: 'var(--gold-200)', fontSize: '12px', maxWidth: '240px' }}>
      <span>{icon}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{nombre}</span>
      <span style={{ color: 'var(--text-3)', fontSize: '10px', flexShrink: 0 }}>↓ Abrir</span>
    </a>
  )
}

function TimeSince(ts: string) {
  const d = new Date(ts)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  if (diff < 60000) return 'Ahora'
  if (diff < 3600000) return `Hace ${Math.floor(diff / 60000)}m`
  if (diff < 86400000) return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ChatPage() {
  const [convs, setConvs] = useState<Conversacion[]>([])
  const [selected, setSelected] = useState<Conversacion | null>(null)
  const [mensajes, setMensajes] = useState<Mensaje[]>([])
  const [texto, setTexto] = useState('')
  const [notaInterna, setNotaInterna] = useState(false)
  const [requiereFirma, setRequiereFirma] = useState(false)
  const [archivo, setArchivo] = useState<File | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingMsgs, setLoadingMsgs] = useState(false)
  const [showNewConv, setShowNewConv] = useState(false)
  const [showBroadcast, setShowBroadcast] = useState(false)
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [newForm, setNewForm] = useState({ cliente_id: '', operacion_nombre: '', referencia_catastral: '', tipo: 'npl' })
  const [broadcastForm, setBroadcastForm] = useState({ operacion_nombre: '', contenido: '', requiere_firma: false })
  const [broadcastFile, setBroadcastFile] = useState<File | null>(null)
  const [broadcastResult, setBroadcastResult] = useState<string | null>(null)
  const [clienteSearch, setClienteSearch] = useState('')
  const [showClienteDrop, setShowClienteDrop] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const broadcastFileRef = useRef<HTMLInputElement>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ─── Load conversations ──────────────────────────────────────────────────
  const loadConvs = useCallback(async () => {
    const res = await fetch('/api/backoffice/chat')
    if (res.ok) setConvs(await res.json())
    setLoading(false)
  }, [])

  useEffect(() => { loadConvs() }, [loadConvs])

  // ─── Load messages for selected conversation (+ polling) ─────────────────
  const loadMensajes = useCallback(async (convId: string) => {
    const res = await fetch(`/api/backoffice/chat/mensajes?conversacion_id=${convId}`)
    if (res.ok) {
      const data = await res.json()
      setMensajes(data)
      // Reset unread in local state
      setConvs(prev => prev.map(c => c.id === convId ? { ...c, no_leidos_admin: 0 } : c))
    }
  }, [])

  useEffect(() => {
    if (!selected) return
    setLoadingMsgs(true)
    setMensajes([])
    loadMensajes(selected.id).finally(() => setLoadingMsgs(false))

    // Poll for new messages every 4s
    pollRef.current = setInterval(() => loadMensajes(selected.id), 4000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [selected?.id, loadMensajes])

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  // Load clients for new conversation modal
  useEffect(() => {
    if (!showNewConv) return
    fetch('/api/backoffice/clientes').then(r => r.json()).then(d => setClientes(Array.isArray(d) ? d : []))
  }, [showNewConv])

  // ─── Send message ─────────────────────────────────────────────────────────
  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!selected || (!texto.trim() && !archivo)) return
    setEnviando(true)

    let body: FormData | string
    if (archivo) {
      const fd = new FormData()
      fd.append('conversacion_id', selected.id)
      if (texto.trim()) fd.append('contenido', texto.trim())
      fd.append('archivo', archivo)
      fd.append('nota_interna', String(notaInterna))
      fd.append('requiere_firma', String(requiereFirma))
      body = fd
    } else {
      body = JSON.stringify({ conversacion_id: selected.id, contenido: texto.trim(), nota_interna: notaInterna, requiere_firma: requiereFirma })
    }

    const res = await fetch('/api/backoffice/chat/mensajes', {
      method: 'POST',
      headers: archivo ? undefined : { 'Content-Type': 'application/json' },
      body,
    })

    if (res.ok) {
      const msg = await res.json()
      setMensajes(prev => [...prev, msg])
      setTexto(''); setArchivo(null); setNotaInterna(false); setRequiereFirma(false)
      // Update local conversation
      setConvs(prev => prev.map(c => c.id === selected.id ? { ...c, ultimo_mensaje: msg.contenido || msg.archivo_nombre || 'Mensaje', ultimo_mensaje_at: msg.created_at } : c))
    }
    setEnviando(false)
  }

  // ─── Create new conversation ──────────────────────────────────────────────
  async function handleCreateConv(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/backoffice/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newForm),
    })
    if (res.ok) {
      const conv = await res.json()
      setConvs(prev => [conv, ...prev])
      setSelected(conv)
      setShowNewConv(false)
      setNewForm({ cliente_id: '', operacion_nombre: '', referencia_catastral: '', tipo: 'npl' })
    } else {
      const err = await res.json()
      if (res.status === 409 && err.existing_id) {
        // Conversation already exists — select it
        const existing = convs.find(c => c.id === err.existing_id)
        if (existing) setSelected(existing)
        setShowNewConv(false)
      }
    }
  }

  // ─── Broadcast ────────────────────────────────────────────────────────────
  async function handleBroadcast(e: React.FormEvent) {
    e.preventDefault()
    setBroadcastResult(null)
    const fd = new FormData()
    fd.append('operacion_nombre', broadcastForm.operacion_nombre)
    fd.append('contenido', broadcastForm.contenido)
    fd.append('requiere_firma', String(broadcastForm.requiere_firma))
    if (broadcastFile) fd.append('archivo', broadcastFile)

    const res = await fetch('/api/backoffice/chat/broadcast', { method: 'POST', body: fd })
    const data = await res.json()
    if (res.ok) {
      setBroadcastResult(`✓ Enviado a ${data.enviado_a} participante${data.enviado_a !== 1 ? 's' : ''}`)
      setBroadcastForm({ operacion_nombre: broadcastForm.operacion_nombre, contenido: '', requiere_firma: false })
      setBroadcastFile(null)
      loadConvs()
    } else {
      setBroadcastResult(`✗ ${data.error}`)
    }
  }

  // ─── Delete message ───────────────────────────────────────────────────────
  async function handleDeleteMsg(id: string) {
    if (!confirm('¿Eliminar este mensaje?')) return
    const res = await fetch('/api/backoffice/chat/mensajes', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    if (res.ok) setMensajes(prev => prev.filter(m => m.id !== id))
  }

  // ─── Archive conversation ──────────────────────────────────────────────────
  async function handleArchive(id: string) {
    if (!confirm('¿Archivar esta conversación?')) return
    await fetch('/api/backoffice/chat', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setConvs(prev => prev.filter(c => c.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  const filteredConvs = convs.filter(c => {
    const q = search.toLowerCase()
    return !q || `${c.cliente?.nombre} ${c.cliente?.apellidos}`.toLowerCase().includes(q) || (c.operacion_nombre || '').toLowerCase().includes(q) || (c.referencia_catastral || '').toLowerCase().includes(q)
  })

  const filteredClientes = clientes.filter(c =>
    !clienteSearch || `${c.nombre} ${c.apellidos} ${c.email}`.toLowerCase().includes(clienteSearch.toLowerCase())
  )

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg-0)' }}>

      {/* ── LEFT PANEL: Conversation List ── */}
      <div style={{ width: '320px', flexShrink: 0, borderRight: '0.5px solid var(--gold-border)', display: 'flex', flexDirection: 'column', background: 'var(--bg-1)' }}>
        {/* Header */}
        <div style={{ padding: '1.25rem 1rem', borderBottom: '0.5px solid var(--gold-border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '10px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)' }}>Chat Privado</div>
              <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-0)', marginTop: '2px' }}>Conversaciones</div>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                onClick={() => setShowBroadcast(true)}
                title="Enviar a todos en una operación"
                style={{ background: 'rgba(201,160,67,0.08)', border: '0.5px solid rgba(201,160,67,0.25)', color: 'var(--gold-200)', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '13px' }}
              >📢</button>
              <button
                onClick={() => setShowNewConv(true)}
                title="Nueva conversación"
                style={{ background: 'var(--gold-200)', border: 'none', color: '#1a1506', borderRadius: '8px', padding: '6px 10px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}
              >+</button>
            </div>
          </div>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar cliente u operación…"
            style={{ width: '100%', background: 'var(--bg-3)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', padding: '7px 12px', color: 'var(--text-0)', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Conversation list */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '12px' }}>Cargando…</div>
          ) : filteredConvs.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '12px' }}>
              {search ? 'Sin resultados' : 'Sin conversaciones aún'}
            </div>
          ) : filteredConvs.map(c => (
            <div
              key={c.id}
              onClick={() => setSelected(c)}
              style={{ padding: '0.875rem 1rem', cursor: 'pointer', borderBottom: '0.5px solid rgba(62,59,53,0.2)', background: selected?.id === c.id ? 'rgba(201,160,67,0.07)' : 'transparent', borderLeft: selected?.id === c.id ? '2px solid var(--gold-200)' : '2px solid transparent', transition: 'background 0.15s' }}
            >
              <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <Avatar nombre={c.cliente?.nombre || '?'} apellidos={c.cliente?.apellidos || '?'} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                      {c.cliente?.nombre} {c.cliente?.apellidos}
                    </span>
                    <span style={{ fontSize: '10px', color: 'var(--text-3)', flexShrink: 0 }}>
                      {c.ultimo_mensaje_at ? TimeSince(c.ultimo_mensaje_at) : ''}
                    </span>
                  </div>
                  {c.operacion_nombre && (
                    <div style={{ fontSize: '10px', color: 'var(--gold-200)', marginTop: '1px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.tipo === 'crowdfunding' ? '👥 ' : ''}{c.operacion_nombre}
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '3px' }}>
                    <span style={{ fontSize: '11px', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                      {c.ultimo_mensaje || 'Sin mensajes aún'}
                    </span>
                    {c.no_leidos_admin > 0 && (
                      <span style={{ background: 'var(--gold-200)', color: '#1a1506', borderRadius: '10px', fontSize: '9px', fontWeight: 700, padding: '1px 6px', flexShrink: 0 }}>
                        {c.no_leidos_admin}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── RIGHT PANEL: Chat Window ── */}
      {!selected ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ fontSize: '3rem' }}>💬</div>
          <p style={{ color: 'var(--text-3)', fontSize: '0.88rem' }}>Selecciona una conversación o crea una nueva</p>
          <button onClick={() => setShowNewConv(true)} style={{ background: 'var(--gold-200)', border: 'none', color: '#1a1506', borderRadius: '10px', padding: '10px 24px', cursor: 'pointer', fontSize: '13px', fontWeight: 700 }}>
            + Nueva conversación
          </button>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Chat header */}
          <div style={{ padding: '1rem 1.5rem', borderBottom: '0.5px solid var(--gold-border)', background: 'var(--bg-1)', flexShrink: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Avatar nombre={selected.cliente?.nombre || '?'} apellidos={selected.cliente?.apellidos || '?'} size={42} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-0)' }}>
                    {selected.cliente?.nombre} {selected.cliente?.apellidos}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ color: 'var(--gold-200)' }}>{selected.cliente?.email}</span>
                    {selected.operacion_nombre && <span>· {selected.operacion_nombre}</span>}
                    {selected.referencia_catastral && (
                      <span style={{ background: 'rgba(201,160,67,0.08)', border: '0.5px solid rgba(201,160,67,0.2)', padding: '1px 6px', borderRadius: '4px', fontSize: '10px', letterSpacing: '0.05em' }}>
                        🏛 {selected.referencia_catastral}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {selected.tipo === 'crowdfunding' && (
                  <button
                    onClick={() => { setShowBroadcast(true); setBroadcastForm(f => ({ ...f, operacion_nombre: selected.operacion_nombre || '' })) }}
                    title="Enviar a todos en esta operación"
                    style={{ background: 'rgba(201,160,67,0.08)', border: '0.5px solid rgba(201,160,67,0.25)', color: 'var(--gold-200)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '11px', letterSpacing: '0.05em' }}
                  >
                    📢 Enviar a todos
                  </button>
                )}
                <button
                  onClick={() => handleArchive(selected.id)}
                  title="Archivar conversación"
                  style={{ background: 'transparent', border: '0.5px solid var(--gold-border)', color: 'var(--text-3)', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '11px' }}
                >
                  Archivar
                </button>
              </div>
            </div>
          </div>

          {/* Messages area */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {loadingMsgs ? (
              <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '12px', marginTop: '2rem' }}>Cargando mensajes…</div>
            ) : mensajes.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '12px', marginTop: '2rem' }}>
                Aún no hay mensajes. ¡Empieza la conversación!
              </div>
            ) : mensajes.map((m, idx) => {
              const isAdmin = m.remitente === 'admin'
              const showDate = idx === 0 || new Date(m.created_at).toDateString() !== new Date(mensajes[idx - 1].created_at).toDateString()

              return (
                <div key={m.id}>
                  {showDate && (
                    <div style={{ textAlign: 'center', margin: '0.5rem 0' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-3)', background: 'var(--bg-2)', padding: '3px 10px', borderRadius: '10px' }}>
                        {new Date(m.created_at).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start', alignItems: 'flex-end', gap: '8px', marginBottom: '2px' }}>
                    {!isAdmin && <Avatar nombre={selected.cliente?.nombre || '?'} apellidos={selected.cliente?.apellidos || '?'} size={28} />}
                    <div
                      style={{ maxWidth: '62%', position: 'relative' }}
                      onMouseEnter={e => { if (isAdmin) (e.currentTarget.querySelector('[data-del]') as HTMLElement)?.style && ((e.currentTarget.querySelector('[data-del]') as HTMLElement).style.opacity = '1') }}
                      onMouseLeave={e => { if (isAdmin) (e.currentTarget.querySelector('[data-del]') as HTMLElement)?.style && ((e.currentTarget.querySelector('[data-del]') as HTMLElement).style.opacity = '0') }}
                    >
                      {/* Nota interna badge */}
                      {m.nota_interna && (
                        <div style={{ fontSize: '9px', color: '#f59e0b', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'right', marginBottom: '3px' }}>
                          🔒 Nota interna
                        </div>
                      )}
                      {/* Broadcast badge */}
                      {m.es_broadcast && (
                        <div style={{ fontSize: '9px', color: 'var(--gold-200)', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: isAdmin ? 'right' : 'left', marginBottom: '3px' }}>
                          📢 Comunicado masivo
                        </div>
                      )}
                      {/* Requiere firma badge */}
                      {m.requiere_firma && (
                        <div style={{ fontSize: '9px', color: '#ef4444', letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: isAdmin ? 'right' : 'left', marginBottom: '3px' }}>
                          ✍️ Requiere revisión
                        </div>
                      )}
                      <div style={{
                        padding: '10px 14px',
                        borderRadius: isAdmin ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                        background: m.nota_interna
                          ? 'rgba(245,158,11,0.12)'
                          : isAdmin
                            ? 'linear-gradient(135deg, rgba(201,160,67,0.18), rgba(201,160,67,0.08))'
                            : 'var(--bg-3)',
                        border: m.nota_interna
                          ? '0.5px solid rgba(245,158,11,0.3)'
                          : `0.5px solid ${isAdmin ? 'rgba(201,160,67,0.25)' : 'var(--gold-border)'}`,
                      }}>
                        {m.contenido && (
                          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-0)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{m.contenido}</p>
                        )}
                        {m.archivo_url && m.archivo_nombre && m.archivo_tipo && (
                          <FilePreview url={m.archivo_url} nombre={m.archivo_nombre} tipo={m.archivo_tipo} isAdmin={isAdmin} />
                        )}
                      </div>
                      <div style={{ display: 'flex', justifyContent: isAdmin ? 'flex-end' : 'flex-start', alignItems: 'center', gap: '6px', marginTop: '3px' }}>
                        <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                          {new Date(m.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {isAdmin && (
                          <span style={{ fontSize: '10px', color: m.leido ? '#6dc86d' : 'var(--text-3)' }}>
                            {m.leido ? '✓✓ Leído' : '✓'}
                          </span>
                        )}
                        {isAdmin && (
                          <button
                            data-del="1"
                            onClick={() => handleDeleteMsg(m.id)}
                            style={{ background: 'none', border: 'none', color: '#e05', cursor: 'pointer', fontSize: '10px', padding: '0 2px', opacity: 0, transition: 'opacity 0.15s' }}
                          >✕</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick templates */}
          <div style={{ padding: '0 1.5rem', flexShrink: 0, display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '8px' }}>
            {PLANTILLAS.map(p => (
              <button
                key={p.label}
                onClick={() => setTexto(p.texto)}
                style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', color: 'var(--text-2)', borderRadius: '20px', padding: '4px 12px', fontSize: '11px', cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Input area */}
          <form onSubmit={handleSend} style={{ padding: '0.75rem 1.5rem 1rem', borderTop: '0.5px solid var(--gold-border)', background: 'var(--bg-1)', flexShrink: 0 }}>
            {/* Toggles */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: notaInterna ? '#f59e0b' : 'var(--text-3)', cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={notaInterna} onChange={e => setNotaInterna(e.target.checked)} style={{ accentColor: '#f59e0b' }} />
                🔒 Nota interna (solo admin)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: requiereFirma ? '#ef4444' : 'var(--text-3)', cursor: 'pointer', userSelect: 'none' }}>
                <input type="checkbox" checked={requiereFirma} onChange={e => setRequiereFirma(e.target.checked)} style={{ accentColor: '#ef4444' }} />
                ✍️ Requiere revisión del cliente
              </label>
            </div>

            {/* File preview */}
            {archivo && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-3)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', padding: '6px 10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--gold-200)' }}>📎 {archivo.name}</span>
                <button type="button" onClick={() => setArchivo(null)} style={{ background: 'none', border: 'none', color: '#e05', cursor: 'pointer', fontSize: '12px', marginLeft: 'auto' }}>✕</button>
              </div>
            )}

            {/* Text + send */}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{ background: 'var(--bg-3)', border: '0.5px solid var(--gold-border)', color: 'var(--text-2)', borderRadius: '10px', padding: '10px 12px', cursor: 'pointer', fontSize: '16px', flexShrink: 0 }}
                title="Adjuntar archivo"
              >📎</button>
              <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={e => setArchivo(e.target.files?.[0] || null)} />

              <textarea
                value={texto}
                onChange={e => setTexto(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(e as any) } }}
                placeholder={notaInterna ? 'Escribe una nota interna (no visible para el cliente)…' : 'Escribe un mensaje… (Enter para enviar)'}
                rows={1}
                style={{
                  flex: 1, background: 'var(--bg-3)', border: `0.5px solid ${notaInterna ? 'rgba(245,158,11,0.4)' : 'var(--gold-border)'}`,
                  borderRadius: '10px', padding: '10px 14px', color: 'var(--text-0)', fontSize: '0.85rem',
                  outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5, maxHeight: '120px', overflowY: 'auto',
                }}
              />

              <button
                type="submit"
                disabled={enviando || (!texto.trim() && !archivo)}
                style={{ background: enviando || (!texto.trim() && !archivo) ? 'var(--bg-3)' : 'var(--gold-200)', border: 'none', color: enviando || (!texto.trim() && !archivo) ? 'var(--text-3)' : '#1a1506', borderRadius: '10px', padding: '10px 16px', cursor: enviando || (!texto.trim() && !archivo) ? 'default' : 'pointer', fontSize: '16px', flexShrink: 0, transition: 'all 0.15s' }}
              >
                {enviando ? '…' : '→'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Nueva conversación
      ══════════════════════════════════════════════════════════════════════ */}
      {showNewConv && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) setShowNewConv(false) }}>
          <div style={{ background: 'var(--bg-1)', border: '0.5px solid var(--gold-border-strong)', borderRadius: '16px', padding: '2rem', width: '480px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-0)', margin: 0 }}>Nueva conversación</h3>
              <button onClick={() => setShowNewConv(false)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '18px' }}>×</button>
            </div>
            <form onSubmit={handleCreateConv} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Client selector */}
              <div style={{ position: 'relative' }}>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '5px' }}>Cliente *</label>
                <input
                  value={clienteSearch}
                  onChange={e => { setClienteSearch(e.target.value); setShowClienteDrop(true) }}
                  onFocus={() => setShowClienteDrop(true)}
                  placeholder="Buscar por nombre o email…"
                  style={{ width: '100%', background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', padding: '9px 12px', color: 'var(--text-0)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }}
                />
                {newForm.cliente_id && (
                  <div style={{ fontSize: '11px', color: 'var(--gold-200)', marginTop: '4px' }}>
                    ✓ {clientes.find(c => c.id === newForm.cliente_id)?.nombre} {clientes.find(c => c.id === newForm.cliente_id)?.apellidos}
                  </div>
                )}
                {showClienteDrop && filteredClientes.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', zIndex: 100, maxHeight: '180px', overflowY: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
                    {filteredClientes.slice(0, 10).map(c => (
                      <div key={c.id} onClick={() => { setNewForm(f => ({ ...f, cliente_id: c.id })); setClienteSearch(`${c.nombre} ${c.apellidos}`); setShowClienteDrop(false) }}
                        style={{ padding: '10px 12px', cursor: 'pointer', borderBottom: '0.5px solid rgba(62,59,53,0.2)', fontSize: '13px', color: 'var(--text-0)' }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,160,67,0.06)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <span style={{ fontWeight: 500 }}>{c.nombre} {c.apellidos}</span>
                        <span style={{ color: 'var(--text-3)', fontSize: '11px', marginLeft: '8px' }}>{c.email}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '5px' }}>Operación / Activo</label>
                <input value={newForm.operacion_nombre} onChange={e => setNewForm(f => ({ ...f, operacion_nombre: e.target.value }))} placeholder="Ej: Finca Alicante Norte, Cartera NPL-2024…" style={{ width: '100%', background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', padding: '9px 12px', color: 'var(--text-0)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '5px' }}>Referencia catastral</label>
                <input value={newForm.referencia_catastral} onChange={e => setNewForm(f => ({ ...f, referencia_catastral: e.target.value }))} placeholder="Ej: 9872023VH5797S0001WX" style={{ width: '100%', background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', padding: '9px 12px', color: 'var(--text-0)', fontSize: '13px', outline: 'none', boxSizing: 'border-box', fontFamily: 'monospace' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '5px' }}>Tipo</label>
                <select value={newForm.tipo} onChange={e => setNewForm(f => ({ ...f, tipo: e.target.value }))} style={{ width: '100%', background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', padding: '9px 12px', color: 'var(--text-0)', fontSize: '13px', outline: 'none' }}>
                  <option value="npl">NPL</option>
                  <option value="crowdfunding">Crowdfunding</option>
                  <option value="otro">Otro</option>
                </select>
              </div>

              <button type="submit" disabled={!newForm.cliente_id} style={{ background: newForm.cliente_id ? 'var(--gold-200)' : 'var(--bg-3)', border: 'none', color: newForm.cliente_id ? '#1a1506' : 'var(--text-3)', borderRadius: '10px', padding: '12px', fontSize: '13px', fontWeight: 700, cursor: newForm.cliente_id ? 'pointer' : 'default', marginTop: '0.5rem' }}>
                Crear conversación →
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: Broadcast
      ══════════════════════════════════════════════════════════════════════ */}
      {showBroadcast && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => { if (e.target === e.currentTarget) { setShowBroadcast(false); setBroadcastResult(null) } }}>
          <div style={{ background: 'var(--bg-1)', border: '0.5px solid var(--gold-border-strong)', borderRadius: '16px', padding: '2rem', width: '520px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-0)', margin: 0 }}>📢 Enviar comunicado a todos</h3>
              <button onClick={() => { setShowBroadcast(false); setBroadcastResult(null) }} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '18px' }}>×</button>
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '1.5rem' }}>
              Crea un mensaje privado individual en la conversación de cada participante de la operación. Nadie ve las respuestas de los demás.
            </p>
            <form onSubmit={handleBroadcast} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '5px' }}>Operación *</label>
                <input value={broadcastForm.operacion_nombre} onChange={e => setBroadcastForm(f => ({ ...f, operacion_nombre: e.target.value }))} placeholder="Nombre exacto de la operación" style={{ width: '100%', background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', padding: '9px 12px', color: 'var(--text-0)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '5px' }}>Mensaje</label>
                <textarea value={broadcastForm.contenido} onChange={e => setBroadcastForm(f => ({ ...f, contenido: e.target.value }))} rows={4} placeholder="Escribe el comunicado…" style={{ width: '100%', background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', padding: '9px 12px', color: 'var(--text-0)', fontSize: '13px', outline: 'none', resize: 'vertical', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '11px', color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '5px' }}>Adjunto (opcional)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button type="button" onClick={() => broadcastFileRef.current?.click()} style={{ background: 'var(--bg-3)', border: '0.5px solid var(--gold-border)', color: 'var(--gold-200)', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer', fontSize: '12px' }}>📎 Adjuntar</button>
                  {broadcastFile && <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>{broadcastFile.name} <button type="button" onClick={() => setBroadcastFile(null)} style={{ background: 'none', border: 'none', color: '#e05', cursor: 'pointer' }}>✕</button></span>}
                </div>
                <input ref={broadcastFileRef} type="file" style={{ display: 'none' }} onChange={e => setBroadcastFile(e.target.files?.[0] || null)} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-2)', cursor: 'pointer' }}>
                <input type="checkbox" checked={broadcastForm.requiere_firma} onChange={e => setBroadcastForm(f => ({ ...f, requiere_firma: e.target.checked })) } style={{ accentColor: '#ef4444' }} />
                ✍️ Marcar como "requiere revisión" del cliente
              </label>
              {broadcastResult && (
                <div style={{ background: broadcastResult.startsWith('✓') ? 'rgba(100,200,100,0.08)' : 'rgba(255,50,50,0.08)', border: `0.5px solid ${broadcastResult.startsWith('✓') ? '#6dc86d44' : '#e0544444'}`, borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: broadcastResult.startsWith('✓') ? '#6dc86d' : '#e05' }}>
                  {broadcastResult}
                </div>
              )}
              <button type="submit" disabled={!broadcastForm.operacion_nombre || (!broadcastForm.contenido && !broadcastFile)} style={{ background: 'var(--gold-200)', border: 'none', color: '#1a1506', borderRadius: '10px', padding: '12px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', marginTop: '0.5rem' }}>
                Enviar comunicado a todos →
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
