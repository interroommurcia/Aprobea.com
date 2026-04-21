import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { anthropic, MODEL, SUPPORT_SYSTEM_PROMPT } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { messages, confirmacion_escalada } = await req.json()
  // messages: [{role, content}]

  // Si el usuario confirma la escalada, crear ticket
  if (confirmacion_escalada) {
    const { categoria, mensaje } = confirmacion_escalada
    await supabase.from('tickets').insert({
      user_id: user?.id ?? null,
      categoria,
      mensaje_original: mensaje,
      prioridad: categoria === 'BILLING' || categoria === 'REFUND' ? 'alta' : 'media',
    })

    // Email a backoffice via queue
    if (user) {
      await supabase.from('email_queue').insert({
        user_id: user.id,
        tipo: 'ticket_confirmacion',
        payload: { categoria, mensaje },
        scheduled_for: new Date().toISOString(),
      })
    }

    return NextResponse.json({
      respuesta: `✅ Ticket creado. Nuestro equipo te contactará en menos de 24h en ${user?.email ?? 'tu email'}. Número de referencia: #${Date.now().toString().slice(-6)}`,
      ticket_creado: true,
    })
  }

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [
      {
        type: 'text',
        text: SUPPORT_SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
      ...(user ? [{
        type: 'text' as const,
        text: `Usuario: ${user.email}`,
      }] : []),
    ],
    messages: messages.slice(-10), // máx 10 mensajes de contexto
  })

  const texto = response.content[0].type === 'text' ? response.content[0].text : ''

  // Detectar si la IA indica escalada
  let escalada = null
  try {
    const jsonMatch = texto.match(/\{[^}]*"escalada"\s*:\s*true[^}]*\}/)
    if (jsonMatch) escalada = JSON.parse(jsonMatch[0])
  } catch {}

  return NextResponse.json({ respuesta: texto, escalada })
}
