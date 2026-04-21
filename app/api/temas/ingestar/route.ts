import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { anthropic, MODEL, EXAM_SYSTEM_PROMPT } from '@/lib/anthropic'

// Ingesta un tema + genera flashcards y preguntas base en batch nocturno
export async function POST(req: NextRequest) {
  const auth = req.headers.get('x-cron-secret')
  const supabase = await createServiceClient()

  // Permite llamada desde backoffice autenticado O cron
  if (auth !== process.env.CRON_SECRET) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const { tema_id, generar_preguntas = true, generar_flashcards = true } = await req.json()

  const { data: tema } = await supabase
    .from('temas')
    .select('*')
    .eq('id', tema_id)
    .single()

  if (!tema) return NextResponse.json({ error: 'Tema no encontrado' }, { status: 404 })

  const resultados: Record<string, unknown> = {}

  // 1. Dividir en chunks y guardar
  const chunks = chunkTexto(tema.contenido_texto, 800)
  await supabase.from('tema_chunks').delete().eq('tema_id', tema_id)
  await supabase.from('tema_chunks').insert(
    chunks.map((c, i) => ({ tema_id, contenido: c, orden: i }))
  )
  resultados.chunks = chunks.length

  // 2. Generar preguntas base (20 test + 5 desarrollo)
  if (generar_preguntas) {
    const pRes = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8192,
      system: [
        { type: 'text', text: EXAM_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } },
        { type: 'text', text: `TEMARIO COMPLETO:\n${tema.contenido_texto}`, cache_control: { type: 'ephemeral' } },
      ],
      messages: [{
        role: 'user',
        content: `Genera 20 preguntas tipo test (4 opciones) y 5 de desarrollo sobre este tema.
Varía la dificultad: 4 fáciles (1-2), 8 medias (3), 6 difíciles (4-5), 2 muy difíciles (5).
Responde en JSON:
{"test":[{"enunciado":"...","opciones":[...],"respuesta_correcta":"A","explicacion":"...","dificultad":3}],
"desarrollo":[{"enunciado":"...","respuesta_correcta":"...","explicacion":"...","dificultad":3}]}`,
      }],
    })

    const pText = pRes.content[0].type === 'text' ? pRes.content[0].text : '{}'
    let pDatos: { test?: Record<string, unknown>[]; desarrollo?: Record<string, unknown>[] } = {}
    try {
      const match = pText.match(/\{[\s\S]*\}/)
      pDatos = match ? JSON.parse(match[0]) : {}
    } catch {}

    const toInsert = [
      ...(pDatos.test ?? []).map(p => ({ ...p, tema_id, tipo: 'test' })),
      ...(pDatos.desarrollo ?? []).map(p => ({ ...p, tema_id, tipo: 'desarrollo' })),
    ]
    await supabase.from('preguntas').insert(toInsert)
    resultados.preguntas = toInsert.length
  }

  // 3. Generar flashcards
  if (generar_flashcards) {
    const fRes = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: [{ type: 'text', text: EXAM_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content: `Genera 15 flashcards (concepto-definición o pregunta-respuesta) del tema: ${tema.titulo}.
Responde en JSON: {"flashcards":[{"pregunta":"...","respuesta":"..."}]}`,
      }],
    })

    const fText = fRes.content[0].type === 'text' ? fRes.content[0].text : '{}'
    let fDatos: { flashcards?: { pregunta: string; respuesta: string }[] } = {}
    try {
      const match = fText.match(/\{[\s\S]*\}/)
      fDatos = match ? JSON.parse(match[0]) : {}
    } catch {}

    if (fDatos.flashcards) {
      await supabase.from('flashcards').delete().eq('tema_id', tema_id)
      await supabase.from('flashcards').insert(
        fDatos.flashcards.map(f => ({ ...f, tema_id }))
      )
      resultados.flashcards = fDatos.flashcards.length
    }
  }

  return NextResponse.json({ ok: true, tema_id, ...resultados })
}

function chunkTexto(texto: string, maxChars: number): string[] {
  const parrafos = texto.split(/\n\n+/)
  const chunks: string[] = []
  let actual = ''
  for (const p of parrafos) {
    if ((actual + p).length > maxChars && actual) {
      chunks.push(actual.trim())
      actual = p
    } else {
      actual += '\n\n' + p
    }
  }
  if (actual.trim()) chunks.push(actual.trim())
  return chunks
}
