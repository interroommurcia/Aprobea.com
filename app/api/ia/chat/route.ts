/**
 * POST /api/ia/chat
 * Chat con la IA de atención al cliente.
 * Body: { messages: [{role, content}], session_id? }
 * Streaming SSE response.
 */
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY ?? '',
})

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

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: 'messages requerido' }), { status: 400 })
    }

    // Cargar protocolo y documentos desde Supabase en paralelo
    const [{ data: cfg }, { data: docs }] = await Promise.all([
      supabaseAdmin.from('configuracion').select('value').eq('key', 'ia_protocolo').single(),
      supabaseAdmin.from('ia_documentos').select('nombre, contenido').order('created_at', { ascending: false }),
    ])

    let systemPrompt = cfg?.value || PROTOCOLO_DEFAULT

    if (docs && docs.length > 0) {
      const docsText = docs
        .map((d: { nombre: string; contenido: string }) =>
          `--- DOCUMENTO: ${d.nombre} ---\n${d.contenido.slice(0, 8000)}`
        )
        .join('\n\n')
      systemPrompt += `\n\nBASE DE CONOCIMIENTO (usa esta información para responder con precisión):\n\n${docsText}`
    }

    // Streaming con Claude Haiku
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await client.messages.stream({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 512,
            system: systemPrompt,
            messages: messages.slice(-10), // últimos 10 mensajes para contexto
          })

          for await (const chunk of response) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`))
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'))
          controller.close()
        } catch (e: any) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: e.message })}\n\n`))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500 })
  }
}
