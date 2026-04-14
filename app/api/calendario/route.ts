/**
 * GET  /api/calendario  → lista eventos del usuario autenticado
 * POST /api/calendario  → crea evento manual
 * DELETE /api/calendario → elimina evento manual (solo el propietario)
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

function userClient(token: string) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
}

export async function GET(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user } } = await userClient(token).auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  // Obtener cliente
  const { data: cliente } = await supabaseAdmin
    .from('clientes').select('id').eq('user_id', user.id).single()

  if (!cliente) return NextResponse.json([])

  const { data } = await supabaseAdmin
    .from('eventos_calendario')
    .select('*')
    .eq('cliente_id', cliente.id)
    .order('fecha', { ascending: true })

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user } } = await userClient(token).auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: cliente } = await supabaseAdmin
    .from('clientes').select('id').eq('user_id', user.id).single()
  if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

  const body = await req.json()
  const { data, error } = await supabaseAdmin
    .from('eventos_calendario')
    .insert({ ...body, cliente_id: cliente.id, user_id: user.id, tipo: body.tipo ?? 'manual' })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '') ?? ''
  const { data: { user } } = await userClient(token).auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { id } = await req.json()
  const { error } = await supabaseAdmin
    .from('eventos_calendario')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)   // solo puede borrar los suyos

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
