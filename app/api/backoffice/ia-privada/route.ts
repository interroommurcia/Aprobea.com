/**
 * POST /api/backoffice/ia-privada
 * IA privada del admin: hilos con skills personalizadas.
 * Acepta systemPrompt directo (built-in o custom) + adjuntos PDF.
 * Tool: buscar_clientes en base_clientes_excel.
 */
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' })

const DEFAULT_SYSTEM = `Eres el asistente ejecutivo privado del director de GrupoSkyLine Investment. Ayudas con análisis estratégico, comunicaciones, planificación y cualquier tarea ejecutiva. Tienes acceso a la base de contactos mediante la herramienta buscar_clientes. Eres conciso, profesional y directo. Respondes siempre en español.`

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_session')?.value === '1'
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'buscar_clientes',
    description: 'Busca en la base de datos de clientes y contactos de GrupoSkyLine. Devuelve hasta 10 resultados con nombre, email, teléfono, empresa, ciudad y notas.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: { type: 'string', description: 'Texto a buscar en nombre, apellidos, email, teléfono o empresa.' },
      },
      required: ['query'],
    },
  },
]

async function runTool(name: string, input: Record<string, string>): Promise<string> {
  if (name === 'buscar_clientes') {
    const q = `%${input.query ?? ''}%`
    const { data, error } = await supabaseAdmin
      .from('base_clientes_excel')
      .select('nombre, apellidos, email, telefono, empresa, ciudad, notas')
      .or(`nombre.ilike.${q},apellidos.ilike.${q},email.ilike.${q},telefono.ilike.${q},empresa.ilike.${q}`)
      .limit(10)

    if (error) return `Error al buscar: ${error.message}`
    if (!data || data.length === 0) return 'No se encontraron contactos con esa búsqueda.'
    return data.map((c, i) =>
      `${i + 1}. ${[c.nombre, c.apellidos].filter(Boolean).join(' ')}` +
      (c.empresa  ? ` — ${c.empresa}`   : '') +
      (c.email    ? ` | ${c.email}`     : '') +
      (c.telefono ? ` | ${c.telefono}`  : '') +
      (c.ciudad   ? ` | ${c.ciudad}`    : '') +
      (c.notas    ? `\n   📝 ${c.notas}` : '')
    ).join('\n')
  }
  return 'Herramienta desconocida'
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const { messages, systemPrompt, attachment } = await req.json()
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages requerido' }), { status: 400 })
  }

  const system = systemPrompt ?? DEFAULT_SYSTEM
  const encoder = new TextEncoder()
  const SSE_HEADERS = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  }

  try {
    // Construir mensajes para la API
    let apiMessages: Anthropic.MessageParam[] = messages.slice(-30).map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    // Inyectar PDF como document block en el último mensaje de usuario
    if (attachment?.type === 'pdf' && attachment.data) {
      const lastIdx = apiMessages.length - 1
      const last    = apiMessages[lastIdx]
      if (last?.role === 'user') {
        apiMessages[lastIdx] = {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: attachment.data,
              },
              title: attachment.filename ?? 'documento.pdf',
            } as any,
            {
              type: 'text',
              text: typeof last.content === 'string' && last.content
                ? last.content
                : 'Analiza este documento y extrae los puntos más relevantes.',
            },
          ],
        }
      }
    }

    // Agentic loop para tool calls
    let finalText = ''
    while (true) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20251001',
        max_tokens: 2000,
        system,
        tools: TOOLS,
        messages: apiMessages,
      })

      if (response.stop_reason === 'tool_use') {
        const toolBlocks = response.content.filter(
          (b): b is Anthropic.ToolUseBlock => b.type === 'tool_use'
        )
        const toolResults: Anthropic.ToolResultBlockParam[] = await Promise.all(
          toolBlocks.map(async (tu) => ({
            type: 'tool_result' as const,
            tool_use_id: tu.id,
            content: await runTool(tu.name, tu.input as Record<string, string>),
          }))
        )
        apiMessages = [
          ...apiMessages,
          { role: 'assistant', content: response.content },
          { role: 'user',      content: toolResults },
        ]
        continue
      }

      finalText = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
      break
    }

    // Streamear respuesta
    const stream = new ReadableStream({
      start(controller) {
        const words = finalText.split(' ')
        let i = 0
        const tick = setInterval(() => {
          if (i >= words.length) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
            clearInterval(tick)
            return
          }
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: (i === 0 ? '' : ' ') + words[i] })}\n\n`)
          )
          i++
        }, 18)
      },
    })

    return new Response(stream, { headers: SSE_HEADERS })
  } catch (e: any) {
    const msg = `⚠️ Error: ${e.message}`
    return new Response(
      new ReadableStream({
        start(c) {
          c.enqueue(encoder.encode(`data: ${JSON.stringify({ text: msg })}\n\n`))
          c.enqueue(encoder.encode('data: [DONE]\n\n'))
          c.close()
        },
      }),
      { headers: SSE_HEADERS }
    )
  }
}
