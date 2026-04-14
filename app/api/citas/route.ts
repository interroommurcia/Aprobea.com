/**
 * GET  /api/citas  → citas del cliente autenticado
 * POST /api/citas  → crear solicitud de cita (llamada interna desde IA)
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

async function getCliente(token: string) {
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return null
  const { data } = await supabaseAdmin.from('clientes').select('*').eq('user_id', user.id).single()
  return data
}

export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const cliente = await getCliente(token)
  if (!cliente) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const { data } = await supabaseAdmin
    .from('citas_solicitudes')
    .select('*')
    .eq('cliente_id', cliente.id)
    .order('created_at', { ascending: false })

  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const cliente = await getCliente(token)
  if (!cliente) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  const body = await req.json()

  const { data, error } = await supabaseAdmin
    .from('citas_solicitudes')
    .insert({
      cliente_id: cliente.id,
      tipo: body.tipo ?? 'llamada',
      fecha_propuesta: body.fecha_propuesta ?? null,
      hora_propuesta: body.hora_propuesta ?? null,
      mensaje: body.mensaje ?? '',
      estado: 'pendiente',
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notificación interna para el admin (tabla notificaciones_admin si existe, o log)
  // Aquí podríamos enviar email — por ahora queda en la tabla para backoffice
  return NextResponse.json(data, { status: 201 })
}
