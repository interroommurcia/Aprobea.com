/**
 * Matching de clientes y envío de notificaciones + emails
 * cuando se publica un nuevo activo en GrupoSkyLine.
 */
import { supabaseAdmin } from '@/lib/supabase-admin'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.gruposkyline.org'
const FROM_EMAIL = 'GrupoSkyLine <noreply@gruposkyline.org>'

export interface ActivoPublicado {
  id: string
  titulo: string
  tipo: string
  comunidad_autonoma: string | null
  ticket_minimo: number | null
  descripcion?: string | null
  provincia?: string | null
}

export async function notificarActivoPublicado(activo: ActivoPublicado) {
  // Obtener todos los clientes con email confirmado
  const { data: clientes } = await supabaseAdmin
    .from('clientes')
    .select('id, nombre, email, comunidades_interes, capital_disponible, acepta_emails')
    .not('email', 'is', null)

  if (!clientes || clientes.length === 0) return

  const matching = clientes.filter(c => {
    // Filtro por capital disponible (si el cliente lo ha indicado)
    const capitalOk =
      !activo.ticket_minimo ||
      !c.capital_disponible ||
      c.capital_disponible === 0 ||
      c.capital_disponible >= activo.ticket_minimo

    // Filtro por comunidad autónoma (si el cliente tiene preferencias)
    const comunidades: string[] = c.comunidades_interes ?? []
    const comunidadOk =
      !activo.comunidad_autonoma ||
      comunidades.length === 0 ||
      comunidades.includes(activo.comunidad_autonoma)

    return capitalOk && comunidadOk
  })

  if (matching.length === 0) return

  // Insertar notificaciones in-app + enviar emails en paralelo
  await Promise.all(
    matching.map(async (cliente) => {
      // Notificación in-app (siempre)
      await supabaseAdmin.from('notificaciones').insert({
        cliente_id: cliente.id,
        titulo: '🏠 Nuevo activo de interés para ti',
        mensaje: `Acaba de publicarse "${activo.titulo}" — una oportunidad que encaja con tus criterios de búsqueda. Entra a tu área de cliente para ver todos los detalles.`,
        tipo: 'operacion',
        leida: false,
      })

      // Email (solo si acepta_emails = true y hay API key)
      if (cliente.acepta_emails && process.env.RESEND_API_KEY && cliente.email) {
        try {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: cliente.email,
            subject: `🏠 Nueva oportunidad de inversión — ${activo.titulo}`,
            html: emailTemplate({
              nombre: cliente.nombre ?? 'Inversor',
              titulo: activo.titulo,
              tipo: activo.tipo,
              comunidad: activo.comunidad_autonoma,
              ticketMinimo: activo.ticket_minimo,
              descripcion: activo.descripcion,
              url: `${APP_URL}/dashboard`,
            }),
          })
        } catch (e) {
          console.error('[notificar-activo] Error enviando email a', cliente.email, e)
        }
      }
    })
  )

  console.log(`[notificar-activo] ${matching.length} clientes notificados para activo "${activo.titulo}"`)
}

function emailTemplate(data: {
  nombre: string
  titulo: string
  tipo: string
  comunidad: string | null
  ticketMinimo: number | null
  descripcion?: string | null
  url: string
}) {
  const tipoLabel = data.tipo === 'npl' ? 'Crédito NPL' : data.tipo === 'crowdfunding' ? 'Crowdfunding' : data.tipo
  const ticketStr = data.ticketMinimo ? `Desde ${data.ticketMinimo.toLocaleString('es-ES')}€` : ''

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nueva oportunidad de inversión</title>
</head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111;border:1px solid #2a2200;border-radius:16px;overflow:hidden;max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a1200,#0f0900);padding:32px 40px;border-bottom:1px solid #2a2200;text-align:center;">
            <div style="font-size:11px;letter-spacing:0.25em;text-transform:uppercase;color:#C9A043;margin-bottom:8px;">GrupoSkyLine Investment</div>
            <div style="font-size:22px;font-weight:300;color:#f5f0e8;line-height:1.3;">Nueva oportunidad de inversión</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <p style="color:#b0a898;font-size:15px;margin:0 0 24px;">Hola <strong style="color:#f5f0e8;">${data.nombre}</strong>,</p>
            <p style="color:#b0a898;font-size:14px;line-height:1.7;margin:0 0 28px;">
              Acaba de publicarse una nueva oportunidad que <strong style="color:#C9A043;">encaja con tus criterios de búsqueda</strong>.
            </p>

            <!-- Asset card -->
            <div style="background:#0d0d0d;border:1px solid #2a2200;border-radius:12px;padding:24px;margin-bottom:28px;">
              <div style="font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:#C9A043;margin-bottom:8px;">${tipoLabel}${data.comunidad ? ` · ${data.comunidad}` : ''}</div>
              <div style="font-size:20px;font-weight:600;color:#f5f0e8;margin-bottom:12px;">${data.titulo}</div>
              ${data.descripcion ? `<p style="color:#888;font-size:13px;line-height:1.65;margin:0 0 16px;">${data.descripcion.slice(0, 180)}${data.descripcion.length > 180 ? '…' : ''}</p>` : ''}
              ${ticketStr ? `<div style="display:inline-block;background:#1a1200;border:1px solid #2a2200;border-radius:8px;padding:6px 16px;font-size:13px;color:#C9A043;font-weight:600;">${ticketStr}</div>` : ''}
            </div>

            <!-- CTA -->
            <div style="text-align:center;margin-bottom:28px;">
              <a href="${data.url}" style="display:inline-block;background:linear-gradient(135deg,#C9A043,#a07828);color:#0a0a0a;font-size:13px;font-weight:700;letter-spacing:0.1em;text-transform:uppercase;text-decoration:none;padding:14px 36px;border-radius:10px;">
                Ver más información →
              </a>
            </div>

            <p style="color:#555;font-size:12px;line-height:1.6;margin:0;">
              Recibes este email porque has dado tu consentimiento para recibir oportunidades de inversión de GrupoSkyLine.
              Para dejar de recibirlos, accede a tu <a href="${data.url}" style="color:#C9A043;">área de cliente</a> y actualiza tus preferencias.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #1a1a1a;text-align:center;">
            <div style="font-size:11px;color:#444;letter-spacing:0.05em;">GrupoSkyLine Investment · España</div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
