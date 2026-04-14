/**
 * POST /api/ia/chat-cliente
 * Chat IA autenticado para clientes del dashboard.
 * Límites de gasto según tipo_inversor:
 *   - crowdfunding: 0,10€/día  → luego modo gratuito
 *   - npl:          1,00€/semana → luego modo gratuito
 */
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' })

// Precios Claude Haiku en EUR (aproximado)
const EUR_PER_INPUT_TOKEN  = 0.74  / 1_000_000   // €0.74/M input
const EUR_PER_OUTPUT_TOKEN = 3.70  / 1_000_000   // €3.70/M output

const LIMITES: Record<string, { importe: number; periodo: 'dia' | 'semana' }> = {
  crowdfunding: { importe: 0.10, periodo: 'dia' },
  npl:          { importe: 1.00, periodo: 'semana' },
  hipotecario:  { importe: 0.10, periodo: 'dia' },
}

function fechaDesde(periodo: 'dia' | 'semana'): string {
  const ahora = new Date()
  if (periodo === 'dia') return ahora.toISOString().slice(0, 10)
  const diaSemana = ahora.getDay() === 0 ? 6 : ahora.getDay() - 1
  const lunes = new Date(ahora)
  lunes.setDate(ahora.getDate() - diaSemana)
  return lunes.toISOString().slice(0, 10)
}

function buscarEnDocs(pregunta: string, docs: { nombre: string; contenido: string }[]): string {
  const palabras = pregunta.toLowerCase().split(/\s+/).filter(p => p.length > 3)
  let mejorParrafo = ''
  let mejorScore = 0

  for (const doc of docs) {
    const parrafos = doc.contenido.split(/\n{1,}/).filter(p => p.length > 60)
    for (const parrafo of parrafos) {
      const pLower = parrafo.toLowerCase()
      const score = palabras.filter(p => pLower.includes(p)).length
      if (score > mejorScore) { mejorScore = score; mejorParrafo = parrafo.slice(0, 500) }
    }
  }

  return mejorParrafo || 'Para resolver tu consulta, contacta con nuestro equipo en hola@gruposkyline.org o solicita una cita desde la web.'
}

export async function POST(req: NextRequest) {
  // 1. Autenticación
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 })

  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401 })

  // 2. Datos del cliente
  const { data: cliente } = await supabaseAdmin
    .from('clientes')
    .select('id, tipo_inversor')
    .eq('user_id', user.id)
    .single()
  if (!cliente) return new Response(JSON.stringify({ error: 'Cliente no encontrado' }), { status: 404 })

  const { messages } = await req.json()
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages requerido' }), { status: 400 })
  }

  // 3. Comprobar límite de gasto
  const limiteConfig = LIMITES[cliente.tipo_inversor] ?? LIMITES.crowdfunding
  const desde = fechaDesde(limiteConfig.periodo)

  const { data: usos } = await supabaseAdmin
    .from('ia_uso_clientes')
    .select('coste_eur')
    .eq('cliente_id', cliente.id)
    .gte('fecha', desde)

  const gastoActual = (usos ?? []).reduce((s, r: any) => s + (r.coste_eur ?? 0), 0)
  const modoGratuito = gastoActual >= limiteConfig.importe

  // 4. Cargar protocolo + documentos
  const [{ data: cfg }, { data: docs }] = await Promise.all([
    supabaseAdmin.from('configuracion').select('value').eq('key', 'ia_protocolo').single(),
    supabaseAdmin.from('ia_documentos').select('nombre, contenido').order('created_at', { ascending: false }),
  ])

  const PROTOCOLO_DEFAULT = `Eres el asistente virtual de GrupoSkyLine Investment. Responde de forma profesional, cercana y concisa. Responde siempre en el idioma del cliente.`
  let systemPrompt = cfg?.value || PROTOCOLO_DEFAULT

  const encoder = new TextEncoder()

  // ── MODO GRATUITO ────────────────────────────────────────────────
  if (modoGratuito) {
    const lastMsg = messages[messages.length - 1]?.content ?? ''
    const respuesta = buscarEnDocs(lastMsg, docs ?? [])
    const periodoLabel = limiteConfig.periodo === 'dia'
      ? `diario (0,10 €)` : `semanal (1,00 €)`
    const texto = `[Modo básico activo — límite ${periodoLabel} alcanzado]\n\n${respuesta}`

    const stream = new ReadableStream({
      start(controller) {
        const chunks = texto.split(' ')
        let i = 0
        const tick = setInterval(() => {
          if (i >= chunks.length) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
            clearInterval(tick)
            return
          }
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ text: (i === 0 ? '' : ' ') + chunks[i], modo: 'gratuito' })}\n\n`
          ))
          i++
        }, 25)
      },
    })
    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } })
  }

  // ── MODO PREMIUM: Claude Haiku ────────────────────────────────────
  if (docs && docs.length > 0) {
    const docsText = docs
      .map((d: any) => `--- ${d.nombre} ---\n${d.contenido.slice(0, 6000)}`)
      .join('\n\n')
    systemPrompt += `\n\nBASE DE CONOCIMIENTO:\n\n${docsText}`
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let inputTokens = 0
        let outputTokens = 0

        const response = await anthropic.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          system: systemPrompt,
          messages: messages.slice(-10),
        })

        for await (const chunk of response) {
          if (chunk.type === 'message_start' && chunk.message?.usage) {
            inputTokens = chunk.message.usage.input_tokens ?? 0
          }
          if (chunk.type === 'message_delta' && (chunk as any).usage) {
            outputTokens = (chunk as any).usage.output_tokens ?? 0
          }
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            controller.enqueue(encoder.encode(
              `data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`
            ))
          }
        }

        // Registrar uso
        const coste = inputTokens * EUR_PER_INPUT_TOKEN + outputTokens * EUR_PER_OUTPUT_TOKEN
        await supabaseAdmin.from('ia_uso_clientes').insert({
          cliente_id: cliente.id,
          fecha: new Date().toISOString().slice(0, 10),
          tokens_entrada: inputTokens,
          tokens_salida: outputTokens,
          coste_eur: coste,
        })

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      } catch (e: any) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: e.message })}\n\n`))
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' },
  })
}
