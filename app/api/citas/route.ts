/**
 * GET   /api/citas         → citas del cliente autenticado
 * POST  /api/citas         → crear solicitud (desde IA)
 * PATCH /api/citas         → cliente confirma o rechaza una reprogramación
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
      tipo: 'llamada',
      fecha_propuesta: body.fecha_propuesta ?? null,
      hora_propuesta: body.hora_propuesta ?? null,
      mensaje: body.mensaje ?? '',
      estado: 'pendiente',
    })
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

  const { id, accion } = await req.json() // accion: 'aceptar' | 'rechazar'

  // Verificar que la cita es de este cliente y está en estado reprogramada
  const { data: cita } = await supabaseAdmin
    .from('citas_solicitudes')
    .select('*')
    .eq('id', id)
    .eq('cliente_id', cliente.id)
    .eq('estado', 'reprogramada')
    .single()

  if (!cita) return NextResponse.json({ error: 'Cita no encontrada o no reprogramada' }, { status: 404 })

  if (accion === 'aceptar') {
    // Confirmar la cita y crear eventos en calendarios
    await supabaseAdmin.from('citas_solicitudes').update({ estado: 'confirmada', updated_at: new Date().toISOString() }).eq('id', id)

    if (cita.fecha_confirmada) {
      const nombreCliente = `${cliente.nombre} ${cliente.apellidos}`
      const hora = cita.hora_confirmada ?? '10:00'

      await Promise.all([
        // Evento en el calendario del CLIENTE
        supabaseAdmin.from('eventos_calendario').insert({
          cliente_id: cliente.id,
          titulo: '📞 Llamada GrupoSkyLine',
          descripcion: 'Has confirmado la llamada con el equipo de GrupoSkyLine. Te llamaremos en el horario acordado.',
          fecha: cita.fecha_confirmada,
          hora,
          tipo: 'recordatorio',
        }),
        // Evento en el calendario del ADMIN
        supabaseAdmin.from('eventos_calendario').insert({
          cliente_id: cliente.id,
          titulo: `📞 Llamada: ${nombreCliente}`,
          descripcion: `Llamada confirmada por el cliente. Motivo: ${cita.mensaje}`,
          fecha: cita.fecha_confirmada,
          hora,
          tipo: 'operacion',
          is_admin: true,
        }),
        // Notificación de confirmación al cliente
        supabaseAdmin.from('notificaciones').insert({
          cliente_id: cliente.id,
          titulo: '✓ Llamada confirmada — añadida a tu calendario',
          mensaje: `Tu llamada está confirmada el ${new Date(cita.fecha_confirmada + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })} a las ${hora}. Ya aparece en tu calendario.`,
          tipo: 'cita',
          leida: false,
        }),
      ])
    }

    return NextResponse.json({ ok: true, estado: 'confirmada' })
  }

  if (accion === 'rechazar') {
    // Volver a pendiente para que el admin lo gestione
    await supabaseAdmin.from('citas_solicitudes').update({
      estado: 'pendiente',
      fecha_confirmada: null,
      hora_confirmada: null,
      nota_admin: (cita.nota_admin ?? '') + ' [Cliente rechazó la reprogramación]',
      updated_at: new Date().toISOString(),
    }).eq('id', id)

    return NextResponse.json({ ok: true, estado: 'pendiente' })
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
}
