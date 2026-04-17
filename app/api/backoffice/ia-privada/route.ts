/**
 * POST /api/backoffice/ia-privada
 * IA privada del admin: 3 hilos con skills predeterminadas.
 * Tiene acceso a la base de clientes Excel via tool.
 */
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' })

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_session')?.value === '1'
}

const SKILLS: Record<string, string> = {
  general: `Eres el asistente ejecutivo privado del director de GrupoSkyLine Investment. Tu rol es ayudar con análisis estratégico, redacción de comunicaciones corporativas, planificación de negocio, preparación de reuniones y cualquier tarea ejecutiva. Tienes acceso a la base de contactos y clientes potenciales de la empresa mediante la herramienta buscar_clientes. Eres conciso, profesional y directo. Respondes siempre en español.`,

  analista: `Eres un analista inmobiliario y financiero senior especializado en activos NPL, crowdfunding inmobiliario y operaciones de inversión para GrupoSkyLine Investment. Tu rol es: analizar oportunidades de inversión, evaluar riesgo/rentabilidad, calcular ROI, comparar carteras NPL, interpretar datos del mercado inmobiliario español, redactar informes de due diligence y dar recomendaciones técnicas. Usas terminología financiera precisa. Respondes en español con rigor analítico.`,

  comercial: `Eres el gestor comercial y de CRM de GrupoSkyLine Investment. Tu rol es ayudar con: captación de nuevos inversores, redacción de emails de seguimiento, scripts para llamadas comerciales, estrategias de cierre, gestión de pipeline de clientes potenciales y análisis de la base de contactos. Tienes acceso a la base de datos de clientes y contactos mediante la herramienta buscar_clientes — úsala para encontrar información sobre contactos existentes cuando sea relevante. Eres persuasivo, orientado a resultados y profesional. Responde en español.`,
}

const TOOLS: Anthropic.Tool[] = [
  {
    name: 'buscar_clientes',
    description: 'Busca en la base de datos de clientes y contactos de GrupoSkyLine. Útil para encontrar información de contacto, historial o notas sobre un cliente o prospect. Devuelve hasta 10 resultados.',
    input_schema: {
      type: 'object' as const,
      properties: {
        query: {
          type: 'string',
          description: 'Texto a buscar. Se busca en nombre, apellidos, email, teléfono y empresa.',
        },
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
      (c.empresa ? ` — ${c.empresa}` : '') +
      (c.email ? ` | ${c.email}` : '') +
      (c.telefono ? ` | ${c.telefono}` : '') +
      (c.ciudad ? ` | ${c.ciudad}` : '') +
      (c.notas ? `\n   Notas: ${c.notas}` : '')
    ).join('\n')
  }
  return 'Herramienta desconocida'
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })

  const { messages, skill = 'general' } = await req.json()
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages requerido' }), { status: 400 })
  }

  const systemPrompt = SKILLS[skill] ?? SKILLS.general
  const encoder = new TextEncoder()
  const SSE_HEADERS = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  }

  try {
    // Agentic loop: resuelve tool calls antes de streamear
    let currentMessages: Anthropic.MessageParam[] = messages.slice(-30)
    let finalText = ''

    while (true) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-5-20251001',
        max_tokens: 2000,
        system: systemPrompt,
        tools: TOOLS,
        messages: currentMessages,
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
        currentMessages = [
          ...currentMessages,
          { role: 'assistant', content: response.content },
          { role: 'user', content: toolResults },
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
