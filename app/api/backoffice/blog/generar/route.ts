import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, MODEL } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { titulo, categoria, resumen } = await req.json()
  if (!titulo && !categoria) {
    return NextResponse.json({ error: 'Necesito al menos título o categoría' }, { status: 400 })
  }

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: [{
      type: 'text',
      text: `Eres un redactor de contenido SEO especializado en oposiciones públicas españolas para el blog de Aprobea.
Escribe artículos útiles, bien estructurados, con subtítulos (##), listas y ejemplos prácticos.
Usa un tono cercano, motivador y profesional. Siempre en español.`,
      cache_control: { type: 'ephemeral' },
    }],
    messages: [{
      role: 'user',
      content: `Escribe un artículo de blog SEO completo sobre: "${titulo || categoria}"
${resumen ? `Contexto: ${resumen}` : ''}
Categoría: ${categoria || 'Oposiciones'}

Responde en JSON: {
  "contenido": "...artículo en markdown...",
  "resumen": "extracto de 1-2 frases para la home",
  "meta_desc": "meta description para Google (max 155 chars)"
}`,
    }],
  })

  const text = res.content[0].type === 'text' ? res.content[0].text : '{}'
  try {
    const match = text.match(/\{[\s\S]*\}/)
    const data = match ? JSON.parse(match[0]) : {}
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: 'Error generando contenido' }, { status: 500 })
  }
}
