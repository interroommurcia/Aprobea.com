/**
 * PATCH /api/registro/preferencias
 * Guarda las preferencias de inversión del cliente recién registrado.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

export async function PATCH(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  const { comunidades_interes, capital_disponible, acepta_emails } = await req.json()

  const { error } = await supabaseAdmin
    .from('clientes')
    .update({
      comunidades_interes: comunidades_interes ?? [],
      capital_disponible: Number(capital_disponible) || 0,
      acepta_emails: Boolean(acepta_emails),
    })
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
