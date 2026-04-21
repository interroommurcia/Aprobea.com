import { NextRequest } from 'next/server'
import { supabaseAdmin as sb } from '@/lib/supabase-admin'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_session')?.value === '1'
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await req.json()

  const { data: pub } = await sb.from('boe_publicaciones').select('*').eq('id', id).single()
  if (!pub) return Response.json({ error: 'Publicación no encontrada' }, { status: 404 })

  // Generar resumen con Haiku (coste mínimo)
  let resumen_ia = pub.resumen_ia
  if (!resumen_ia && pub.titulo) {
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 150,
      messages: [{ role: 'user', content: `Resume en 1-2 frases concisas esta publicación del BOE para opositores españoles: "${pub.titulo}"` }],
    })
    resumen_ia = msg.content[0].type === 'text' ? msg.content[0].text : ''
    const coste = msg.usage.input_tokens * 0.0000008 + msg.usage.output_tokens * 0.000001
    await sb.from('ia_uso').insert({ tipo: 'resumen', modelo: 'claude-haiku-4-5', tokens_entrada: msg.usage.input_tokens, tokens_salida: msg.usage.output_tokens, coste_eur: coste })
  }

  await sb.from('boe_publicaciones').update({ procesado: true, resumen_ia }).eq('id', id)
  return Response.json({ ok: true, resumen_ia })
}
