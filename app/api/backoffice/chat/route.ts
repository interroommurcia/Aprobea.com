import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_session')?.value === '1'
}

// GET — list all conversations with client info + last message + unread counts
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('conversaciones')
    .select('*, cliente:clientes(id, nombre, apellidos, email, tipo_inversor)')
    .order('ultimo_mensaje_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

// POST — create new conversation
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { cliente_id, operacion_nombre, referencia_catastral, tipo } = await req.json()
  if (!cliente_id) return NextResponse.json({ error: 'cliente_id requerido' }, { status: 400 })

  // Prevent duplicate conversations for same client + operation
  if (operacion_nombre) {
    const { data: existing } = await supabaseAdmin
      .from('conversaciones')
      .select('id')
      .eq('cliente_id', cliente_id)
      .eq('operacion_nombre', operacion_nombre)
      .single()
    if (existing) return NextResponse.json({ error: 'Ya existe', existing_id: existing.id }, { status: 409 })
  }

  const { data, error } = await supabaseAdmin
    .from('conversaciones')
    .insert({
      cliente_id,
      operacion_nombre: operacion_nombre || null,
      referencia_catastral: referencia_catastral || null,
      tipo: tipo || 'npl',
      ultimo_mensaje_at: new Date().toISOString(),
    })
    .select('*, cliente:clientes(id, nombre, apellidos, email, tipo_inversor)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}

// PATCH — update conversation (toggle active, clear unread, etc.)
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, ...updates } = await req.json()
  const { error } = await supabaseAdmin.from('conversaciones').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE — archive conversation
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await req.json()
  const { error } = await supabaseAdmin.from('conversaciones').update({ activa: false }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
