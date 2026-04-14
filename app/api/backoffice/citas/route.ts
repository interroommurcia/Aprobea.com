/**
 * GET   /api/backoffice/citas   → todas las solicitudes con datos del cliente
 * PATCH /api/backoffice/citas   → confirmar / denegar / reprogramar
 *   - confirmar:    crea evento en calendario del cliente + calendario admin
 *   - reprogramar:  notifica al cliente para que confirme (no crea evento aún)
 *   - denegar:      notifica al cliente
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
    .select(`
      *,
      clientes(id, nombre, apellidos, email, telefono, tipo_inversor, capital_inicial, estado, created_at)
    `)
    .order('created_at', { ascending: false })

  if (estado) query = query.eq('estado', estado)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

async function crearEventosCalendario(
  clienteId: string,
  clienteNombre: string,
  fecha: string,
  hora: string | null,
  titulo: string,
) {
  const horaStr = hora ?? '10:00'

  await Promise.all([
    // Evento en el calendario del cliente
    supabaseAdmin.from('eventos_calendario').insert({
      cliente_id: clienteId,
      titulo: `📞 ${titulo}`,
      descripcion: 'Llamada agendada con el equipo de GrupoSkyLine',
      fecha,
      hora: horaStr,
      tipo: 'recordatorio',
    }),
    // Evento en el calendario del admin (sin cliente_id para que aparezca en backoffice)
    supabaseAdmin.from('eventos_calendario').insert({
      cliente_id: null,
      user_id: null,
      titulo: `📞 Llamada: ${clienteNombre}`,
      descripcion: `Llamada confirmada con cliente`,
      fecha,
      hora: horaStr,
      tipo: 'operacion',
    }),
  ])
}

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id, estado, fecha_confirmada, hora_confirmada, nota_admin } = await req.json()

  const { data: cita, error: citaError } = await supabaseAdmin
    .from('citas_solicitudes')
    .update({
      estado,
      fecha_confirmada: fecha_confirmada || null,
      hora_confirmada: hora_confirmada || null,
      nota_admin: nota_admin || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select('*, clientes(id, nombre, apellidos)')
    .single()

  if (citaError) return NextResponse.json({ error: citaError.message }, { status: 500 })

  const clienteId = cita.clientes?.id ?? cita.cliente_id
  const clienteNombre = cita.clientes ? `${cita.clientes.nombre} ${cita.clientes.apellidos}` : 'Cliente'

  // ── CONFIRMADA: crear eventos en ambos calendarios ──────────────
  if (estado === 'confirmada' && fecha_confirmada) {
    await crearEventosCalendario(clienteId, clienteNombre, fecha_confirmada, hora_confirmada, 'Llamada GrupoSkyLine')

    const fechaStr = new Date(fecha_confirmada + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
    await supabaseAdmin.from('notificaciones').insert({
      cliente_id: clienteId,
      titulo: '✓ Llamada confirmada — añadida a tu calendario',
      mensaje: `Tu llamada está confirmada el ${fechaStr}${hora_confirmada ? ` a las ${hora_confirmada}` : ''}.${nota_admin ? ` ${nota_admin}` : ''} Ya aparece en tu calendario.`,
      tipo: 'cita',
      leida: false,
    })
  }

  // ── REPROGRAMADA: el cliente tiene que confirmar ──────────────
  if (estado === 'reprogramada') {
    const fechaStr = fecha_confirmada
      ? new Date(fecha_confirmada + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
      : null

    await supabaseAdmin.from('notificaciones').insert({
      cliente_id: clienteId,
      titulo: '📅 Nueva propuesta de horario — confirma en el dashboard',
      mensaje: `Te proponemos una llamada${fechaStr ? ` el ${fechaStr}${hora_confirmada ? ` a las ${hora_confirmada}` : ''}` : ''}.${nota_admin ? ` ${nota_admin}` : ''} Acepta o rechaza desde la pestaña "Asistente IA" de tu dashboard.`,
      tipo: 'cita',
      leida: false,
    })
  }

  // ── DENEGADA ──────────────────────────────────────────────────
  if (estado === 'denegada') {
    await supabaseAdmin.from('notificaciones').insert({
      cliente_id: clienteId,
      titulo: 'Solicitud de llamada no disponible',
      mensaje: `${nota_admin || 'No tenemos disponibilidad en ese momento. Puedes escribirnos a hola@gruposkyline.org para encontrar otra fecha.'}`,
      tipo: 'cita',
      leida: false,
    })
  }

  return NextResponse.json({ ok: true })
}
