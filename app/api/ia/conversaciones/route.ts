/**
 * GET    /api/ia/conversaciones  → lista las conversaciones del cliente (máx 3)
 * POST   /api/ia/conversaciones  → crea una nueva (error si ya tiene 3)
 * PATCH  /api/ia/conversaciones  → guarda mensajes + actualiza título
 * DELETE /api/ia/conversaciones  → elimina una conversación
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

const MAX_CONVS = 3

async function getCliente(token: string) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const { data } = await supabaseAdmin.from('clientes').select('id').eq('user_id', user.id).single()
  return data
}

export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const cliente = await getCliente(token)
  if (!cliente) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const { data, error } = await supabaseAdmin
    .from('ia_conversaciones')
    .select('id, titulo, created_at, updated_at, mensajes')
    .eq('cliente_id', cliente.id)
    .order('updated_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const cliente = await getCliente(token)
  if (!cliente) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  // Comprobar límite de 3
  const { count } = await supabaseAdmin
    .from('ia_conversaciones')
    .select('id', { count: 'exact', head: true })
    .eq('cliente_id', cliente.id)

  if ((count ?? 0) >= MAX_CONVS) {
    return NextResponse.json({ error: 'Límite de 3 conversaciones alcanzado. Borra una para continuar.' }, { status: 409 })
  }

  const { data, error } = await supabaseAdmin
    .from('ia_conversaciones')
    .insert({ cliente_id: cliente.id, titulo: 'Nueva conversación', mensajes: [] })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const cliente = await getCliente(token)
  if (!cliente) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const { id, mensajes, titulo } = await req.json()

  // Auto-título: primer mensaje del usuario (máx 45 chars)
  const tituloFinal = titulo
    ?? (Array.isArray(mensajes) ? mensajes.find((m: any) => m.role === 'user')?.content?.slice(0, 45) : null)
    ?? 'Nueva conversación'

  const { error } = await supabaseAdmin
    .from('ia_conversaciones')
    .update({ mensajes, titulo: tituloFinal, updated_at: new Date().toISOString() })
    .eq('id', id)
    .eq('cliente_id', cliente.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const cliente = await getCliente(token)
  if (!cliente) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const { id } = await req.json()

  const { error } = await supabaseAdmin
    .from('ia_conversaciones')
    .delete()
    .eq('id', id)
    .eq('cliente_id', cliente.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
