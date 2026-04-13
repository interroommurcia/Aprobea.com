import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_session')?.value === '1'
}

const DEFAULTS: Record<string, string> = {
  precio_suscripcion_anual:    '29',
  precio_reserva_npl:          '1000',
  precio_reserva_crowdfunding: '100',
  pagos_activos:               'false',
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('configuracion')
    .select('key, value')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Merge con defaults para que siempre existan todas las claves
  const result = { ...DEFAULTS }
  for (const row of data ?? []) result[row.key] = row.value

  return NextResponse.json(result)
}

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as Record<string, string>

  // Upsert cada key-value
  const rows = Object.entries(body).map(([key, value]) => ({ key, value: String(value) }))

  const { error } = await supabaseAdmin
    .from('configuracion')
    .upsert(rows, { onConflict: 'key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
