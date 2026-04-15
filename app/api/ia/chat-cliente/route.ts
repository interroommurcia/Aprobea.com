/**
 * POST /api/ia/chat-cliente
 * Chat IA autenticado para clientes del dashboard.
 *
 * Herramientas disponibles (por prioridad):
 *   1. enviar_mensaje  → mensaje async al equipo en el chat de backoffice (DEFAULT)
 *   2. solicitar_cita  → llamada telefónica (solo si muchas dudas o proceso de compra)
 *
 * Límites de gasto por tipo_inversor:
 *   - crowdfunding: 0,10€/día  → modo gratuito
 *   - npl:          1,00€/semana → modo gratuito
 */
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' })

const EUR_PER_INPUT_TOKEN  = 0.74  / 1_000_000
const EUR_PER_OUTPUT_TOKEN = 3.70  / 1_000_000

const LIMITES: Record<string, { importe: number; periodo: 'dia' | 'semana' }> = {
  crowdfunding: { importe: 0.10, periodo: 'dia' },
  npl:          { importe: 1.00, periodo: 'semana' },
  hipotecario:  { importe: 0.10, periodo: 'dia' },
}

// ── HERRAMIENTA 1: mensaje al equipo (prioridad por defecto) ──
const MENSAJE_TOOL: Anthropic.Tool = {
  name: 'enviar_mensaje',
  description: `Envía un mensaje escrito al equipo de GrupoSkyLine a través del chat interno del dashboard.
Úsala cuando el cliente necesite ayuda, tenga alguna consulta específica, quiera información adicional o pida hablar con alguien del equipo.
Es la opción preferida: el equipo responde en horario de oficina y el cliente puede ver la respuesta en la pestaña Mensajes.
NO la uses si el cliente tiene muchas dudas acumuladas, está en proceso de invertir, o pide explícitamente una llamada.`,
  input_schema: {
    type: 'object' as const,
    properties: {
      asunto: {
        type: 'string',
        description: 'Asunto o título breve del mensaje, ej: "Consulta sobre rentabilidad NPL".',
      },
      contenido: {
        type: 'string',
        description: 'Texto completo del mensaje que se enviará al equipo, redactado en nombre del cliente de forma clara y completa.',
      },
    },
    required: ['asunto', 'contenido'],
  },
}

// ── HERRAMIENTA 2: llamada con el equipo (solo casos complejos) ──
const CITA_TOOL: Anthropic.Tool = {
  name: 'solicitar_cita',
  description: `Agenda una llamada telefónica con el equipo de GrupoSkyLine.
Úsala ÚNICAMENTE en estas situaciones:
- El cliente tiene múltiples dudas acumuladas que no se resuelven con un mensaje escrito.
- El cliente está en medio de un proceso de inversión o firma y necesita guía inmediata.
- El cliente pide explícitamente hablar por teléfono o necesita atención personalizada urgente.
En todos los demás casos usa enviar_mensaje.`,
  input_schema: {
    type: 'object' as const,
    properties: {
      fecha_propuesta: {
        type: 'string',
        description: 'Fecha propuesta en formato YYYY-MM-DD. Si el cliente dice "el viernes" calcula la fecha. Si no menciona fecha, omite este campo.',
      },
      hora_propuesta: {
        type: 'string',
        description: 'Hora propuesta en formato HH:MM. Si no menciona hora, omite este campo.',
      },
      mensaje: {
        type: 'string',
        description: 'Motivo de la llamada: resume brevemente la situación y por qué necesita hablar con el equipo.',
      },
    },
    required: ['mensaje'],
  },
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
    const parrafos = doc.contenido.split(/\n+/).filter(p => p.length > 60)
    for (const parrafo of parrafos) {
      const score = palabras.filter(p => parrafo.toLowerCase().includes(p)).length
      if (score > mejorScore) { mejorScore = score; mejorParrafo = parrafo.slice(0, 500) }
    }
  }
  return mejorParrafo || 'Para más información contacta con nuestro equipo en hola@gruposkyline.org'
}

function streamTexto(texto: string, encoder: TextEncoder, extra?: Record<string, unknown>): ReadableStream {
  return new ReadableStream({
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
          `data: ${JSON.stringify({ text: (i === 0 ? '' : ' ') + chunks[i], ...extra })}\n\n`
        ))
        i++
      }, 22)
    },
  })
}

