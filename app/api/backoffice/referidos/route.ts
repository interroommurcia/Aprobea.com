import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_session')?.value === '1'
}

// GET: all referral codes + relationships
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const tipo = req.nextUrl.searchParams.get('tipo') // 'codigos' | 'relaciones'

  if (tipo === 'relaciones') {
    const { data, error } = await supabaseAdmin
      .from('referidos')
      .select('*, referrer:clientes!referidos_referrer_id_fkey(nombre, apellidos, email), referred:clientes!referidos_referred_id_fkey(nombre, apellidos, email)')
      .order('created_at', { ascending: false })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json(data)
  }

  const { data, error } = await supabaseAdmin
    .from('codigos_referido')
    .select('*, clientes(nombre, apellidos, email)')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// POST: create referral code for a client
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { cliente_id, comision_pct, max_usos } = await req.json()
  if (!cliente_id) return NextResponse.json({ error: 'Falta cliente_id' }, { status: 400 })

  // Generate unique code
  const codigo = `SL-${Math.random().toString(36).slice(2, 7).toUpperCase()}`

  const { data, error } = await supabaseAdmin.from('codigos_referido').insert({
    cliente_id,
    codigo,
    comision_pct: Number(comision_pct) || 5,
    max_usos: Number(max_usos) || null,
    activo: true,
    usos: 0,
  }).select('*, clientes(nombre, apellidos, email)').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// PATCH: update commission on a referral relationship
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, comision_pagada, comision_importe, activo } = await req.json()
  const updates: Record<string, unknown> = {}
  if (comision_pagada !== undefined) updates.comision_pagada = comision_pagada
  if (comision_importe !== undefined) updates.comision_importe = comision_importe
  if (activo !== undefined) updates.activo = activo

  const { error } = await supabaseAdmin.from('referidos').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, tipo } = await req.json()
  const table = tipo === 'codigo' ? 'codigos_referido' : 'referidos'
  const { error } = await supabaseAdmin.from(table).delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
