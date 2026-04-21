import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, MODEL, EXAM_SYSTEM_PROMPT } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { tema_id, num_preguntas = 10, tipo = 'test', dificultad } = await req.json()

  // Obtener tema
  const { data: tema } = await supabase
    .from('temas')
    .select('titulo, contenido_texto')
    .eq('id', tema_id)
    .single()

  if (!tema) return NextResponse.json({ error: 'Tema no encontrado' }, { status: 404 })

  const schema = tipo === 'test'
    ? `{"preguntas": [{"enunciado":"...","opciones":[{"letra":"A","texto":"..."},...],"respuesta_correcta":"A","explicacion":"...","dificultad":3}]}`
    : `{"preguntas": [{"enunciado":"...","respuesta_modelo":"...","criterios_correccion":"...","dificultad":3}]}`

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 4096,
    system: [
      {
        type: 'text',
        text: EXAM_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
      {
        type: 'text',
        text: `TEMARIO:\nTema: ${tema.titulo}\n\n${tema.contenido_texto}`,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{
      role: 'user',
      content: `Genera ${num_preguntas} preguntas de tipo "${tipo}"${dificultad ? ` con dificultad ${dificultad}` : ''}.
Responde SOLO con JSON válido siguiendo este schema:
${schema}`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  let parsed: { preguntas: Record<string, unknown>[] }
  try {
    parsed = JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    parsed = match ? JSON.parse(match[0]) : { preguntas: [] }
  }

  // Guardar preguntas generadas en DB
  const preguntasInsert = parsed.preguntas.map((p: Record<string, unknown>) => ({
    tema_id,
    tipo,
    enunciado: p.enunciado,
    opciones: p.opciones ?? null,
    respuesta_correcta: p.respuesta_correcta ?? p.respuesta_modelo,
    explicacion: p.explicacion ?? p.criterios_correccion,
    dificultad: p.dificultad ?? 3,
  }))

  const { data: preguntasGuardadas } = await supabase
    .from('preguntas')
    .insert(preguntasInsert)
    .select('id, enunciado, opciones, tipo, dificultad')

  // Crear examen
  const { data: examen } = await supabase
    .from('examenes')
    .insert({
      user_id: user.id,
      tipo: 'libre',
      modo: 'practica',
      config: { tema_id, num_preguntas, tipo },
      estado: 'en_curso',
    })
    .select('id')
    .single()

  // Asociar preguntas al examen
  if (examen && preguntasGuardadas) {
    await supabase.from('examen_preguntas').insert(
      preguntasGuardadas.map((p, i) => ({
        examen_id: examen.id,
        pregunta_id: p.id,
        orden: i + 1,
      }))
    )
  }

  return NextResponse.json({
    examen_id: examen?.id,
    preguntas: preguntasGuardadas,
    tokens_usados: response.usage,
  })
}
