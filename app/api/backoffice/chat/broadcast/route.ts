import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_session')?.value === '1'
}

function getFileType(ext: string): string {
  if (['pdf', 'doc', 'docx', 'xlsx', 'xls'].includes(ext)) return 'documento'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'imagen'
  return 'archivo'
}

// POST — broadcast a message to ALL conversations of a given operation
// Creates an individual private message in each conversation (no groups)
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contentType = req.headers.get('content-type') || ''
  let operacion_nombre = '', contenido: string | null = null, requiere_firma = false
  let archivo_url: string | null = null, archivo_nombre: string | null = null, archivo_tipo: string | null = null

  if (contentType.includes('multipart/form-data')) {
    const fd = await req.formData()
    operacion_nombre = fd.get('operacion_nombre') as string
    contenido = (fd.get('contenido') as string) || null
    requiere_firma = fd.get('requiere_firma') === 'true'
    const file = fd.get('archivo') as File | null

    if (file && file.size > 0) {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'file'
      const safeName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '')
      const path = `broadcast/${Date.now()}_${safeName}`
      const buffer = Buffer.from(await file.arrayBuffer())

      const { error: upErr } = await supabaseAdmin.storage
        .from('chat-archivos')
        .upload(path, buffer, { contentType: file.type })

      if (!upErr) {
        const { data: { publicUrl } } = supabaseAdmin.storage.from('chat-archivos').getPublicUrl(path)
        archivo_url = publicUrl
        archivo_nombre = file.name
        archivo_tipo = getFileType(ext)
      }
    }
  } else {
    const body = await req.json()
    operacion_nombre = body.operacion_nombre
    contenido = body.contenido || null
    requiere_firma = body.requiere_firma || false
  }

  if (!operacion_nombre) return NextResponse.json({ error: 'operacion_nombre requerido' }, { status: 400 })
  if (!contenido && !archivo_url) return NextResponse.json({ error: 'Mensaje o archivo requerido' }, { status: 400 })

  // Find all active conversations for this operation
  const { data: convs, error: convErr } = await supabaseAdmin
    .from('conversaciones')
    .select('id, cliente_id, no_leidos_cliente')
    .eq('operacion_nombre', operacion_nombre)
    .eq('activa', true)

  if (convErr) return NextResponse.json({ error: convErr.message }, { status: 500 })
  if (!convs || convs.length === 0) {
    return NextResponse.json({ error: 'Sin conversaciones activas para esta operación', count: 0 }, { status: 404 })
  }

  const now = new Date().toISOString()
  const resumen = contenido?.slice(0, 100) || (archivo_nombre ? `📎 ${archivo_nombre}` : 'Comunicado')
  const broadcastLabel = `📢 ${resumen}`

  // Insert one message per conversation (individual, not a group)
  const { error: msgErr } = await supabaseAdmin.from('mensajes').insert(
    convs.map(c => ({
      conversacion_id: c.id,
      remitente: 'admin',
      contenido,
      archivo_url,
      archivo_nombre,
      archivo_tipo,
      requiere_firma,
      es_broadcast: true,
      nota_interna: false,
      leido: false,
    }))
  )
  if (msgErr) return NextResponse.json({ error: msgErr.message }, { status: 500 })

  // Update each conversation + send individual notification
  await Promise.all(
    convs.map(c =>
      Promise.all([
        supabaseAdmin.from('conversaciones').update({
          ultimo_mensaje: broadcastLabel,
          ultimo_mensaje_at: now,
          no_leidos_cliente: (c.no_leidos_cliente || 0) + 1,
        }).eq('id', c.id),

        supabaseAdmin.from('notificaciones').insert({
          cliente_id: c.cliente_id,
          titulo: `Comunicado — ${operacion_nombre}`,
          mensaje: resumen + (requiere_firma ? ' ⚠️ Requiere tu revisión.' : ''),
          tipo: 'mensaje',
          leida: false,
        }),
      ])
    )
  )

  return NextResponse.json({ ok: true, enviado_a: convs.length })
}
