import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin as sb } from '@/lib/supabase-admin'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const { pregunta_id, respuesta_dada, user_id } = await req.json()

  const { data: p } = await sb.from('preguntas').select('*,temas(titulo,temario_id)').eq('id', pregunta_id).single()
  if (!p) return Response.json({ error: 'Pregunta no encontrada' }, { status: 404 })

  // Buscar contexto RAG del temario si existe
  let contextoTemario = ''
  if (p.tema_id) {
    try {
      const { data: chunks } = await sb.from('chunks').select('contenido').eq('tema_id', p.tema_id).limit(3)
      if (chunks?.length) contextoTemario = chunks.map(c => c.contenido).join('\n\n---\n\n')
    } catch { /* sin chunks disponibles */ }
  }

  const opciones = (p.opciones as any[])?.map((o: any) => `${o.letra}) ${o.texto}`).join('\n') ?? ''
  const esCorrecta = respuesta_dada === p.respuesta_correcta

  const systemPrompt = `Eres un tutor experto en oposiciones españolas. Tu tarea es explicar por qué una respuesta es correcta o incorrecta, de forma clara, pedagógica y fundamentada en la normativa o temario oficial.

${contextoTemario ? `CONTEXTO DEL TEMARIO OFICIAL:\n${contextoTemario}\n\n` : ''}Responde siempre en español. Sé conciso pero completo. Máximo 3 párrafos.`

  const userPrompt = `PREGUNTA: ${p.enunciado}

${opciones ? `OPCIONES:\n${opciones}\n` : ''}RESPUESTA CORRECTA: ${p.respuesta_correcta}
RESPUESTA DEL ALUMNO: ${respuesta_dada ?? '(sin responder)'}
RESULTADO: ${esCorrecta ? '✅ CORRECTA' : '❌ INCORRECTA'}

Explica por qué la respuesta correcta es "${p.respuesta_correcta}"${!esCorrecta ? ` y por qué "${respuesta_dada}" es incorrecta` : ''}. ${p.explicacion ? `Información adicional: ${p.explicacion}` : ''}`

  // Usar Haiku para correcciones individuales (coste mínimo)
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const explicacion = msg.content[0].type === 'text' ? msg.content[0].text : ''

  // Guardar en respuesta y registrar coste
  const coste = (msg.usage.input_tokens * 0.0000008 + msg.usage.output_tokens * 0.000001)
  if (user_id) {
    await sb.from('ia_uso').insert({ user_id, tipo: 'correccion', modelo: 'claude-haiku-4-5', tokens_entrada: msg.usage.input_tokens, tokens_salida: msg.usage.output_tokens, coste_eur: coste })
  }

  return Response.json({ explicacion, es_correcta: esCorrecta, respuesta_correcta: p.respuesta_correcta })
}
