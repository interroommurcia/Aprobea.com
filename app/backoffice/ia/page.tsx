'use client'

import { useEffect, useState } from 'react'

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

export default function IAPage() {
  const [protocolo, setProtocolo] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [testMsg, setTestMsg] = useState('')
  const [testReply, setTestReply] = useState('')
  const [testing, setTesting] = useState(false)
  const [chatHistory, setChatHistory] = useState<{role: string, content: string}[]>([])

  useEffect(() => {
    fetch('/api/backoffice/config')
      .then(r => r.json())
      .then(d => {
        setProtocolo(d.ia_protocolo || PROTOCOLO_DEFAULT)
        setLoading(false)
      })
  }, [])

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
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n')) {
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

  return (
    <div style={{ padding: '2.5rem 3rem', maxWidth: '1100px' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.5rem' }}>Inteligencia Artificial</div>
        <h1 className="serif" style={{ fontSize: '2.2rem', fontWeight: 300, color: 'var(--text-0)' }}>Asistente IA</h1>
        <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', marginTop: '0.5rem' }}>
          Edita los protocolos que definen cómo responde la IA a tus clientes. Guarda los cambios y pruébalos en tiempo real.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: '2rem' }}>

        {/* ── EDITOR DE PROTOCOLOS ── */}
        <div>
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
                  width: '100%', minHeight: '480px', padding: '1.25rem 1.5rem',
                  background: 'transparent', border: 'none', outline: 'none', resize: 'vertical',
                  fontFamily: 'monospace', fontSize: '13px', lineHeight: 1.7,
                  color: 'var(--text-1)', boxSizing: 'border-box',
                }}
              />
            )}
          </div>

          {/* Tips */}
          <div style={{ marginTop: '1rem', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            {[
              { icon: '🎯', title: 'Tono', desc: 'Define si quieres formal, cercano, técnico…' },
              { icon: '📋', title: 'Reglas', desc: 'Indica qué puede y qué NO puede decir la IA' },
              { icon: '📞', title: 'Escalado', desc: 'Cuándo derivar al equipo humano' },
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

            {/* Mensajes */}
            <div style={{ flex: 1, padding: '1rem', overflowY: 'auto', minHeight: '280px', maxHeight: '400px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {chatHistory.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '0.8rem', marginTop: '2rem' }}>
                  Escribe un mensaje para probar la IA con el protocolo actual
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

            {/* Input */}
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
