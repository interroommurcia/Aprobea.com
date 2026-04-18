/**
 * POST /api/stripe/membresia
 * Crea una Checkout Session para la membresía anual de crowdfunding (110 € + IVA).
 * Body: { user_id, email, nombre? }
 */
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const { user_id, email, nombre } = await req.json()
    if (!email) return NextResponse.json({ error: 'Email requerido' }, { status: 400 })

    // Precio configurable desde Supabase (default 60 €)
    const { data: cfg } = await supabaseAdmin
      .from('configuracion')
      .select('value')
      .eq('key', 'precio_membresia_crowdfunding')
      .single()

    const precioEuros = cfg ? parseFloat(cfg.value) : 110
    const precioCents = Math.round(precioEuros * 100)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    // Buscar o crear customer
    const existingList = await stripe.customers.list({ email, limit: 1 })
    let customer = existingList.data[0]
    if (!customer) {
      customer = await stripe.customers.create({
        email,
        name: nombre ?? undefined,
        metadata: { user_id: user_id ?? '' },
      })
    }

    // Guardar stripe_customer_id en BD
    if (user_id) {
      await supabaseAdmin
        .from('clientes')
        .update({ stripe_customer_id: customer.id })
        .eq('user_id', user_id)
    }

    // Crear precio dinámico con IVA incluido (21 %)
    const ivaRate = await getOrCreateIvaRate()

    const price = await stripe.prices.create({
      unit_amount: precioCents,
      currency: 'eur',
      recurring: { interval: 'year' },
      product_data: {
        name: 'GrupoSkyLine · Membresía Crowdfunding Anual',
        statement_descriptor: 'GSKYLINE CF',
      },
    })

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customer.id,
      payment_method_types: ['card', 'sepa_debit'],
      line_items: [
        {
          price: price.id,
          quantity: 1,
          tax_rates: ivaRate ? [ivaRate] : [],
        },
      ],
      metadata: {
        user_id: user_id ?? '',
        flujo: 'membresia_crowdfunding',
      },
      subscription_data: {
        metadata: { user_id: user_id ?? '', flujo: 'membresia_crowdfunding' },
      },
      success_url: `${appUrl}/dashboard?membresia=ok`,
      cancel_url:  `${appUrl}/?membresia=cancelada`,
      invoice_creation: { enabled: true },
    })

    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    console.error('[stripe/membresia]', e)
    return NextResponse.json({ error: e.message ?? 'Error Stripe' }, { status: 500 })
  }
}

/** Obtiene o crea el tax rate de IVA 21 % en Stripe */
async function getOrCreateIvaRate(): Promise<string | null> {
  try {
    const list = await stripe.taxRates.list({ active: true, limit: 20 })
    const existing = list.data.find(r => r.percentage === 21 && r.jurisdiction === 'ES')
    if (existing) return existing.id

    const created = await stripe.taxRates.create({
      display_name: 'IVA',
      description: 'IVA España 21%',
      jurisdiction: 'ES',
      percentage: 21,
      inclusive: false,
    })
    return created.id
  } catch {
    return null
  }
}
