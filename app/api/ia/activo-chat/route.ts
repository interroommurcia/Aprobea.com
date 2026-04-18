/**
 * POST /api/ia/activo-chat
 * Chat especializado por activo — usa los datos de la operación como contexto.
 * Responde dudas del inversor sobre UNA operación concreta.
 */
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' })

export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 })

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401 })

  const { messages, operacion_id } = await req.json()
  if (!Array.isArray(messages) || !operacion_id) {
    return new Response(JSON.stringify({ error: 'Parámetros incorrectos' }), { status: 400 })
  }

  // Obtener datos de la operación
  const { data: op } = await supabaseAdmin
    .from('operaciones_estudiadas')
    .select('titulo, descripcion, tipo, referencia_catastral, municipio, provincia, comunidad_autonoma, valor_mercado, precio_compra, comision, rentabilidad, ticket_minimo, superficie, tipo_propiedad, fase_hipotecaria, tickets_total')
    .eq('id', operacion_id)
    .single()

  if (!op) return new Response(JSON.stringify({ error: 'Operación no encontrada' }), { status: 404 })

  // Contar tickets vendidos
  const { count: tickets_vendidos } = await supabaseAdmin
    .from('participaciones')
    .select('id', { count: 'exact', head: true })
    .eq('operacion_id', operacion_id)
    .in('estado', ['activa', 'pendiente'])

  const fmt = (n: number | null) => n != null ? `${n.toLocaleString('es-ES')} €` : 'No disponible'

  const system = `Eres SKYLLER, el asistente especializado de GrupoSkyLine Investment para esta operación inmobiliaria concreta. Ayuda al inversor a entender todos los detalles del activo.

DATOS DE LA OPERACIÓN:
• Nombre: ${op.titulo}
• Tipo: ${op.tipo.toUpperCase()}
• Ubicación: ${[op.municipio, op.provincia, op.comunidad_autonoma].filter(Boolean).join(', ') || 'No especificada'}
• Ref. catastral: ${op.referencia_catastral || 'No disponible'}
• Superficie: ${op.superficie ? `${op.superficie} m²` : 'No especificada'}
• Tipo de propiedad: ${op.tipo_propiedad || 'No especificado'}
${op.fase_hipotecaria ? `• Fase hipotecaria: ${op.fase_hipotecaria}` : ''}

DATOS FINANCIEROS:
• Valor de mercado: ${fmt(op.valor_mercado)}
• Precio de compra: ${fmt(op.precio_compra)}
• Rentabilidad estimada: ${op.rentabilidad != null ? `${op.rentabilidad}%` : 'No disponible'}
• Comisión GrupoSkyLine: ${fmt(op.comision)}
• Ticket mínimo: ${fmt(op.ticket_minimo)}
${op.tickets_total ? `• Plazas: ${op.tickets_total} total · ${tickets_vendidos ?? 0} ocupadas · ${Math.max(0, op.tickets_total - (tickets_vendidos ?? 0))} libres` : ''}

DESCRIPCIÓN: ${op.descripcion || 'Sin descripción adicional'}

INSTRUCCIONES:
- Responde SOLO sobre esta operación. Sé conciso y profesional.
- Si no tienes datos suficientes para responder con seguridad, sugiere: "Para información más detallada, puedes contactar directamente al equipo usando el botón 'Contacta directamente al equipo' o compartiendo tu número de móvil."
- Si el inversor muestra interés en invertir o tiene varias dudas técnicas, sugiere hablar con el equipo.
- Nunca inventes datos financieros que no estén en esta ficha.
- Responde siempre en español.`

  const encoder = new TextEncoder()
  const SSE_HEADERS = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 500,
      system,
      messages: messages.slice(-12),
    })

    const texto = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text).join('')

    const stream = new ReadableStream({
      start(controller) {
        const words = texto.split(' ')
        let i = 0
        const tick = setInterval(() => {
          if (i >= words.length) {
            controller.enqueue(encoder.encode('data: [DONE]\n\n'))
            controller.close()
            clearInterval(tick)
            return
          }
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ text: (i === 0 ? '' : ' ') + words[i] })}\n\n`
          ))
          i++
        }, 18)
      },
    })

    return new Response(stream, { headers: SSE_HEADERS })
  } catch (e: any) {
    const msg = `⚠️ Error: ${e.message}`
    return new Response(
      new ReadableStream({
        start(c) {
          c.enqueue(encoder.encode(`data: ${JSON.stringify({ text: msg })}\n\n`))
          c.enqueue(encoder.encode('data: [DONE]\n\n'))
          c.close()
        },
      }),
      { headers: SSE_HEADERS }
    )
  }
}
