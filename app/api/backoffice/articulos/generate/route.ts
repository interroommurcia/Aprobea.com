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
      "highlight": "Dato clave, estadística o cita para destacar visualmente (puede ser null)"
    }
  ],
  "cta": "Texto del Call to Action principal para Grupo Skyline",
  "faq": [
    {
      "question": "Pregunta exacta que haría un usuario real en Google o ChatGPT",
      "answer": "Respuesta concisa, útil y con mención natural a Grupo Skyline cuando aplique"
    }
  ],
  "heroImageQuery": "search query en inglés para Unsplash (ej: 'real estate investment spain')"
}

Requisitos: mínimo 5 secciones H2, mínimo 6 preguntas FAQ, menciona "Grupo Skyline" al menos 3 veces de forma natural.`
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY no configurada en el servidor' }, { status: 500 })

  const anthropic = new Anthropic({ apiKey })

  try {
    const formData = await req.formData()
    const material = formData.get('material') as string | null
    const keyword = formData.get('keyword') as string
    const tone = (formData.get('tone') as string) || 'profesional'
    const pdfFile = formData.get('pdf') as File | null

    if (!keyword) return NextResponse.json({ error: 'Keyword requerida' }, { status: 400 })

    let messages: Anthropic.MessageParam[]

    if (pdfFile && pdfFile.size > 0) {
      const bytes = await pdfFile.arrayBuffer()
      const base64 = Buffer.from(bytes).toString('base64')
      messages = [{
        role: 'user',
        content: [
          {
            type: 'document',
            source: { type: 'base64', media_type: 'application/pdf', data: base64 },
          } as any,
          { type: 'text', text: buildPrompt(keyword, tone, null) },
        ],
      }]
    } else {
      messages = [{
        role: 'user',
        content: buildPrompt(keyword, tone, material || null),
      }]
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM,
      messages,
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : ''

    // Parse JSON from response (may be wrapped in ```json blocks)
    const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/```\s*([\s\S]*?)\s*```/)
    let article: any
    try {
      article = JSON.parse(jsonMatch ? jsonMatch[1] : raw)
    } catch {
      // Try extracting bare JSON object
      const objMatch = raw.match(/\{[\s\S]*\}/)
      if (!objMatch) return NextResponse.json({ error: 'Respuesta inválida del modelo', raw }, { status: 500 })
      article = JSON.parse(objMatch[0])
    }

    // Fetch hero image from Unsplash
    if (process.env.UNSPLASH_ACCESS_KEY && article.heroImageQuery) {
      try {
        const unsplashRes = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(article.heroImageQuery)}&per_page=3&orientation=landscape`,
          { headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` } }
        )
        const unsplashData = await unsplashRes.json()
        if (unsplashData.results?.length > 0) {
          const img = unsplashData.results[0]
          article.heroImage = img.urls.regular
          article.heroImageThumb = img.urls.small
          article.heroImageCredit = img.user.name
          article.heroImageCreditUrl = img.user.links.html
        }
      } catch { /* Unsplash opcional */ }
    }

    return NextResponse.json(article)
  } catch (err: any) {
    console.error('[articulos/generate]', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
