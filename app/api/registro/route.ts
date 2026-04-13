import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const { user_id, nombre, apellidos, email, telefono, tipo_inversor, capital_inicial, codigo_referido } = await req.json()
  if (!user_id || !email) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

  const { data: cliente, error } = await supabaseAdmin.from('clientes').insert({
    user_id,
    nombre,
    apellidos,
    email,
    telefono,
    tipo_inversor: tipo_inversor || 'crowdfunding',
    capital_inicial: Number(capital_inicial) || 0,
    estado: 'lead',
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Process referral code if provided
  if (codigo_referido && cliente) {
    const { data: codigo } = await supabaseAdmin
      .from('codigos_referido')
      .select('*')
      .eq('codigo', codigo_referido.trim().toUpperCase())
      .eq('activo', true)
      .single()

    if (codigo) {
      // Check max uses
      const maxOk = !codigo.max_usos || codigo.usos < codigo.max_usos
      if (maxOk) {
        await Promise.all([
          supabaseAdmin.from('referidos').insert({
            referrer_id: codigo.cliente_id,
            referred_id: cliente.id,
            codigo_usado: codigo.codigo,
            comision_pct: codigo.comision_pct,
            comision_importe: 0,
            comision_pagada: false,
          }),
          supabaseAdmin.from('codigos_referido').update({ usos: codigo.usos + 1 }).eq('id', codigo.id),
        ])
      }
    }
  }

  return NextResponse.json({ ok: true })
}
