import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_session')?.value === '1'
}

function getFileType(ext: string): string {
  if (['pdf', 'doc', 'docx', 'xlsx', 'xls', 'ppt', 'pptx'].includes(ext)) return 'documento'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext)) return 'imagen'
  return 'archivo'
}

// GET — list messages for a conversation, marks admin's unread as read
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const convId = req.nextUrl.searchParams.get('conversacion_id')
  if (!convId) return NextResponse.json({ error: 'conversacion_id requerido' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('mensajes')
    .select('*')
    .eq('conversacion_id', convId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mark all client messages as read, reset admin unread count
  await Promise.all([
    supabaseAdmin.from('mensajes')
      .update({ leido: true, leido_at: new Date().toISOString() })
      .eq('conversacion_id', convId)
      .eq('remitente', 'cliente')
      .eq('leido', false),
    supabaseAdmin.from('conversaciones')
      .update({ no_leidos_admin: 0 })
      .eq('id', convId),
  ])

  return NextResponse.json(data || [])
}

// POST — create message (supports FormData for file uploads)
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contentType = req.headers.get('content-type') || ''
  let conversacion_id = '', contenido: string | null = null
  let nota_interna = false, requiere_firma = false
  let archivo_url: string | null = null, archivo_nombre: string | null = null, archivo_tipo: string | null = null

  if (contentType.includes('multipart/form-data')) {
    const fd = await req.formData()
    conversacion_id = fd.get('conversacion_id') as string
    contenido = (fd.get('contenido') as string) || null
    nota_interna = fd.get('nota_interna') === 'true'
    requiere_firma = fd.get('requiere_firma') === 'true'
    const file = fd.get('archivo') as File | null

    if (file && file.size > 0) {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'file'
      const safeName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '')
      const path = `${conversacion_id}/${Date.now()}_${safeName}`
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
    conversacion_id = body.conversacion_id
    contenido = body.contenido || null
    nota_interna = body.nota_interna || false
    requiere_firma = body.requiere_firma || false
  }

  if (!conversacion_id) return NextResponse.json({ error: 'conversacion_id requerido' }, { status: 400 })

  const { data: mensaje, error } = await supabaseAdmin
    .from('mensajes')
    .insert({
      conversacion_id,
      remitente: 'admin',
      contenido,
      archivo_url,
      archivo_nombre,
      archivo_tipo,
      nota_interna,
      requiere_firma,
      es_broadcast: false,
      leido: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update conversation + notify client (only for non-internal notes)
  if (!nota_interna) {
    const { data: conv } = await supabaseAdmin
      .from('conversaciones')
      .select('no_leidos_cliente, cliente_id, operacion_nombre')
      .eq('id', conversacion_id)
      .single()

    const resumen = contenido?.slice(0, 100) || (archivo_nombre ? `📎 ${archivo_nombre}` : 'Mensaje nuevo')

    await Promise.all([
      supabaseAdmin.from('conversaciones').update({
        ultimo_mensaje: resumen,
        ultimo_mensaje_at: new Date().toISOString(),
        no_leidos_cliente: (conv?.no_leidos_cliente || 0) + 1,
      }).eq('id', conversacion_id),

      conv && supabaseAdmin.from('notificaciones').insert({
        cliente_id: conv.cliente_id,
        titulo: conv.operacion_nombre
          ? `Nuevo mensaje — ${conv.operacion_nombre}`
          : 'Nuevo mensaje de GrupoSkyLine',
        mensaje: resumen + (requiere_firma ? ' ⚠️ Requiere tu revisión.' : ''),
        tipo: 'mensaje',
        leida: false,
      }),
    ])
  }

  return NextResponse.json(mensaje, { status: 201 })
}

// DELETE — hard delete a message
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await req.json()
  const { error } = await supabaseAdmin.from('mensajes').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
