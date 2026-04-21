import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, MODEL } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { plataforma, contexto } = await req.json()

  // Obtener última convocatoria para contexto automático
  let convCtx = ''
  if (!contexto) {
    const { data: ultima } = await supabase
      .from('convocatorias')
      .select('titulo, num_plazas, boletin_referencia, categoria')
      .eq('estado', 'activa')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    if (ultima) {
      convCtx = `Última convocatoria: ${ultima.titulo} — ${ultima.num_plazas ?? 'N'} plazas — ${ultima.boletin_referencia}`
    }
  }

  const limites: Record<string, number> = {
    twitter: 260, instagram: 300, linkedin: 600, facebook: 400, tiktok: 300,
  }
  const limite = limites[plataforma ?? 'instagram'] ?? 300

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 600,
    system: [{
      type: 'text',
      text: `Eres el community manager de Aprobea, plataforma de preparación de oposiciones locales y regionales en España.
Creas contenido auténtico, motivador y útil. Sin emojis excesivos. En español.`,
      cache_control: { type: 'ephemeral' },
    }],
    messages: [{
      role: 'user',
      content: `Crea un post para ${plataforma ?? 'instagram'} (máx ${limite} caracteres).
${contexto || convCtx || 'Tema: consejos para preparar oposiciones locales'}

Responde en JSON: {
  "contenido": "texto del post sin hashtags",
  "hashtags": ["oposiciones", "policia", "estudio"] // array, sin #
}`,
    }],
  })

  const text = res.content[0].type === 'text' ? res.content[0].text : '{}'
  try {
    const match = text.match(/\{[\s\S]*\}/)
    return NextResponse.json(match ? JSON.parse(match[0]) : {})
  } catch {
    return NextResponse.json({ error: 'Error generando post' }, { status: 500 })
  }
}
