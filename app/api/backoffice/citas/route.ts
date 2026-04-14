/**
 * GET   /api/backoffice/citas          → todas las solicitudes
 * PATCH /api/backoffice/citas          → confirmar / denegar / reprogramar
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_session')?.value === '1'
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const estado = req.nextUrl.searchParams.get('estado')
  let query = supabaseAdmin
    .from('citas_solicitudes')
    .select(`*, clientes(nombre, apellidos, email, telefono)`)
    .order('created_at', { ascending: false })

  if (estado) query = query.eq('estado', estado)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id, estado, fecha_confirmada, hora_confirmada, nota_admin } = await req.json()

  const { data: cita, error: citaError } = await supabaseAdmin
    .from('citas_solicitudes')
    .update({ estado, fecha_confirmada, hora_confirmada, nota_admin, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select('*, clientes(id, nombre)')
    .single()

  if (citaError) return NextResponse.json({ error: citaError.message }, { status: 500 })

  // Crear notificación para el cliente
  const clienteId = cita.clientes?.id ?? cita.cliente_id
  const clienteNombre = cita.clientes?.nombre ?? 'Cliente'

  let titulo = ''
  let mensaje = ''

  if (estado === 'confirmada') {
    titulo = '✓ Cita confirmada'
    const fechaStr = fecha_confirmada
      ? `el ${new Date(fecha_confirmada + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}${hora_confirmada ? ` a las ${hora_confirmada}` : ''}`
      : 'próximamente'
    mensaje = `Tu solicitud de ${cita.tipo} ha sido confirmada ${fechaStr}.${nota_admin ? ` Nota del equipo: ${nota_admin}` : ''}`
  } else if (estado === 'denegada') {
    titulo = 'Solicitud de cita no disponible'
    mensaje = `Lamentablemente no podemos atenderte en ese momento.${nota_admin ? ` ${nota_admin}` : ' Puedes escribirnos a hola@gruposkyline.org para encontrar otra fecha.'}`
  } else if (estado === 'reprogramada') {
    titulo = '📅 Nueva propuesta de horario'
    const fechaStr = fecha_confirmada
      ? `el ${new Date(fecha_confirmada + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}${hora_confirmada ? ` a las ${hora_confirmada}` : ''}`
      : 'en otra fecha'
    mensaje = `Te proponemos ${cita.tipo} ${fechaStr}.${nota_admin ? ` ${nota_admin}` : ''} Confirma respondiendo a hola@gruposkyline.org`
  }

  if (titulo && clienteId) {
    await supabaseAdmin.from('notificaciones').insert({
      cliente_id: clienteId,
      titulo,
      mensaje,
      tipo: 'cita',
      leida: false,
    })
  }

  return NextResponse.json({ ok: true })
}
