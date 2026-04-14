/**
 * POST /api/ia/chat-cliente
 * Chat IA autenticado para clientes del dashboard.
 * Límites de gasto por tipo_inversor:
 *   - crowdfunding: 0,10€/día  → modo gratuito
 *   - npl:          1,00€/semana → modo gratuito
 * Tool use: solicitar_cita — agenda llamada o cita presencial
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

const CITA_TOOL: Anthropic.Tool = {
  name: 'solicitar_cita',
  description: 'Registra una solicitud de cita o llamada con el equipo de GrupoSkyLine cuando el cliente quiere agendar una reunión, llamada o visita presencial.',
  input_schema: {
    type: 'object' as const,
    properties: {
      tipo: {
        type: 'string',
        enum: ['llamada'],
        description: 'Tipo de contacto: llamada telefónica o videollamada con el equipo de GrupoSkyLine',
      },
      fecha_propuesta: {
        type: 'string',
        description: 'Fecha propuesta en formato YYYY-MM-DD. Si el cliente dice "el viernes" calcula la fecha. Si no menciona fecha, omite este campo.',
      },
      hora_propuesta: {
        type: 'string',
        description: 'Hora propuesta en formato HH:MM, ej: "10:00". Si no menciona hora, omite este campo.',
      },
      mensaje: {
        type: 'string',
        description: 'Breve resumen del motivo de la cita según lo que dijo el cliente.',
      },
    },
    required: ['tipo', 'mensaje'],
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

  // Comprobar límite
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
  const PROTOCOLO_DEFAULT = `Eres el asistente virtual de GrupoSkyLine Investment. Responde de forma profesional, cercana y concisa. Responde siempre en el idioma del cliente. Cuando el cliente quiera agendar una llamada, reunión o cita presencial usa la herramienta solicitar_cita.`
  let systemPrompt = cfg?.value
    ? cfg.value + '\n\nCuando el cliente quiera agendar una llamada, reunión o cita presencial usa la herramienta solicitar_cita.'
    : PROTOCOLO_DEFAULT

  if (docs && docs.length > 0) {
    systemPrompt += `\n\nBASE DE CONOCIMIENTO:\n\n${docs.map((d: any) => `--- ${d.nombre} ---\n${d.contenido.slice(0, 6000)}`).join('\n\n')}`
  }

  try {
    // Llamada NO streaming para detectar tool use
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      system: systemPrompt,
      messages: messages.slice(-10),
      tools: [CITA_TOOL],
    })

    const inputTokens = response.usage.input_tokens
    let outputTokens = response.usage.output_tokens

    // ── TOOL USE: solicitar_cita ──────────────────────────────────
    if (response.stop_reason === 'tool_use') {
      const toolBlock = response.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use')
      if (toolBlock?.name === 'solicitar_cita') {
        const input = toolBlock.input as {
          tipo: 'llamada'
          fecha_propuesta?: string
          hora_propuesta?: string
          mensaje: string
        }

        // Crear solicitud en DB — guardar historial de conversación
        const { data: cita } = await supabaseAdmin.from('citas_solicitudes').insert({
          cliente_id: cliente.id,
          tipo: input.tipo,
          fecha_propuesta: input.fecha_propuesta ?? null,
          hora_propuesta: input.hora_propuesta ?? null,
          mensaje: input.mensaje,
          estado: 'pendiente',
          conversacion_ia: messages.slice(-20), // últimos 20 mensajes de contexto
        }).select().single()

        // Llamada adicional para obtener respuesta natural de confirmación
        const confirmResponse = await anthropic.messages.create({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 200,
          system: systemPrompt,
          messages: [
            ...messages.slice(-10),
            { role: 'assistant', content: response.content },
            {
              role: 'user',
              content: [{
                type: 'tool_result',
                tool_use_id: toolBlock.id,
                content: JSON.stringify({ ok: true, cita_id: cita?.id }),
              }],
            },
          ],
          tools: [CITA_TOOL],
        })

        outputTokens += confirmResponse.usage.output_tokens
        const confirmText = confirmResponse.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map(b => b.text).join('')

        // Registrar uso
        const coste = inputTokens * EUR_PER_INPUT_TOKEN + outputTokens * EUR_PER_OUTPUT_TOKEN
        await supabaseAdmin.from('ia_uso_clientes').insert({
          cliente_id: cliente.id,
          fecha: new Date().toISOString().slice(0, 10),
          tokens_entrada: inputTokens + confirmResponse.usage.input_tokens,
          tokens_salida: outputTokens,
          coste_eur: coste,
        })

        // Stream respuesta + evento especial de cita creada
        const stream = new ReadableStream({
          start(controller) {
            const chunks = confirmText.split(' ')
            let i = 0
            const tick = setInterval(() => {
              if (i >= chunks.length) {
                // Enviar evento especial con datos de la cita
                controller.enqueue(encoder.encode(
                  `data: ${JSON.stringify({ cita_creada: true, tipo: input.tipo, fecha: input.fecha_propuesta, hora: input.hora_propuesta })}\n\n`
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
