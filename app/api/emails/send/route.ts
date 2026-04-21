import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/server'

const getResend = () => new Resend(process.env.RESEND_API_KEY ?? 'placeholder')
const FROM = () => process.env.RESEND_FROM ?? 'Aprobea <noreply@aprobea.com>'

// Cron: procesa la cola de emails pendientes
export async function POST(req: NextRequest) {
  const auth = req.headers.get('x-cron-secret')
  if (auth !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = await createServiceClient()

  const { data: pendientes } = await supabase
    .from('email_queue')
    .select('*, profiles(email, nombre)')
    .eq('enviado', false)
    .lte('scheduled_for', new Date().toISOString())
    .limit(50)

  if (!pendientes || pendientes.length === 0) {
    return NextResponse.json({ enviados: 0 })
  }

  let enviados = 0
  for (const item of pendientes) {
    const profile = item.profiles as { email: string; nombre: string } | null
    if (!profile?.email) continue

    const html = buildEmail(item.tipo, item.payload, profile.nombre)
    if (!html) continue

    try {
      await getResend().emails.send({
        from: FROM(),
        to: profile.email,
        subject: EMAIL_SUBJECTS[item.tipo as keyof typeof EMAIL_SUBJECTS] ?? 'Aprobea',
        html,
      })

      await supabase.from('email_queue').update({
        enviado: true,
        enviado_at: new Date().toISOString(),
      }).eq('id', item.id)

      enviados++
    } catch (e) {
      await supabase.from('email_queue').update({
        error: String(e),
      }).eq('id', item.id)
    }
  }

  return NextResponse.json({ enviados })
}

const EMAIL_SUBJECTS = {
  bienvenida: '¡Bienvenido a Aprobea! Tu portal de oposiciones',
  alerta_convocatoria: '🔔 Nueva convocatoria publicada',
  churn_prevention: 'Tu progreso en Aprobea te espera',
  renovacion: 'Tu suscripción Pro se renueva pronto',
  ticket_confirmacion: 'Ticket de soporte recibido',
  ticket_resuelto: 'Tu consulta ha sido resuelta',
  onboarding_d3: '¿Todo bien con Aprobea?',
}

function buildEmail(tipo: string, payload: Record<string, unknown>, nombre: string): string | null {
  const base = (content: string) => `
    <!DOCTYPE html><html><body style="font-family:sans-serif;background:#0B0C0B;color:#FAF9F5;padding:32px;">
    <div style="max-width:560px;margin:0 auto;">
      <div style="margin-bottom:24px;">
        <span style="font-size:20px;font-weight:700;">Apro<span style="color:#1D9E75;">bea</span></span>
      </div>
      ${content}
      <p style="color:#C2C0B6;font-size:12px;margin-top:32px;">
        Aprobea · Oposiciones Locales y Regionales · España<br>
        <a href="{{{unsubscribe}}}" style="color:#1D9E75;">Darse de baja</a>
      </p>
    </div></body></html>`

  switch (tipo) {
    case 'bienvenida':
      return base(`<h1 style="color:#1D9E75;">¡Bienvenido${nombre ? ', ' + nombre : ''}!</h1>
        <p>Ya formas parte de Aprobea, la plataforma que centraliza convocatorias de oposiciones locales y regionales en España.</p>
        <p><strong>Próximos pasos:</strong></p>
        <ul><li>Configura tus alertas de convocatorias</li><li>Elige tu oposición objetivo</li><li>Haz tu primer examen diagnóstico</li></ul>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/onboarding" style="display:inline-block;background:#1D9E75;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin-top:16px;">Empezar ahora →</a>`)

    case 'alerta_convocatoria':
      return base(`<h2>🔔 Nueva convocatoria</h2>
        <div style="background:rgba(29,158,117,0.1);border:1px solid rgba(29,158,117,0.3);border-radius:12px;padding:20px;margin:16px 0;">
          <h3 style="margin:0 0 8px;color:#FAF9F5;">${payload.titulo}</h3>
          <p style="margin:4px 0;color:#C2C0B6;">Plazas: <strong style="color:#1D9E75;">${payload.plazas ?? 'N/D'}</strong></p>
          <p style="margin:4px 0;color:#C2C0B6;">Plazo: <strong>${payload.fecha_limite ?? 'Ver convocatoria'}</strong></p>
          <p style="margin:4px 0;color:#C2C0B6;">Boletín: ${payload.boletin}</p>
        </div>
        <a href="${payload.url}" style="display:inline-block;background:#1D9E75;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Ver convocatoria oficial →</a>`)

    case 'churn_prevention':
      return base(`<h2>👋 Te echamos de menos, ${nombre || 'opositor'}</h2>
        <p>Llevas varios días sin entrar a Aprobea. Tu preparación no puede esperar.</p>
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/dashboard" style="display:inline-block;background:#1D9E75;color:#000;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;">Continuar mi preparación →</a>`)

    case 'ticket_confirmacion':
      return base(`<h2>✅ Consulta recibida</h2>
        <p>Hemos recibido tu consulta y nuestro equipo la revisará en menos de 24 horas.</p>
        <p style="color:#C2C0B6;">Categoría: <strong>${payload.categoria}</strong></p>`)

    default:
      return null
  }
}
