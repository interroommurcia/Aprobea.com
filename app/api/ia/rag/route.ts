import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin as sb } from '@/lib/supabase-admin'
import OpenAI from 'openai'

let _anthropic: Anthropic | null = null
let _openai: OpenAI | null = null
function getAI() {
  if (!_anthropic) _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! })
  return { anthropic: _anthropic, openai: _openai }
}

export async function POST(req: NextRequest) {
  const { anthropic, openai } = getAI()
  const { pregunta, oposicion_id, tema_id, user_id } = await req.json()
  if (!pregunta) return Response.json({ error: 'Pregunta requerida' }, { status: 400 })

  // 1. Generar embedding de la pregunta
  const embResp = await openai.embeddings.create({ model: 'text-embedding-3-small', input: pregunta })
  const embedding = embResp.data[0].embedding

  // 2. Búsqueda vectorial en chunks
  const { data: chunks } = await sb.rpc('match_chunks', {
    query_embedding: embedding,
    match_threshold: 0.65,
    match_count: 5,
    filter_oposicion_id: oposicion_id ?? null,
  })

  const contexto = (chunks ?? []).map((c: any) => c.contenido).join('\n\n---\n\n')

  // 3. Responder con Claude usando prompt caching para el sistema
  const systemPrompt = `Eres un tutor experto en oposiciones españolas. Respondes preguntas sobre el temario de forma clara, precisa y pedagógica. Siempre en español. Si el contexto del temario no cubre la pregunta, indícalo y responde con tu conocimiento general sobre la normativa española.

${contexto ? `CONTEXTO DEL TEMARIO (fragmentos relevantes):\n\n${contexto}` : 'No se encontraron fragmentos relevantes en el temario. Responde con conocimiento general.'}`

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 800,
    system: [{ type: 'text', text: systemPrompt, cache_control: { type: 'ephemeral' } }] as any,
    messages: [{ role: 'user', content: pregunta }],
  })

  const respuesta = msg.content[0].type === 'text' ? msg.content[0].text : ''
  const coste = (msg.usage.input_tokens * 0.000003 + msg.usage.output_tokens * 0.000015 + ((msg.usage as any).cache_read_input_tokens ?? 0) * 0.0000003)

  if (user_id) {
    await sb.from('ia_uso').insert({
      user_id, tipo: 'rag', modelo: 'claude-sonnet-4-6',
      tokens_entrada: msg.usage.input_tokens,
      tokens_salida: msg.usage.output_tokens,
      tokens_cache_hit: (msg.usage as any).cache_read_input_tokens ?? 0,
      coste_eur: coste,
    })
  }

  return Response.json({ respuesta, chunks_usados: chunks?.length ?? 0 })
}
