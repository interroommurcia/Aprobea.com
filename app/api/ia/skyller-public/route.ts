/**
 * POST /api/ia/skyller-public
 * SKYLLER para visitantes no registrados en la landing.
 * Sin autenticación. Captura leads cuando el usuario da sus datos.
 */
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Eres SKYLLER, el asistente virtual de GrupoSkyLine Investment.
Tu misión es informar a los visitantes sobre nuestros servicios y CAPTURAR SUS DATOS DE CONTACTO para que el equipo se ponga en contacto con ellos.

== QUÉ HACEMOS ==
- **Compra de Créditos Hipotecarios NPL**: Adquirimos deuda hipotecaria impagada con descuentos del 50-80%. El inversor puede participar desde tickets de 1.000€ y obtener rentabilidades del 15-25% anual.
- **Crowdfunding Inmobiliario**: Inversión colectiva en activos inmobiliarios seleccionados. Desde 100€. Rentabilidad del 8-15% anual.
- **Rent to Rent**: Gestionamos propiedades para maximizar rendimientos de alquiler. Ingresos pasivos sin complicaciones.

== CÓMO TRABAJAMOS ==
- Proceso 100% digital y seguro
- Equipo experto en activos inmobiliarios y financieros
- Transparencia total: acceso a documentación y seguimiento en tiempo real
- Con sede en España, operamos a nivel nacional

== TU OBJETIVO ==
Cuando un visitante muestre interés, pídele su nombre y su teléfono o email para que el equipo le contacte. Usa la herramienta "capturar_lead" para guardar sus datos.

== REGLAS ==
- Sé cercano, profesional y conciso
- Respuestas cortas (máx 3 párrafos)
- NO inventes rentabilidades ni datos específicos que no conozcas
- Si preguntan por inversiones específicas o casos complejos, diles que el equipo les asesorará personalmente
- NUNCA pidas datos bancarios ni documentos
- Cuando captures el lead, confirma al usuario que el equipo se pondrá en contacto en menos de 24h`

const CAPTURAR_LEAD_TOOL: Anthropic.Tool = {
  name: 'capturar_lead',
  description: 'Guarda los datos de contacto del visitante interesado para que el equipo de GrupoSkyLine se ponga en contacto con él.',
  input_schema: {
    type: 'object' as const,
    properties: {
      nombre: { type: 'string', description: 'Nombre del visitante (si lo ha dado)' },
      email: { type: 'string', description: 'Email de contacto (si lo ha dado)' },
      telefono: { type: 'string', description: 'Teléfono de contacto (si lo ha dado)' },
      interes: {
        type: 'string',
        enum: ['npl', 'crowdfunding', 'rent-to-rent', 'general'],
        description: 'Tipo de producto por el que pregunta',
      },
      mensaje: { type: 'string', description: 'Resumen breve del motivo de interés o pregunta principal' },
    },
    required: ['mensaje'],
  },
}

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json()
    if (!Array.isArray(messages)) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

    // Llamada a Claude con tool
    const response = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      tools: [CAPTURAR_LEAD_TOOL],
      messages,
    })

    // Procesar tool use si existe
    let leadGuardado = false
    let textContent = ''

    for (const block of response.content) {
      if (block.type === 'tool_use' && block.name === 'capturar_lead') {
        const input = block.input as { nombre?: string; email?: string; telefono?: string; interes?: string; mensaje?: string }
        try {
          await supabaseAdmin.from('leads').insert({
            nombre: input.nombre || null,
            email: input.email || null,
            telefono: input.telefono || null,
            interes: input.interes || 'general',
            mensaje: input.mensaje || '',
            estado: 'nuevo',
          })
          leadGuardado = true
        } catch (e) {
          console.error('[skyller-public] Error guardando lead:', e)
        }

        // Segunda llamada para obtener respuesta de confirmación
        const followUp = await client.messages.create({
          model: 'claude-opus-4-5',
          max_tokens: 400,
          system: SYSTEM_PROMPT,
          messages: [
            ...messages,
            { role: 'assistant', content: response.content },
            {
              role: 'user', content: [{
                type: 'tool_result',
                tool_use_id: block.id,
                content: leadGuardado ? 'Lead guardado correctamente.' : 'Error guardando lead.',
              }]
            },
          ],
        })
        textContent = followUp.content.find(b => b.type === 'text')?.text ?? '¡Perfecto! El equipo se pondrá en contacto contigo pronto.'
      }

      if (block.type === 'text') {
        textContent = block.text
      }
    }

    // Stream word by word
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const words = textContent.split(/(\s+)/)
        for (const word of words) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: word })}\n\n`))
          await new Promise(r => setTimeout(r, 20))
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
        controller.close()
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    })
  } catch (e: any) {
    console.error('[skyller-public]', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
