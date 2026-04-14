'use client'

import { useEffect, useState, useRef } from 'react'

const PROTOCOLO_DEFAULT = `Eres el asistente virtual de GrupoSkyLine Investment, una firma española especializada en inversión NPL (Non-Performing Loans) y crowdfunding inmobiliario.

TONO: Profesional, cercano y conciso. Responde siempre en el idioma del cliente.

INFORMACIÓN CLAVE:
- Inversión NPL: mínimo 80.000€, requiere justificante de previsión de fondos, acceso por invitación, sin cuota de membresía
- Crowdfunding inmobiliario: mínimo 5.000€, membresía anual 60€ + IVA (concepto: consigna de documento y capital)
- Web: gruposkyline.org
- Contacto: hola@gruposkyline.org

REGLAS:
1. Si preguntan por rentabilidades concretas, di que depende de cada operación y que un asesor les informará
2. Si quieren reunión o más info, redirige a hola@gruposkyline.org o al botón "Acceder" de la web
3. No inventes datos, operaciones ni precios que no estén en los protocolos
4. Si no puedes resolver la duda, ofrece escalar al equipo humano
5. Respuestas cortas y directas — máximo 3-4 frases por respuesta`

type Documento = { id: string; nombre: string; created_at: string; caracteres: number }

export default function IAPage() {
  const [protocolo, setProtocolo] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  // Chat de prueba
  const [testMsg, setTestMsg] = useState('')
  const [testReply, setTestReply] = useState('')
  const [testing, setTesting] = useState(false)
  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([])

  // Documentos
  const [docs, setDocs] = useState<Documento[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadOk, setUploadOk] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/backoffice/config')
      .then(r => r.json())
      .then(d => {
        setProtocolo(d.ia_protocolo || PROTOCOLO_DEFAULT)
        setLoading(false)
      })
    loadDocs()
  }, [])

  function loadDocs() {
    fetch('/api/backoffice/documentos')
      .then(r => r.json())
      .then(d => Array.isArray(d) ? setDocs(d) : null)
  }

  async function handleSave() {
    setSaving(true)
    await fetch('/api/backoffice/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ia_protocolo: protocolo }),
    })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError('')
    setUploadOk('')
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/backoffice/documentos/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
    if (!res.ok) {
      setUploadError(data.error ?? 'Error al subir')
    } else {
      setUploadOk(`"${data.nombre}" subido correctamente`)
      setTimeout(() => setUploadOk(''), 3000)
      loadDocs()
    }
  }

  async function handleDelete(id: string, nombre: string) {
    if (!confirm(`¿Eliminar "${nombre}"?`)) return
    await fetch('/api/backoffice/documentos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    loadDocs()
  }

  async function handleTest(e: React.FormEvent) {
    e.preventDefault()
    if (!testMsg.trim()) return
    setTesting(true)
    const newHistory = [...chatHistory, { role: 'user', content: testMsg }]
    setChatHistory(newHistory)
    setTestMsg('')
    setTestReply('')

    const res = await fetch('/api/ia/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: newHistory }),
    })

    const reader = res.body?.getReader()
    const decoder = new TextDecoder()
    let full = ''
    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value).split('\n')) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const { text } = JSON.parse(line.slice(6))
              if (text) { full += text; setTestReply(f => f + text) }
            } catch {}
          }
        }
      }
    }
    setChatHistory(h => [...h, { role: 'assistant', content: full }])
    setTesting(false)
  }

  function fmtSize(chars: number) {
    if (chars > 1000) return `~${Math.round(chars / 1000)}k chars`
    return `${chars} chars`
  }

  return (
    <div style={{ padding: '2.5rem 3rem', maxWidth: '1200px' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.5rem' }}>Inteligencia Artificial</div>
        <h1 className="serif" style={{ fontSize: '2.2rem', fontWeight: 300, color: 'var(--text-0)' }}>Asistente IA</h1>
        <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', marginTop: '0.5rem' }}>
          Edita los protocolos, sube documentos PDF y prueba la IA en tiempo real.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem' }}>

        {/* ── COLUMNA IZQUIERDA ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* EDITOR DE PROTOCOLOS */}
          <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '0.5px solid var(--gold-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-0)', marginBottom: '2px' }}>Protocolo del asistente</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>Define el comportamiento, tono y límites de la IA</div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                {saved && <span style={{ fontSize: '11px', color: '#6dc86d' }}>✓ Guardado</span>}
                <button
                  onClick={() => setProtocolo(PROTOCOLO_DEFAULT)}
                  style={{ background: 'transparent', border: '0.5px solid var(--gold-border)', color: 'var(--text-2)', padding: '6px 12px', borderRadius: 'var(--radius)', fontSize: '11px', cursor: 'pointer' }}
                >
                  Restaurar defecto
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  style={{ background: 'var(--gold-200)', border: 'none', color: 'var(--bg-0)', padding: '6px 16px', borderRadius: 'var(--radius)', fontSize: '11px', cursor: 'pointer', fontWeight: 600, opacity: saving ? 0.7 : 1 }}
                >
                  {saving ? 'Guardando…' : 'Guardar'}
                </button>
              </div>
            </div>

            {loading ? (
              <div style={{ padding: '2rem', color: 'var(--text-2)' }}>Cargando…</div>
            ) : (
              <textarea
                value={protocolo}
                onChange={e => setProtocolo(e.target.value)}
                style={{
                  width: '100%', minHeight: '320px', padding: '1.25rem 1.5rem',
                  background: 'transparent', border: 'none', outline: 'none', resize: 'vertical',
                  fontFamily: 'monospace', fontSize: '13px', lineHeight: 1.7,
                  color: 'var(--text-1)', boxSizing: 'border-box',
                }}
              />
            )}
          </div>

          {/* DOCUMENTOS PDF */}
          <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '0.5px solid var(--gold-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-0)', marginBottom: '2px' }}>Base de conocimiento</div>
                <div style={{ fontSize: '11px', color: 'var(--text-3)' }}>PDFs que la IA usará para responder con precisión</div>
              </div>
              <label style={{ background: 'var(--gold-200)', border: 'none', color: 'var(--bg-0)', padding: '6px 16px', borderRadius: 'var(--radius)', fontSize: '11px', cursor: 'pointer', fontWeight: 600, opacity: uploading ? 0.6 : 1 }}>
                {uploading ? 'Subiendo…' : '+ Subir PDF'}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf"
                  onChange={handleUpload}
                  disabled={uploading}
                  style={{ display: 'none' }}
                />
              </label>
            </div>

            {/* Feedback upload */}
            {(uploadError || uploadOk) && (
              <div style={{ padding: '0.75rem 1.5rem', background: uploadError ? 'rgba(224,86,86,0.08)' : 'rgba(109,200,109,0.08)', borderBottom: '0.5px solid var(--gold-border)', fontSize: '12px', color: uploadError ? '#e05656' : '#6dc86d' }}>
                {uploadError || uploadOk}
              </div>
            )}

            {/* Lista de documentos */}
            <div style={{ padding: '0.75rem 0' }}>
              {docs.length === 0 ? (
                <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '12px' }}>
                  No hay documentos. Sube un PDF para entrenar a la IA.
                </div>
              ) : (
                docs.map(doc => (
                  <div key={doc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 1.5rem', borderBottom: '0.5px solid rgba(201,160,67,0.07)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                      <span style={{ fontSize: '18px', flexShrink: 0 }}>📄</span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '12px', color: 'var(--text-1)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nombre}</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                          {fmtSize(doc.caracteres)} · {new Date(doc.created_at).toLocaleDateString('es-ES')}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDelete(doc.id, doc.nombre)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '16px', padding: '4px 8px', flexShrink: 0 }}
                      title="Eliminar"
                    >🗑</button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Tips */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            {[
              { icon: '🎯', title: 'Tono', desc: 'Define si quieres formal, cercano, técnico…' },
              { icon: '📋', title: 'Reglas', desc: 'Indica qué puede y qué NO puede decir la IA' },
              { icon: '📄', title: 'Documentos', desc: 'Sube dossiers, FAQs o contratos en PDF' },
            ].map(tip => (
              <div key={tip.title} style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius)', padding: '0.75rem 1rem' }}>
                <div style={{ fontSize: '16px', marginBottom: '4px' }}>{tip.icon}</div>
                <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-1)', marginBottom: '2px' }}>{tip.title}</div>
                <div style={{ fontSize: '10px', color: 'var(--text-3)', lineHeight: 1.5 }}>{tip.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── PANEL DE PRUEBA ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Info modelo */}
          <div style={{ background: 'rgba(201,160,67,0.06)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.5rem' }}>Modelo activo</div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--gold-100)', marginBottom: '4px' }}>Claude Haiku 4.5</div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', lineHeight: 1.6 }}>
              ~0,25€ / millón de tokens entrada<br />
              Estimado: <span style={{ color: 'var(--text-1)' }}>&lt; 3€ / mes</span> para atención al cliente
            </div>
          </div>

          {/* Chat de prueba */}
          <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid var(--gold-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-0)' }}>Probar asistente</div>
              {chatHistory.length > 0 && (
                <button onClick={() => { setChatHistory([]); setTestReply('') }}
                  style={{ fontSize: '10px', color: 'var(--text-3)', background: 'none', border: 'none', cursor: 'pointer' }}>
                  Limpiar
                </button>
              )}
            </div>

            <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', minHeight: '280px', maxHeight: '400px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {chatHistory.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '0.8rem', marginTop: '2rem' }}>
                  Escribe un mensaje para probar la IA con el protocolo y documentos actuales
                </div>
              )}
              {chatHistory.map((m, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '85%', padding: '0.6rem 0.9rem', borderRadius: '12px',
                    fontSize: '12px', lineHeight: 1.6,
                    background: m.role === 'user' ? 'var(--gold-200)' : 'var(--bg-1)',
                    color: m.role === 'user' ? 'var(--bg-0)' : 'var(--text-1)',
                    border: m.role === 'assistant' ? '0.5px solid var(--gold-border)' : 'none',
                  }}>
                    {m.content}
                  </div>
                </div>
              ))}
              {testing && testReply && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ maxWidth: '85%', padding: '0.6rem 0.9rem', borderRadius: '12px', fontSize: '12px', lineHeight: 1.6, background: 'var(--bg-1)', color: 'var(--text-1)', border: '0.5px solid var(--gold-border)' }}>
                    {testReply}<span style={{ opacity: 0.5 }}>▌</span>
                  </div>
                </div>
              )}
              {testing && !testReply && (
                <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                  <div style={{ padding: '0.6rem 0.9rem', borderRadius: '12px', fontSize: '12px', background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', color: 'var(--text-3)' }}>
                    Pensando…
                  </div>
                </div>
              )}
            </div>

            <form onSubmit={handleTest} style={{ padding: '0.75rem', borderTop: '0.5px solid var(--gold-border)', display: 'flex', gap: '0.5rem' }}>
              <input
                className="form-input"
                style={{ flex: 1, fontSize: '12px', padding: '8px 12px' }}
                placeholder="Escribe una pregunta de prueba…"
                value={testMsg}
                onChange={e => setTestMsg(e.target.value)}
                disabled={testing}
              />
              <button
                type="submit"
                disabled={testing || !testMsg.trim()}
                style={{ background: 'var(--gold-200)', border: 'none', color: 'var(--bg-0)', padding: '8px 14px', borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: '13px', fontWeight: 700, opacity: (testing || !testMsg.trim()) ? 0.5 : 1 }}
              >
                →
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
