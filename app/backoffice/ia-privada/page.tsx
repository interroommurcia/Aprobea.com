'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

// ── Tipos ────────────────────────────────────────────────────────────────────
type Msg  = { role: 'user' | 'assistant'; content: string }
type Thread = { id: number; nombre: string; skill: string; messages: Msg[] }
type CustomSkill = { id: string; icon: string; label: string; desc: string; prompt: string }
type Attachment  = { type: 'excel' | 'pdf'; filename: string; text?: string; data?: string }

// ── Skills predefinidas ───────────────────────────────────────────────────────
const BUILTIN: Record<string, { icon: string; label: string; desc: string; system: string; suggestions: string[] }> = {
  general: {
    icon: '🧠', label: 'Estratega',
    desc: 'Asistente ejecutivo · estrategia, comunicaciones, planificación',
    system: `Eres el asistente ejecutivo privado del director de GrupoSkyLine Investment. Tu rol es ayudar con análisis estratégico, redacción de comunicaciones corporativas, planificación de negocio, preparación de reuniones y cualquier tarea ejecutiva. Tienes acceso a la base de contactos de la empresa mediante la herramienta buscar_clientes. Eres conciso, profesional y directo. Respondes siempre en español.`,
    suggestions: ['Redacta un email de seguimiento para un inversor interesado', 'Crea un plan de acción para este trimestre', 'Analiza los puntos clave de este documento'],
  },
  analista: {
    icon: '📊', label: 'Analista',
    desc: 'Inmobiliario y NPL · due diligence, rentabilidad, mercado',
    system: `Eres un analista inmobiliario y financiero senior especializado en activos NPL, crowdfunding inmobiliario y operaciones de inversión para GrupoSkyLine Investment. Tu rol es: analizar oportunidades de inversión, evaluar riesgo/rentabilidad, calcular ROI, comparar carteras NPL, interpretar datos del mercado inmobiliario español y redactar informes de due diligence. Usas terminología financiera precisa. Respondes en español con rigor analítico.`,
    suggestions: ['Calcula la rentabilidad de este activo', 'Analiza los riesgos de esta cartera NPL', 'Compara estas dos oportunidades de inversión'],
  },
  comercial: {
    icon: '👥', label: 'Comercial',
    desc: 'CRM · emails, scripts, seguimiento, base de clientes',
    system: `Eres el gestor comercial y CRM de GrupoSkyLine Investment. Tu rol es: captación de inversores, redacción de emails de seguimiento, scripts para llamadas comerciales, estrategias de cierre y análisis de la base de contactos. Tienes acceso a la base de datos de clientes mediante la herramienta buscar_clientes. Eres persuasivo, orientado a resultados y profesional. Responde en español.`,
    suggestions: ['Busca contactos interesados en NPL en la base de clientes', 'Redacta un script para llamada de seguimiento', 'Dame ideas para reactivar clientes inactivos'],
  },
}

const DEFAULT_THREADS: Thread[] = [
  { id: 1, nombre: 'Hilo 1', skill: 'general',   messages: [] },
  { id: 2, nombre: 'Hilo 2', skill: 'analista',  messages: [] },
  { id: 3, nombre: 'Hilo 3', skill: 'comercial', messages: [] },
]

// ── Helpers ───────────────────────────────────────────────────────────────────
function getSkill(id: string, custom: CustomSkill[]) {
  if (id in BUILTIN) return BUILTIN[id]
  const c = custom.find(s => s.id === id)
  if (c) return { icon: c.icon, label: c.label, desc: c.desc, system: c.prompt, suggestions: [] }
  return BUILTIN.general
}

