/**
 * POST /api/stripe/checkout
 * Crea una Stripe Checkout Session para reservar un ticket de operación.
 * Body: { operacion_id, tipo ('npl'|'crowdfunding'), user_id?, email? }
 */
import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  try {
    const { operacion_id, tipo, user_id, email } = await req.json()

    if (!operacion_id || !tipo) {
      return NextResponse.json({ error: 'Faltan parámetros' }, { status: 400 })
    }

    // Obtener precio configurado desde Supabase
    const key = tipo === 'npl' ? 'precio_reserva_npl' : 'precio_reserva_crowdfunding'
    const { data: cfg } = await supabaseAdmin
      .from('configuracion')
      .select('value')
      .eq('key', key)
      .single()

    const precioEuros = cfg ? parseFloat(cfg.value) : (tipo === 'npl' ? 1000 : 100)
    const precioCents = Math.round(precioEuros * 100)

    // Obtener nombre de la operación
    const { data: op } = await supabaseAdmin
      .from('operaciones_estudiadas')
      .select('titulo, tipo')
      .eq('id', operacion_id)
      .single()

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card', 'sepa_debit'],
      customer_email: email ?? undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'eur',
            unit_amount: precioCents,
            product_data: {
              name: `Reserva · ${op?.titulo ?? 'Operación'}`,
              description: `Ticket de ${tipo.toUpperCase()} — GrupoSkyLine Investment`,
              metadata: { operacion_id, tipo, user_id: user_id ?? '' },
            },
          },
        },
      ],
      metadata: {
        operacion_id,
        tipo,
        user_id: user_id ?? '',
        flujo: 'reserva',
      },
      success_url: `${appUrl}/dashboard?pago=ok&op=${operacion_id}`,
      cancel_url:  `${appUrl}/dashboard?pago=cancelado`,
    })

    return NextResponse.json({ url: session.url })
  } catch (e: any) {
    console.error('[stripe/checkout]', e)
    return NextResponse.json({ error: e.message ?? 'Error Stripe' }, { status: 500 })
  }
}