// Busca o crea una conversación activa del cliente en backoffice
async function getOCreateConversacion(clienteId: string): Promise<string> {
  const { data: existing } = await supabaseAdmin
    .from('conversaciones')
    .select('id')
    .eq('cliente_id', clienteId)
    .eq('activa', true)
    .order('ultimo_mensaje_at', { ascending: false })
    .limit(1)
    .single()

  if (existing?.id) return existing.id

  const { data: nueva } = await supabaseAdmin
    .from('conversaciones')
    .insert({ cliente_id: clienteId, activa: true, no_leidos_admin: 1, no_leidos_cliente: 0 })
    .select('id')
    .single()

  return nueva!.id
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 })

  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401 })

  const { data: cliente } = await supabaseAdmin
    .from('clientes')
    .select('id, tipo_inversor, nombre, apellidos')
    .eq('user_id', user.id)
    .single()
  if (!cliente) return new Response(JSON.stringify({ error: 'Cliente no encontrado' }), { status: 404 })

  const { messages } = await req.json()
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages requerido' }), { status: 400 })
  }

  // Comprobar límite de gasto
  const limiteConfig = LIMITES[cliente.tipo_inversor] ?? LIMITES.crowdfunding
  const desde = fechaDesde(limiteConfig.periodo)
  const { data: usos } = await supabaseAdmin
    .from('ia_uso_clientes').select('coste_eur').eq('cliente_id', cliente.id).gte('fecha', desde)
  const gastoActual = (usos ?? []).reduce((s, r: any) => s + (r.coste_eur ?? 0), 0)
  const modoGratuito = gastoActual >= limiteConfig.importe

  const [{ data: cfg }, { data: docs }] = await Promise.all([
    supabaseAdmin.from('configuracion').select('value').eq('key', 'ia_protocolo').single(),
    supabaseAdmin.from('ia_documentos').select('nombre, contenido').order('created_at', { ascending: false }),
  ])

  const encoder = new TextEncoder()
  const SSE_HEADERS = { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive' }

  // ── MODO GRATUITO ──────────────────────────────────────────────
  if (modoGratuito) {
    const lastMsg = messages[messages.length - 1]?.content ?? ''
    const periodoLabel = limiteConfig.periodo === 'dia' ? 'diario (0,10 €)' : 'semanal (1,00 €)'
    const texto = `[Modo básico activo — límite ${periodoLabel} alcanzado]\n\n${buscarEnDocs(lastMsg, docs ?? [])}`
    return new Response(streamTexto(texto, encoder, { modo: 'gratuito' }), { headers: SSE_HEADERS })
  }

  // ── MODO PREMIUM ───────────────────────────────────────────────
  const PROTOCOLO_DEFAULT = `Eres el asistente de inversiones de GrupoSkyLine. Responde de forma profesional, cercana y concisa. Responde siempre en el idioma del cliente.

REGLAS PARA CONTACTAR AL EQUIPO:
- Si el cliente necesita ayuda, tiene una consulta concreta o pide hablar con alguien: usa SIEMPRE la herramienta enviar_mensaje. Es rápida, el equipo responde en horario de oficina.
- SOLO usa solicitar_cita (llamada telefónica) si:
  a) El cliente tiene múltiples dudas acumuladas que no se pueden resolver por escrito.
  b) El cliente está en proceso de inversión o firma y necesita orientación inmediata.
  c) El cliente pide explícitamente una llamada telefónica.
- Nunca propongas una llamada cuando un mensaje escrito es suficiente.`

  let systemPrompt = cfg?.value
    ? cfg.value + '\n\n' + PROTOCOLO_DEFAULT
    : PROTOCOLO_DEFAULT

  if (docs && docs.length > 0) {
    systemPrompt += `\n\nBASE DE CONOCIMIENTO:\n\n${docs.map((d: any) => `--- ${d.nombre} ---\n${d.contenido.slice(0, 6000)}`).join('\n\n')}`
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemPrompt,
      messages: messages.slice(-10),
      tools: [MENSAJE_TOOL, CITA_TOOL],
    })

    const inputTokens = response.usage.input_tokens
    let outputTokens = response.usage.output_tokens

    // ── TOOL USE ──────────────────────────────────────────────────
    if (response.stop_reason === 'tool_use') {
      const toolBlock = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')

      // ── enviar_mensaje ─────────────────────────────────────────
      if (toolBlock?.name === 'enviar_mensaje') {
        const input = toolBlock.input as { asunto: string; contenido: string }

        const convId = await getOCreateConversacion(cliente.id)
        const textoMensaje = `[Mensaje enviado desde el Asistente IA]\n\nAsunto: ${input.asunto}\n\n${input.contenido}`

        await Promise.all([
          supabaseAdmin.from('mensajes').insert({
            conversacion_id: convId,
            remitente: 'cliente',
            contenido: textoMensaje,
            nota_interna: false,
            requiere_firma: false,
            es_broadcast: false,
            leido: false,
          }),
          supabaseAdmin.from('conversaciones').update({
            ultimo_mensaje: textoMensaje.slice(0, 120),
            ultimo_mensaje_at: new Date().toISOString(),
            no_leidos_admin: 1,
          }).eq('id', convId),
        ])

        // Segunda llamada: respuesta natural de confirmación
        const confirmResponse = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 200,
          system: systemPrompt,
          messages: [
            ...messages.slice(-10),
            { role: 'assistant', content: response.content },
            {
              role: 'user',
              content: [{ type: 'tool_result', tool_use_id: toolBlock.id, content: JSON.stringify({ ok: true }) }],
            },
          ],
          tools: [MENSAJE_TOOL, CITA_TOOL],
        })

        outputTokens += confirmResponse.usage.output_tokens
        const confirmText = confirmResponse.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map(b => b.text).join('')

        const coste = inputTokens * EUR_PER_INPUT_TOKEN + outputTokens * EUR_PER_OUTPUT_TOKEN
        await supabaseAdmin.from('ia_uso_clientes').insert({
          cliente_id: cliente.id,
          fecha: new Date().toISOString().slice(0, 10),
          tokens_entrada: inputTokens + confirmResponse.usage.input_tokens,
          tokens_salida: outputTokens,
          coste_eur: coste,
        })

        const stream = new ReadableStream({
          start(controller) {
            const chunks = confirmText.split(' ')
            let i = 0
            const tick = setInterval(() => {
              if (i >= chunks.length) {
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({ mensaje_enviado: true })}\n\n`
                ))
                controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                controller.close()
                clearInterval(tick)
                return
              }
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ text: (i === 0 ? '' : ' ') + chunks[i] })}\n\n`
              ))
              i++
            }, 22)
          },
        })
        return new Response(stream, { headers: SSE_HEADERS })
      }

      // ── solicitar_cita ─────────────────────────────────────────
      if (toolBlock?.name === 'solicitar_cita') {
        const input = toolBlock.input as {
          fecha_propuesta?: string
          hora_propuesta?: string
          mensaje: string
        }

        const { data: cita } = await supabaseAdmin.from('citas_solicitudes').insert({
          cliente_id: cliente.id,
          tipo: 'llamada',
          fecha_propuesta: input.fecha_propuesta ?? null,
          hora_propuesta: input.hora_propuesta ?? null,
          mensaje: input.mensaje,
          estado: 'pendiente',
          conversacion_ia: messages.slice(-20),
        }).select().single()

        const confirmResponse = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 200,
          system: systemPrompt,
          messages: [
            ...messages.slice(-10),
            { role: 'assistant', content: response.content },
            {
              role: 'user',
              content: [{ type: 'tool_result', tool_use_id: toolBlock.id, content: JSON.stringify({ ok: true, cita_id: cita?.id }) }],
            },
          ],
          tools: [MENSAJE_TOOL, CITA_TOOL],
        })

        outputTokens += confirmResponse.usage.output_tokens
        const confirmText = confirmResponse.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map(b => b.text).join('')

        const coste = inputTokens * EUR_PER_INPUT_TOKEN + outputTokens * EUR_PER_OUTPUT_TOKEN
        await supabaseAdmin.from('ia_uso_clientes').insert({
          cliente_id: cliente.id,
          fecha: new Date().toISOString().slice(0, 10),
          tokens_entrada: inputTokens + confirmResponse.usage.input_tokens,
          tokens_salida: outputTokens,
          coste_eur: coste,
        })

        const stream = new ReadableStream({
          start(controller) {
            const chunks = confirmText.split(' ')
            let i = 0
            const tick = setInterval(() => {
              if (i >= chunks.length) {
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({ cita_creada: true, tipo: 'llamada', fecha: input.fecha_propuesta, hora: input.hora_propuesta })}\n\n`
                ))
                controller.enqueue(encoder.encode('data: [DONE]\n\n'))
                controller.close()
                clearInterval(tick)
                return
              }
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ text: (i === 0 ? '' : ' ') + chunks[i] })}\n\n`
              ))
              i++
            }, 22)
          },
        })
        return new Response(stream, { headers: SSE_HEADERS })
      }
    }

    // ── RESPUESTA NORMAL (texto) ──────────────────────────────────
    const texto = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text).join('')

    const coste = inputTokens * EUR_PER_INPUT_TOKEN + outputTokens * EUR_PER_OUTPUT_TOKEN
    await supabaseAdmin.from('ia_uso_clientes').insert({
      cliente_id: cliente.id,
      fecha: new Date().toISOString().slice(0, 10),
      tokens_entrada: inputTokens,
      tokens_salida: outputTokens,
      coste_eur: coste,
    })

    return new Response(streamTexto(texto || '⚠️ Sin respuesta.', encoder), { headers: SSE_HEADERS })

  } catch (e: any) {
    return new Response(
      streamTexto(`⚠️ Error: ${e.message}`, encoder),
      { headers: SSE_HEADERS }
    )
  }
}
