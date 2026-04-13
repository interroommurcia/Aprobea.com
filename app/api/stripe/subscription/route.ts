/**
 * POST /api/stripe/subscription
 * Crea una Stripe Checkout Session para la suscripción anual de inversor.
 * Body: { user_id, email, nombre? }
 */
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const { user_id, email, nombre } = await req.json()

    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
    }

    // Precio de suscripción desde Supabase config
    const { data: cfg } = await supabaseAdmin
      .from('configuracion')
      .select('value')
      .eq('key', 'precio_suscripcion_anual')
      .single()

    const precioEuros = cfg ? parseFloat(cfg.value) : 29
    const precioCents = Math.round(precioEuros * 100)

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    // Buscar o crear customer en Stripe
    const existingList = await stripe.customers.list({ email, limit: 1 })
    let customer = existingList.data[0]
    if (!customer) {
      customer = await stripe.customers.create({
        email,
        name: nombre ?? undefined,
        metadata: { user_id: user_id ?? '' },
      })
    }

    // Crear precio dinámico para la suscripción
    const price = await stripe.prices.create({
      unit_amount: precioCents,
      currency: 'eur',
      recurring: { interval: 'year' },
      product_data: {
        name: 'GrupoSkyLine · Acceso Inversor',
        statement_descriptor: 'GRUPOSKYLINE',
      },
    })

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customer.id,
      payment_method_types: ['card', 'sepa_debit'],
      line_items: [{ price: price.id, quantity: 1 }],
      metadata: {
        user_id: user_id ?? '',
        flujo: 'suscripcion',
      },
      subscription_data: {
        metadata: { user_id: user_id ?? '' },
      },
      success_url: `${appUrl}/dashboard?suscripcion=ok`,
      cancel_url:  `${appUrl}/registro?suscripcion=cancelada`,
    })

    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    console.error('[stripe/subscription]', e)
    return NextResponse.json({ error: e.message ?? 'Error Stripe' }, { status: 500 })
  }
}