async function parseExcel(file: File): Promise<string> {
  const XLSX = await import('xlsx')
  const bytes = await file.arrayBuffer()
  const wb = XLSX.read(bytes, { type: 'array' })
  return wb.SheetNames.map(name => {
    const csv = XLSX.utils.sheet_to_csv(wb.Sheets[name])
    return `=== Hoja: ${name} ===\n${csv}`
  }).join('\n\n')
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

// ── Componente ────────────────────────────────────────────────────────────────
export default function IAPrivadaPage() {
  // Threads
  const [threads, setThreads] = useState<Thread[]>(() => {
    if (typeof window === 'undefined') return DEFAULT_THREADS
    try {
      const s = localStorage.getItem('admin_ia_threads')
      if (!s) return DEFAULT_THREADS
      return JSON.parse(s).map((t: Thread) => ({ ...t, messages: Array.isArray(t.messages) ? t.messages : [] }))
    } catch { return DEFAULT_THREADS }
  })
  const [activeIdx, setActiveIdx] = useState(0)

  // Custom skills
  const [customSkills, setCustomSkills] = useState<CustomSkill[]>(() => {
    if (typeof window === 'undefined') return []
    try { return JSON.parse(localStorage.getItem('admin_ia_custom_skills') ?? '[]') } catch { return [] }
  })
  const [showSkills, setShowSkills]   = useState(false)
  const [editSkill, setEditSkill]     = useState<Partial<CustomSkill> | null>(null)

  // Chat
  const [input, setInput]         = useState('')
  const [streaming, setStreaming] = useState(false)
  const [editingName, setEditingName] = useState<number | null>(null)

  // Attachments
  const [attachment, setAttachment] = useState<Attachment | null>(null)
  const [attLoading, setAttLoading] = useState(false)
  const fileRef  = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const thread = threads[activeIdx]
  const skill  = getSkill(thread.skill, customSkills)

  // Persistencia
  useEffect(() => { localStorage.setItem('admin_ia_threads', JSON.stringify(threads)) }, [threads])
  useEffect(() => { localStorage.setItem('admin_ia_custom_skills', JSON.stringify(customSkills)) }, [customSkills])

  // Scroll y resize
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [thread.messages])
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }, [input])

  const updateThread = useCallback((idx: number, up: Partial<Thread>) => {
    setThreads(prev => prev.map((t, i) => i === idx ? { ...t, ...up } : t))
  }, [])

  // ── Enviar mensaje ──────────────────────────────────────────────────────────
  async function send(text?: string) {
    const content = (text ?? input).trim()
    if ((!content && !attachment) || streaming) return

    let displayContent = content
    if (attachment) displayContent = `📎 ${attachment.filename}${content ? '\n' + content : ''}`

    const userMsg: Msg = { role: 'user', content: displayContent }
    const prevMessages = thread.messages
    const newMessages  = [...prevMessages, userMsg]
    const currentIdx   = activeIdx

    updateThread(currentIdx, { messages: [...newMessages, { role: 'assistant', content: '' }] })
    setInput('')
    setStreaming(true)

    // Construir contenido para API
    let apiText = content
    let pdfAttachment: { filename: string; data: string } | undefined

    if (attachment?.type === 'excel' && attachment.text) {
      apiText = `[Archivo Excel: ${attachment.filename}]\n\n${attachment.text}${content ? '\n\n' + content : ''}`
    }
    if (attachment?.type === 'pdf' && attachment.data) {
      pdfAttachment = { filename: attachment.filename, data: attachment.data }
    }
    if (!apiText && !pdfAttachment) apiText = displayContent
    setAttachment(null)

    const apiMessages = [
      ...prevMessages.slice(-28),
      { role: 'user', content: apiText },
    ]

    let assistantText = ''
    try {
      const res = await fetch('/api/backoffice/ia-privada', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          systemPrompt: skill.system,
          attachment: pdfAttachment,
        }),
      })
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`)

      const reader = res.body.getReader()
      const dec    = new TextDecoder()
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        for (const line of dec.decode(value).split('\n')) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6)
          if (raw === '[DONE]') break
          try {
            const { text } = JSON.parse(raw)
            assistantText += text
            updateThread(currentIdx, { messages: [...newMessages, { role: 'assistant', content: assistantText }] })
          } catch {}
        }
      }
    } catch (e: any) {
      assistantText = `⚠️ Error: ${e.message}`
      updateThread(currentIdx, { messages: [...newMessages, { role: 'assistant', content: assistantText }] })
    }
    setStreaming(false)
  }

  // ── Adjuntar archivo ────────────────────────────────────────────────────────
  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setAttLoading(true)
    try {
      const isPdf   = file.type === 'application/pdf' || file.name.endsWith('.pdf')
      const isExcel = !isPdf
      if (isPdf) {
        const data = await fileToBase64(file)
        setAttachment({ type: 'pdf', filename: file.name, data })
      } else {
        const text = await parseExcel(file)
        setAttachment({ type: 'excel', filename: file.name, text })
      }
    } catch (e: any) {
      alert(`Error al leer el archivo: ${e.message}`)
    }
    setAttLoading(false)
  }

  // ── Gestión de custom skills ────────────────────────────────────────────────
  function saveSkill() {
    if (!editSkill?.label || !editSkill?.prompt) return
    const id = editSkill.id ?? crypto.randomUUID()
    const skill: CustomSkill = {
      id, icon: editSkill.icon || '⚡', label: editSkill.label,
      desc: editSkill.desc || '', prompt: editSkill.prompt,
    }
    setCustomSkills(prev => {
      const exists = prev.find(s => s.id === id)
      return exists ? prev.map(s => s.id === id ? skill : s) : [...prev, skill]
    })
    setEditSkill(null)
  }

  function deleteSkill(id: string) {
    setCustomSkills(prev => prev.filter(s => s.id !== id))
    // Si algún hilo usa esa skill, volver a general
    setThreads(prev => prev.map(t => t.skill === id ? { ...t, skill: 'general' } : t))
  }

  const allSkills = [
    ...Object.entries(BUILTIN).map(([id, s]) => ({ id, icon: s.icon, label: s.label, custom: false })),
    ...customSkills.map(s => ({ id: s.id, icon: s.icon, label: s.label, custom: true })),
  ]

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 57px)', overflow: 'hidden' }}>

      {/* ── SIDEBAR ── */}
      <aside style={{ width: '236px', flexShrink: 0, borderRight: '0.5px solid var(--gold-border)', background: 'var(--bg-1)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <div style={{ padding: '1.1rem 1rem 0.5rem', fontSize: '9px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-3)' }}>
          IA Privada
        </div>

        {/* Hilos */}
        {threads.map((t, idx) => {
          const s = getSkill(t.skill, customSkills)
          const active = idx === activeIdx
          return (
            <div key={t.id} onClick={() => { setActiveIdx(idx); setEditingName(null) }}
              style={{ margin: '0 0.5rem 0.3rem', padding: '9px 11px', borderRadius: '10px', cursor: 'pointer', background: active ? 'var(--bg-3)' : 'transparent', border: `0.5px solid ${active ? 'var(--gold-border)' : 'transparent'}`, transition: 'all 0.15s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '3px' }}>
                <span style={{ fontSize: '14px', flexShrink: 0 }}>{s.icon}</span>
                {editingName === idx
                  ? <input autoFocus value={t.nombre}
                      onChange={e => updateThread(idx, { nombre: e.target.value })}
                      onBlur={() => setEditingName(null)}
                      onKeyDown={e => e.key === 'Enter' && setEditingName(null)}
                      onClick={e => e.stopPropagation()}
                      style={{ flex: 1, background: 'transparent', border: 'none', borderBottom: '1px solid var(--gold-200)', color: 'var(--text-0)', fontSize: '12px', outline: 'none' }} />
                  : <span style={{ fontSize: '12px', fontWeight: 600, color: active ? 'var(--text-0)' : 'var(--text-2)', flex: 1 }}
                      onDoubleClick={e => { e.stopPropagation(); setEditingName(idx) }} title="Doble clic para renombrar">
                      {t.nombre}
                    </span>
                }
              </div>
              <div style={{ fontSize: '10px', color: 'var(--gold-200)', marginLeft: '21px' }}>{s.label}</div>
              {active && (
                <div style={{ marginTop: '9px', marginLeft: '21px' }} onClick={e => e.stopPropagation()}>
                  <select value={t.skill} onChange={e => updateThread(idx, { skill: e.target.value })}
                    style={{ fontSize: '10px', background: 'var(--bg-0)', border: '0.5px solid var(--gold-border)', borderRadius: '6px', color: 'var(--text-2)', padding: '4px 6px', width: '100%', cursor: 'pointer' }}>
                    <optgroup label="Predefinidas">
                      {Object.entries(BUILTIN).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                    </optgroup>
                    {customSkills.length > 0 && (
                      <optgroup label="Mis skills">
                        {customSkills.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
                      </optgroup>
                    )}
                  </select>
                  {t.messages.length > 0 && (
                    <button onClick={() => updateThread(idx, { messages: [] })}
                      style={{ marginTop: '5px', fontSize: '9px', color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                      🗑 Limpiar hilo
                    </button>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {/* Skills section */}
        <div style={{ margin: '0.75rem 0.5rem 0', borderTop: '0.5px solid var(--gold-border)', paddingTop: '0.75rem' }}>
          <button onClick={() => setShowSkills(s => !s)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '7px 10px', borderRadius: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', fontSize: '11px', fontWeight: 600 }}>
            <span>⚡ Skills personalizadas</span>
            <span style={{ fontSize: '9px', transition: 'transform 0.2s', transform: showSkills ? 'rotate(180deg)' : 'none' }}>▾</span>
          </button>

          {showSkills && (
            <div style={{ paddingBottom: '0.5rem' }}>
              {customSkills.map(s => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '5px 10px', fontSize: '11px', color: 'var(--text-2)' }}>
                  <span>{s.icon}</span>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
                  <button onClick={() => setEditSkill(s)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', color: 'var(--gold-200)', padding: '2px' }}>✏️</button>
                  <button onClick={() => deleteSkill(s.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '10px', color: '#e05', padding: '2px' }}>✕</button>
                </div>
              ))}
              <button onClick={() => setEditSkill({ icon: '⚡', label: '', desc: '', prompt: '' })}
                style={{ margin: '4px 10px', padding: '5px 10px', fontSize: '10px', color: 'var(--gold-200)', background: 'var(--bg-0)', border: '0.5px solid var(--gold-border)', borderRadius: '6px', cursor: 'pointer', width: 'calc(100% - 20px)' }}>
                + Nueva skill
              </button>
            </div>
          )}
        </div>

        {/* Base de clientes */}
        <div style={{ margin: '0.5rem 0.5rem 0', borderTop: '0.5px solid var(--gold-border)', paddingTop: '0.5rem' }}>
          <a href="/backoffice/base-clientes"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', textDecoration: 'none', color: 'var(--text-2)', fontSize: '11px', transition: 'all 0.15s' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-3)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            <span>📁</span> Base de contactos
          </a>
        </div>
      </aside>

      {/* ── CHAT ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg-0)', minWidth: 0, position: 'relative' }}>

        {/* Modal de skill editor */}
        {editSkill && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={() => setEditSkill(null)}>
            <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '16px', padding: '2rem', width: '100%', maxWidth: '480px', margin: '1rem' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-0)', marginBottom: '1.25rem' }}>
                {editSkill.id ? 'Editar skill' : 'Nueva skill'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Icono</label>
                  <input value={editSkill.icon ?? ''} onChange={e => setEditSkill(s => ({ ...s, icon: e.target.value }))}
                    style={{ width: '100%', background: 'var(--bg-3)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', padding: '8px', color: 'var(--text-0)', fontSize: '20px', textAlign: 'center', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ fontSize: '10px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Nombre *</label>
                  <input value={editSkill.label ?? ''} onChange={e => setEditSkill(s => ({ ...s, label: e.target.value }))}
                    placeholder="Ej: Redactor de contratos"
                    style={{ width: '100%', background: 'var(--bg-3)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', padding: '8px 10px', color: 'var(--text-0)', fontSize: '13px', outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ marginBottom: '0.75rem' }}>
                <label style={{ fontSize: '10px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Descripción breve</label>
                <input value={editSkill.desc ?? ''} onChange={e => setEditSkill(s => ({ ...s, desc: e.target.value }))}
                  placeholder="Ej: Especialista en contratos inmobiliarios"
                  style={{ width: '100%', background: 'var(--bg-3)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', padding: '8px 10px', color: 'var(--text-0)', fontSize: '12px', outline: 'none', boxSizing: 'border-box' }} />
              </div>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ fontSize: '10px', color: 'var(--text-3)', display: 'block', marginBottom: '4px' }}>Instrucciones del sistema (prompt) *</label>
                <textarea value={editSkill.prompt ?? ''} onChange={e => setEditSkill(s => ({ ...s, prompt: e.target.value }))}
                  rows={6} placeholder="Eres un asistente especializado en… Tu rol es… Responde siempre en español."
                  style={{ width: '100%', background: 'var(--bg-3)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', padding: '10px', color: 'var(--text-0)', fontSize: '12px', resize: 'vertical', lineHeight: 1.6, outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button onClick={() => setEditSkill(null)}
                  style={{ padding: '8px 18px', borderRadius: '8px', background: 'transparent', border: '0.5px solid var(--gold-border)', color: 'var(--text-2)', fontSize: '12px', cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={saveSkill} disabled={!editSkill.label || !editSkill.prompt}
                  style={{ padding: '8px 18px', borderRadius: '8px', background: (!editSkill.label || !editSkill.prompt) ? 'var(--bg-3)' : 'linear-gradient(135deg,#C9A043,#a07828)', border: 'none', color: '#0a0a0a', fontSize: '12px', fontWeight: 700, cursor: 'pointer', opacity: (!editSkill.label || !editSkill.prompt) ? 0.5 : 1 }}>
                  Guardar skill
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <div style={{ padding: '0.9rem 1.5rem', borderBottom: '0.5px solid var(--gold-border)', background: 'var(--bg-1)', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '22px' }}>{skill.icon}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-0)' }}>{thread.nombre} · {skill.label}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{skill.desc}</div>
          </div>
        </div>

        {/* Mensajes */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {thread.messages.length === 0 && (
            <div style={{ margin: 'auto', textAlign: 'center', maxWidth: '420px' }}>
              <div style={{ fontSize: '40px', marginBottom: '1rem' }}>{skill.icon}</div>
              <div style={{ fontSize: '1.05rem', fontWeight: 500, color: 'var(--text-0)', marginBottom: '0.35rem' }}>{skill.label}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-3)', marginBottom: '1.75rem' }}>{skill.desc}</div>
              {'suggestions' in skill && (skill as any).suggestions.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(skill as any).suggestions.map((s: string, i: number) => (
                    <button key={i} onClick={() => send(s)}
                      style={{ padding: '9px 14px', borderRadius: '10px', background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', color: 'var(--text-1)', fontSize: '12px', cursor: 'pointer', textAlign: 'left', lineHeight: 1.5 }}>
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {thread.messages.map((msg, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '8px', alignItems: 'flex-end' }}>
              {msg.role === 'assistant' && (
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'var(--bg-3)', border: '0.5px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', flexShrink: 0 }}>
                  {skill.icon}
                </div>
              )}
              <div style={{
                maxWidth: '72%', padding: '10px 14px',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.role === 'user' ? 'linear-gradient(135deg,#C9A043,#a07828)' : 'var(--bg-2)',
                color: msg.role === 'user' ? '#0a0a0a' : 'var(--text-0)',
                fontSize: '13px', lineHeight: 1.65,
                border: msg.role === 'assistant' ? '0.5px solid var(--gold-border)' : 'none',
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              }}>
                {msg.content || <span style={{ opacity: 0.35 }}>● ● ●</span>}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ padding: '0.9rem 1.5rem', borderTop: '0.5px solid var(--gold-border)', background: 'var(--bg-1)' }}>
          {/* Preview adjunto */}
          {attachment && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', padding: '7px 12px', background: 'var(--bg-2)', borderRadius: '8px', border: '0.5px solid var(--gold-border)' }}>
              <span style={{ fontSize: '14px' }}>{attachment.type === 'pdf' ? '📄' : '📊'}</span>
              <span style={{ fontSize: '11px', color: 'var(--text-1)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {attachment.filename}
                <span style={{ color: 'var(--text-3)', marginLeft: '6px' }}>
                  {attachment.type === 'pdf' ? 'PDF' : 'Excel'} · listo para enviar
                </span>
              </span>
              <button onClick={() => setAttachment(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '12px', color: 'var(--text-3)', padding: '2px 4px' }}>✕</button>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', padding: '9px 12px' }}>
            {/* Botón adjuntar */}
            <button onClick={() => fileRef.current?.click()} disabled={attLoading || streaming}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', opacity: (attLoading || streaming) ? 0.4 : 0.7, padding: '2px', flexShrink: 0, lineHeight: 1 }}
              title="Adjuntar Excel o PDF">
              {attLoading ? '⏳' : '📎'}
            </button>
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.pdf" onChange={handleFile} style={{ display: 'none' }} />

            <textarea ref={textareaRef} value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder={attachment ? 'Añade un mensaje o envía solo el archivo…' : `Mensaje para ${skill.label}…`}
              disabled={streaming}
              rows={1}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text-0)', fontSize: '13px', resize: 'none', lineHeight: 1.55, maxHeight: '120px', fontFamily: 'inherit' }}
            />
            <button onClick={() => send()} disabled={streaming || (!input.trim() && !attachment)}
              style={{ background: (streaming || (!input.trim() && !attachment)) ? 'var(--bg-3)' : 'linear-gradient(135deg,#C9A043,#a07828)', border: 'none', borderRadius: '9px', padding: '6px 14px', color: '#0a0a0a', fontSize: '13px', fontWeight: 700, cursor: 'pointer', flexShrink: 0, opacity: (streaming || (!input.trim() && !attachment)) ? 0.5 : 1 }}>
              {streaming ? '⏳' : '→'}
            </button>
          </div>
          <div style={{ fontSize: '9px', color: 'var(--text-3)', marginTop: '5px', textAlign: 'right' }}>
            📎 Excel (.xlsx, .csv) · PDF · Enter para enviar · Shift+Enter salto de línea
          </div>
        </div>
      </div>
    </div>
  )
}
