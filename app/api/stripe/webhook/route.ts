/**
 * POST /api/stripe/webhook
 * Recibe eventos de Stripe y actualiza la BD.
 *
 * Eventos manejados:
 *  - checkout.session.completed  → crea participación o activa suscripción
 *  - invoice.payment_succeeded   → renueva suscripción
 *  - customer.subscription.deleted → desactiva acceso
 */
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export const runtime = 'nodejs'   // Necesario para leer raw body

export async function POST(req: NextRequest) {
  const payload = await req.text()
  const sig     = req.headers.get('stripe-signature') ?? ''
  const secret  = process.env.STRIPE_WEBHOOK_SECRET ?? ''

  let event: import('stripe').Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(payload, sig, secret)
  } catch (e: any) {
    console.error('[webhook] Firma inválida:', e.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {

      /* ── Pago único completado (reserva de ticket) ───────────────────── */
      case 'checkout.session.completed': {
        const session = event.data.object as import('stripe').Stripe.Checkout.Session
        const meta    = session.metadata ?? {}

        if (meta.flujo === 'reserva') {
          const { operacion_id, user_id } = meta
          if (operacion_id) {
            await supabaseAdmin.from('participaciones').insert({
              operacion_id,
              user_id:           user_id || null,
              estado:            'activa',
              stripe_session_id: session.id,
              importe:           (session.amount_total ?? 0) / 100,
            })
          }
        }

        if (meta.flujo === 'suscripcion' && meta.user_id) {
          await supabaseAdmin
            .from('clientes')
            .update({ estado: 'activo', suscripcion_activa: true })
            .eq('user_id', meta.user_id)
        }

        // ── Membresía crowdfunding ────────────────────────────────────────
        if (meta.flujo === 'membresia_crowdfunding' && meta.user_id) {
          const expira = new Date()
          expira.setFullYear(expira.getFullYear() + 1)
          await supabaseAdmin
            .from('clientes')
            .update({
              membresia_crowdfunding_activa: true,
              membresia_expira_en: expira.toISOString(),
              estado: 'activo',
            })
            .eq('user_id', meta.user_id)
        }
        break
      }

      /* ── Renovación de suscripción / membresía ──────────────────────── */
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as import('stripe').Stripe.Invoice & { subscription?: string }
        const sub     = invoice.subscription as string | null
        if (sub) {
          const subscription = await stripe.subscriptions.retrieve(sub)
          const userId = subscription.metadata?.user_id
          const flujo  = subscription.metadata?.flujo
          if (userId) {
            if (flujo === 'membresia_crowdfunding') {
              const expira = new Date()
              expira.setFullYear(expira.getFullYear() + 1)
              await supabaseAdmin
                .from('clientes')
                .update({ membresia_crowdfunding_activa: true, membresia_expira_en: expira.toISOString() })
                .eq('user_id', userId)
            } else {
              await supabaseAdmin
                .from('clientes')
                .update({ suscripcion_activa: true })
                .eq('user_id', userId)
            }
          }
        }
        break
      }

      /* ── Pago fallido: desactivar acceso ─────────────────────────────── */
      case 'invoice.payment_failed': {
        const invoice = event.data.object as import('stripe').Stripe.Invoice & { subscription?: string }
        const sub     = invoice.subscription as string | null
        if (sub) {
          const subscription = await stripe.subscriptions.retrieve(sub)
          const userId = subscription.metadata?.user_id
          const flujo  = subscription.metadata?.flujo
          if (userId && flujo === 'membresia_crowdfunding') {
            await supabaseAdmin
              .from('clientes')
              .update({ membresia_crowdfunding_activa: false })
              .eq('user_id', userId)
          }
        }
        break
      }

      /* ── Suscripción cancelada ───────────────────────────────────────── */
      case 'customer.subscription.deleted': {
        const sub    = event.data.object as import('stripe').Stripe.Subscription
        const userId = sub.metadata?.user_id
        const flujo  = sub.metadata?.flujo
        if (userId) {
          if (flujo === 'membresia_crowdfunding') {
            await supabaseAdmin
              .from('clientes')
              .update({ membresia_crowdfunding_activa: false })
              .eq('user_id', userId)
          } else {
            await supabaseAdmin
              .from('clientes')
              .update({ suscripcion_activa: false })
              .eq('user_id', userId)
          }
        }
        break
      }
    }
  } catch (e: any) {
    console.error('[webhook] Error procesando evento:', event.type, e)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
