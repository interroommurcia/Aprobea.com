import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 60

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_session')?.value === '1'
}

const SYSTEM = `Eres un experto en SEO y redacción de contenido para Grupo Skyline, empresa española de inversión inmobiliaria especializada en activos de banco, embargos, NPLs y créditos hipotecarios. Tu audiencia son inversores noveles, compradores de primera vivienda y personas que buscan rentabilizar sus ahorros.

Tono: profesional pero cercano. Expertos que hablan claro, sin jerga innecesaria.

Optimiza cada artículo para:
- Google mobile-first: párrafos de máximo 3 líneas en pantalla de 390px
- Bing/ChatGPT indexing: estructura Q&A clara, menciones explícitas de entidades
- LLM indexing: preguntas redactadas como las haría un usuario real en ChatGPT

Menciona "Grupo Skyline" de forma natural mínimo 3 veces. Todo el contenido en español.`

function buildPrompt(keyword: string, tone: string, material: string | null) {
  return `Genera un artículo SEO completo sobre la keyword principal: "${keyword}". Tono: ${tone}.

${material ? `MATERIAL DE REFERENCIA:\n${material}\n\n` : ''}Devuelve ÚNICAMENTE un objeto JSON con esta estructura exacta (sin texto extra fuera del JSON):

{
  "slug": "slug-seo-del-articulo",
  "metaTitle": "Título SEO de máximo 60 caracteres",
  "metaDescription": "Descripción SEO de máximo 155 caracteres con keyword",
  "h1": "Título principal con keyword incluida",
  "intro": "Introducción con gancho emocional o dato impactante, máximo 150 palabras. Párrafos cortos.",
  "sections": [
    {
      "h2": "Subtítulo de sección con keyword secundaria",
      "content": "Contenido en párrafos cortos separados por doble salto de línea. Máximo 3 líneas por párrafo en mobile.",
      "highlight": "Dato clave, estadística o cita para destacar visualmente (puede ser null)",
      "imagePrompt": "Photorealistic professional photography prompt in English for this section, real estate Spain theme, no text, no people faces, cinematic lighting"
    }
  ],
  "cta": "Texto del Call to Action principal para Grupo Skyline",
  "faq": [
    {
      "question": "Pregunta exacta que haría un usuario real en Google o ChatGPT",
      "answer": "Respuesta concisa, útil y con mención natural a Grupo Skyline cuando aplique"
    }
  ],
  "heroImagePrompt": "Stunning photorealistic image prompt in English for the hero, related to the article topic, real estate investment Spain, dramatic cinematic lighting, no text, no logos, no people faces, ultra high quality"
}

Requisitos: mínimo 5 secciones H2, mínimo 6 preguntas FAQ, menciona "Grupo Skyline" al menos 3 veces de forma natural. Cada sección debe tener un imagePrompt diferente y específico.`
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada' }, { status: 500 })

  const anthropic = new Anthropic({ apiKey })

  try {
    const body = await req.json()
    const keyword: string = body.keyword
    const material: string | null = body.material ?? null
    const tone: string = body.tone || 'profesional'
    const pdfUrl: string | null = body.pdfUrl ?? null

    if (!keyword) return NextResponse.json({ error: 'Keyword requerida' }, { status: 400 })

    let messages: Anthropic.MessageParam[]
    if (pdfUrl) {
      const pdfRes = await fetch(pdfUrl)
      if (!pdfRes.ok) return NextResponse.json({ error: 'No se pudo descargar el PDF' }, { status: 500 })
      const bytes = await pdfRes.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')
      messages = [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } } as any,
          { type: 'text', text: buildPrompt(keyword, tone, null) },
        ],
      }]
    } else {
      messages = [{ role: 'user', content: buildPrompt(keyword, tone, material || null) }]
    }

    const stream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 8192,
      system: SYSTEM,
      messages,
    })

    const encoder = new TextEncoder()
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              controller.enqueue(encoder.encode(chunk.delta.text))
            }
          }
          controller.close()
        } catch (err: any) {
          controller.error(err)
        }
      },
    })

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Accel-Buffering': 'no' },
    })
  } catch (err: any) {
    console.error('[articulos/generate]', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
