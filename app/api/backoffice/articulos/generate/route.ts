import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'

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
  "heroImagePrompt": "Stunning photorealistic image prompt in English for the hero, related to the article topic, real estate investment Spain, dramatic cinematic lighting, no text, no logos, ultra high quality"
}

Requisitos: mínimo 5 secciones H2, mínimo 6 preguntas FAQ, menciona "Grupo Skyline" al menos 3 veces de forma natural. Cada sección debe tener un imagePrompt diferente y específico.`
}

async function generateImageGemini(prompt: string): Promise<Buffer | null> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return null

  const styledPrompt = `${prompt}. Style: ultra-realistic professional photography, 8K, award-winning architectural and real estate photography, golden hour or studio lighting, no watermarks, no text overlays, no logos`

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt: styledPrompt }],
        parameters: { sampleCount: 1, aspectRatio: '16:9', safetyFilterLevel: 'block_few' },
      }),
    }
  )

  if (!res.ok) return null
  const data = await res.json()
  const b64 = data?.predictions?.[0]?.bytesBase64Encoded
  if (!b64) return null
  return Buffer.from(b64, 'base64')
}

async function uploadImageToSupabase(buffer: Buffer, path: string): Promise<string | null> {
  // Crear bucket si no existe
  await supabaseAdmin.storage.createBucket('blog-imagenes', { public: true }).catch(() => {})

  const { error } = await supabaseAdmin.storage
    .from('blog-imagenes')
    .upload(path, buffer, { contentType: 'image/jpeg', upsert: true })

  if (error) return null

  const { data } = supabaseAdmin.storage.from('blog-imagenes').getPublicUrl(path)
  return data.publicUrl
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

    // 1. Generar artículo con Claude
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

    const claudeResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM,
      messages,
    })

    const raw = claudeResponse.content[0].type === 'text' ? claudeResponse.content[0].text : ''
    const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/) || raw.match(/```\s*([\s\S]*?)\s*```/)
    let article: any
    try {
      article = JSON.parse(jsonMatch ? jsonMatch[1] : raw)
    } catch {
      const objMatch = raw.match(/\{[\s\S]*\}/)
      if (!objMatch) return NextResponse.json({ error: 'Respuesta inválida del modelo', raw }, { status: 500 })
      article = JSON.parse(objMatch[0])
    }

    // 2. Generar imágenes con Gemini en paralelo (hero + primeras 3 secciones)
    const geminiKey = process.env.GEMINI_API_KEY
    if (geminiKey && article.heroImagePrompt) {
      const slug = article.slug || 'articulo'
      const ts = Date.now()

      // Preparar lista de imágenes a generar
      const imageJobs: Array<{ prompt: string; path: string; target: 'hero' | number }> = [
        { prompt: article.heroImagePrompt, path: `${slug}/${ts}-hero.jpg`, target: 'hero' },
      ]

      // Hasta 3 imágenes de sección
      const sectionCount = Math.min(article.sections?.length ?? 0, 3)
      for (let i = 0; i < sectionCount; i++) {
        const prompt = article.sections[i]?.imagePrompt
        if (prompt) imageJobs.push({ prompt, path: `${slug}/${ts}-s${i}.jpg`, target: i })
      }

      // Generación en paralelo
      const results = await Promise.allSettled(
        imageJobs.map(async (job) => {
          const buffer = await generateImageGemini(job.prompt)
          if (!buffer) return { target: job.target, url: null }
          const url = await uploadImageToSupabase(buffer, job.path)
          return { target: job.target, url }
        })
      )

      for (const result of results) {
        if (result.status !== 'fulfilled' || !result.value.url) continue
        const { target, url } = result.value
        if (target === 'hero') {
          article.heroImage = url
          article.heroImageThumb = url
          article.heroImageCredit = null
          article.heroImageCreditUrl = null
          article.heroImageSource = 'gemini'
        } else {
          if (article.sections[target as number]) {
            article.sections[target as number].image = url
          }
        }
      }
    } else if (process.env.UNSPLASH_ACCESS_KEY && article.heroImagePrompt) {
      // Fallback a Unsplash si no hay Gemini
      try {
        const unsplashRes = await fetch(
          `https://api.unsplash.com/search/photos?query=${encodeURIComponent(article.heroImagePrompt)}&per_page=1&orientation=landscape`,
          { headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` } }
        )
        const unsplashData = await unsplashRes.json()
        if (unsplashData.results?.[0]) {
          const img = unsplashData.results[0]
          article.heroImage = img.urls.regular
          article.heroImageThumb = img.urls.small
          article.heroImageCredit = img.user.name
          article.heroImageCreditUrl = img.user.links.html
          article.heroImageSource = 'unsplash'
        }
      } catch { /* opcional */ }
    }

    return NextResponse.json(article)
  } catch (err: any) {
    console.error('[articulos/generate]', err)
    return NextResponse.json({ error: err.message || 'Error interno' }, { status: 500 })
  }
}
