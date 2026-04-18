/**
 * POST /api/ia/activo-contacto
 * Registra una solicitud de contacto directo desde la ficha técnica de un activo.
 * Crea una cita/solicitud para el equipo de backoffice.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  const { operacion_id, operacion_titulo, telefono, mensaje } = await req.json()
  if (!telefono) return NextResponse.json({ error: 'Teléfono requerido' }, { status: 400 })

  // Obtener cliente
  const { data: cliente } = await supabaseAdmin
    .from('clientes')
    .select('id, nombre, apellidos')
    .eq('user_id', user.id)
    .single()

  if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

  // Crear solicitud de contacto (visible en backoffice → citas)
  await supabaseAdmin.from('citas_solicitudes').insert({
    cliente_id: cliente.id,
    tipo: 'llamada',
    mensaje: `📞 CONTACTO DESDE FICHA DE ACTIVO\n\nOperación: ${operacion_titulo || operacion_id}\nTeléfono facilitado: ${telefono}\n\nMensaje del inversor:\n${mensaje || '(sin mensaje adicional)'}`,
    estado: 'pendiente',
    conversacion_ia: [{ origen: 'ficha_activo', operacion_id, telefono }],
  })

  // Notificar al cliente de que hemos recibido su solicitud
  await supabaseAdmin.from('notificaciones').insert({
    cliente_id: cliente.id,
    titulo: '✓ Solicitud de contacto enviada',
    mensaje: `Hemos recibido tu consulta sobre "${operacion_titulo}". El equipo se pondrá en contacto contigo en el ${telefono} en breve.`,
    tipo: 'operacion',
  })

  return NextResponse.json({ ok: true })
}
