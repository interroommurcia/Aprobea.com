import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, MODEL, EXAM_SYSTEM_PROMPT } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { examen_id, respuestas } = await req.json()
  // respuestas: [{pregunta_id, respuesta_usuario}]

  // Obtener preguntas del examen
  const { data: preguntas } = await supabase
    .from('examen_preguntas')
    .select('id, pregunta_id, preguntas(tipo, respuesta_correcta, enunciado, opciones, explicacion)')
    .eq('examen_id', examen_id)

  if (!preguntas) return NextResponse.json({ error: 'Examen no encontrado' }, { status: 404 })

  const respuestasMap = new Map(respuestas.map((r: { pregunta_id: string; respuesta_usuario: string }) => [r.pregunta_id, r.respuesta_usuario]))
  const resultados = []
  let puntos = 0
  const desarrollosPendientes = []

  for (const ep of preguntas) {
    const pregunta = ep.preguntas as unknown as Record<string, unknown>
    if (!pregunta) continue

    const respuestaUsuario = respuestasMap.get(ep.pregunta_id as string) as string
    const tipo = pregunta.tipo as string

    if (tipo === 'test' || tipo === 'vf') {
      // Corrección instantánea sin IA
      const correcta = respuestaUsuario?.toUpperCase() === (pregunta.respuesta_correcta as string)?.toUpperCase()
      const puntosPreg = correcta ? 1 : 0
      puntos += puntosPreg

      await supabase.from('examen_preguntas').update({
        respuesta_usuario: respuestaUsuario,
        correcta,
        puntos: puntosPreg,
      }).eq('id', ep.id)

      // SM-2
      await supabase.rpc('actualizar_repeticion', {
        p_user_id: user.id,
        p_pregunta_id: ep.pregunta_id,
        p_calidad: correcta ? 5 : 0,
      })

      resultados.push({
        pregunta_id: ep.pregunta_id,
        correcta,
        respuesta_correcta: pregunta.respuesta_correcta,
        explicacion: pregunta.explicacion,
      })
    } else {
      // Desarrollo → cola para IA
      desarrollosPendientes.push({ ep, pregunta, respuestaUsuario })
    }
  }

  // Corregir desarrollos con IA (batch en una sola llamada)
  if (desarrollosPendientes.length > 0) {
    const contenidoBatch = desarrollosPendientes.map((d, i) =>
      `[${i + 1}] Enunciado: ${d.pregunta.enunciado}\nRespuesta modelo: ${d.pregunta.respuesta_correcta}\nRespuesta alumno: ${d.respuestaUsuario}`
    ).join('\n\n')

    const iaRes = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2048,
      system: [{ type: 'text', text: EXAM_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{
        role: 'user',
        content: `Corrige estas ${desarrollosPendientes.length} preguntas de desarrollo.
Para cada una da: puntuacion (0-1, float), feedback breve (1-2 frases).
Responde en JSON: {"correcciones":[{"indice":1,"puntuacion":0.8,"feedback":"..."},...]}

${contenidoBatch}`,
      }],
    })

    const iaText = iaRes.content[0].type === 'text' ? iaRes.content[0].text : '{}'
    let iaParsed: { correcciones: { indice: number; puntuacion: number; feedback: string }[] }
    try { iaParsed = JSON.parse(iaText) } catch { iaParsed = { correcciones: [] } }

    for (const corr of iaParsed.correcciones) {
      const d = desarrollosPendientes[corr.indice - 1]
      puntos += corr.puntuacion
      await supabase.from('examen_preguntas').update({
        respuesta_usuario: d.respuestaUsuario,
        correcta: corr.puntuacion >= 0.5,
        puntos: corr.puntuacion,
      }).eq('id', d.ep.id)

      resultados.push({
        pregunta_id: d.ep.pregunta_id,
        correcta: corr.puntuacion >= 0.5,
        puntos: corr.puntuacion,
        feedback: corr.feedback,
      })
    }
  }

  const total = preguntas.length
  const nota = (puntos / total) * 10

  // Generar feedback global con IA (sin coste extra, mismo caché)
  const temasFallados = resultados.filter(r => !r.correcta).length
  const feedbackGlobal = temasFallados === 0
    ? '¡Excelente! Has respondido correctamente todas las preguntas.'
    : `Has fallado ${temasFallados} de ${total} preguntas. Repasa especialmente los temas relacionados con las preguntas incorrectas.`

  // Cerrar examen
  await supabase.from('examenes').update({
    estado: 'completado',
    puntuacion_final: puntos,
    nota_sobre_10: nota,
    feedback_ia: feedbackGlobal,
    completado_at: new Date().toISOString(),
  }).eq('id', examen_id)

  // Actualizar progreso del usuario
  await supabase.rpc('update_last_active', { p_user_id: user.id })

  return NextResponse.json({ nota, puntos, total, feedback: feedbackGlobal, resultados })
}
