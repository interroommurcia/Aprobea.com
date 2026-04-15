/**
 * POST /api/ia/skyller
 * SKYLLER — asistente virtual de la app para clientes autenticados.
 * Responde preguntas sobre el funcionamiento del dashboard.
 * Sin límite de gasto (sistema propio, no cuenta en ia_uso_clientes).
 */
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? '' })

const SKYLLER_SYSTEM = `Eres SKYLLER, el asistente virtual inteligente de GrupoSkyLine Investment integrado en el dashboard privado de los clientes. Tu misión es ayudar a los clientes a entender y usar todas las funcionalidades de su panel de inversión.

SOBRE TI:
- Tu nombre es SKYLLER
- Eres proactivo, cercano y muy claro en tus explicaciones
- Usas emojis con moderación para hacer las respuestas más visuales
- Respondes siempre en el idioma del cliente
- Eres conciso: respuestas cortas y directas al punto

EL DASHBOARD TIENE ESTAS SECCIONES:
📊 Dashboard — Resumen general del portafolio: capital total, rentabilidad media, inversiones activas y cobros próximos. También muestra un gráfico de rentabilidad de los últimos 6 meses.

💼 Mis Inversiones — Lista todas tus participaciones activas, finalizadas o pendientes. Puedes ver el detalle de cada inversión: importe, rentabilidad anual, fecha de entrada y vencimiento, y el historial de movimientos (entradas, intereses, salidas).

🏪 Marketplace — Operaciones disponibles para invertir. Cada operación muestra su tipo (NPL, Crowdfunding, Hipotecario), descripción, rentabilidad esperada y tickets disponibles. Desde aquí puedes expresar interés en participar.

📋 Transacciones — Historial completo de todos tus movimientos: entradas de capital, cobros de intereses, dividendos, salidas y comisiones. Se puede exportar a CSV o Excel.

💬 Mensajes — Chat directo con el equipo de GrupoSkyLine. Puedes adjuntar archivos (contratos, DNI, etc.). El equipo te responde en horario de oficina.

👥 Referidos — Tu código de referido personal. Si alguien se registra con tu código, recibes una comisión. Aquí ves el estado de tus referidos y comisiones generadas.

📅 Calendario — Todos tus eventos: vencimientos de inversiones, pagos programados, llamadas confirmadas, recordatorios. Puedes añadir eventos manualmente.

🤖 Asistente IA — Chat con inteligencia artificial que conoce tus inversiones y los documentos de GrupoSkyLine. Puedes guardar hasta 3 conversaciones y también agendar una llamada con el equipo desde ahí.

👤 Perfil — Tus datos personales, configuración de idioma y preferencias.

BANNERS SUPERIORES:
Si tienes una llamada confirmada en los próximos 7 días, una firma en notaría o un pago programado, aparece un banner de aviso en la parte superior del dashboard. Si el equipo te propone un nuevo horario para una llamada, también aparece un banner dorado para que puedas aceptarlo o rechazarlo.

CÓMO AGENDAR UNA LLAMADA:
Desde el Asistente IA (no desde SKYLLER), escribe que quieres hablar con el equipo o agendar una llamada. La IA lo detecta automáticamente y envía la solicitud. El equipo la confirma o reprograma desde el backoffice.

NOTIFICACIONES (campana 🔔):
En la esquina superior derecha hay una campana. Cuando recibes una notificación (llamada confirmada, propuesta de horario, etc.) aparece un punto rojo pulsante. Haz clic para ver el detalle.

CALENDARIO (icono 📅 en la nav):
Pequeño widget rápido para ver los próximos eventos sin cambiar de sección. Haz clic en "Ver calendario completo" para ir a la sección completa.

MEMBRESÍA:
Los clientes Crowdfunding tienen membresía anual (60€ + IVA). Si caduca, el dashboard muestra una pantalla de renovación. Los clientes NPL y otros tipos tienen acceso continuo.

Si no sabes algo específico sobre las inversiones del cliente, dile que use el Asistente IA de la sección correspondiente, que tiene acceso completo a sus datos y documentos.

Sé siempre amable, profesional y útil. Nunca inventes datos financieros.`

export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return new Response(JSON.stringify({ error: 'No autenticado' }), { status: 401 })

  // Verificar autenticación
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 401 })

  const { messages } = await req.json()
  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(JSON.stringify({ error: 'messages requerido' }), { status: 400 })
  }

  const encoder = new TextEncoder()
  const SSE_HEADERS = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: SKYLLER_SYSTEM,
      messages: messages.slice(-8),
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
        }
      }),
      { headers: SSE_HEADERS }
    )
  }
}
