import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

// User-facing: get own referral code + referred users + commissions
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (!authHeader) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
  if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Get client record
  const { data: cliente } = await supabaseAdmin.from('clientes').select('id').eq('user_id', user.id).single()
  if (!cliente) return NextResponse.json({ error: 'No client' }, { status: 404 })

  const [{ data: codigo }, { data: referidos }] = await Promise.all([
    supabaseAdmin.from('codigos_referido').select('*').eq('cliente_id', cliente.id).eq('activo', true).single(),
    supabaseAdmin.from('referidos').select('*, referred:clientes!referidos_referred_id_fkey(nombre, apellidos, email, created_at)').eq('referrer_id', cliente.id).order('created_at', { ascending: false }),
  ])

  return NextResponse.json({ codigo: codigo || null, referidos: referidos || [] })
}
