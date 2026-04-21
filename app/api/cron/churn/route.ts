import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

// Ejecutar diariamente — detecta usuarios inactivos y encola emails
export async function POST(req: NextRequest) {
  const auth = req.headers.get('x-cron-secret')
  if (auth !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = await createServiceClient()
  const hace7dias = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
  const hace3dias = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()

  // Usuarios inactivos 7+ días con plan pro
  const { data: inactivos } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('plan', 'pro')
    .lt('last_active_at', hace7dias)

  // Suscripciones que se renuevan en 3 días
  const { data: renovaciones } = await supabase
    .from('profiles')
    .select('id')
    .not('stripe_subscription_id', 'is', null)
    // En producción filtrarías por fecha de renovación de Stripe

  let encolados = 0

  if (inactivos) {
    for (const u of inactivos) {
      // Evitar duplicar emails recientes
      const { count } = await supabase
        .from('email_queue')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', u.id)
        .eq('tipo', 'churn_prevention')
        .gte('created_at', hace3dias)

      if (!count || count === 0) {
        await supabase.from('email_queue').insert({
          user_id: u.id,
          tipo: 'churn_prevention',
          payload: {},
          scheduled_for: new Date().toISOString(),
        })
        encolados++
      }
    }
  }

  return NextResponse.json({ encolados, inactivos: inactivos?.length ?? 0 })
}
