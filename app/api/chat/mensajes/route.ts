import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function getClienteId(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization')
  if (!auth) return null
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(auth.replace('Bearer ', ''))
  if (error || !user) return null
  const { data } = await supabaseAdmin.from('clientes').select('id').eq('user_id', user.id).single()
  return data?.id || null
}

async function verifyConvOwner(convId: string, clienteId: string): Promise<boolean> {
  const { data } = await supabaseAdmin.from('conversaciones').select('cliente_id').eq('id', convId).single()
  return data?.cliente_id === clienteId
}

function getFileType(ext: string): string {
  if (['pdf', 'doc', 'docx', 'xlsx', 'xls'].includes(ext)) return 'documento'
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'imagen'
  return 'archivo'
}

// GET — list messages for a conversation (no notas internas)
export async function GET(req: NextRequest) {
  const clienteId = await getClienteId(req)
  if (!clienteId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const convId = req.nextUrl.searchParams.get('conversacion_id')
  if (!convId) return NextResponse.json({ error: 'conversacion_id requerido' }, { status: 400 })

  if (!(await verifyConvOwner(convId, clienteId))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseAdmin
    .from('mensajes')
    .select('*')
    .eq('conversacion_id', convId)
    .eq('nota_interna', false)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mark admin messages as read + reset client unread
  await Promise.all([
    supabaseAdmin.from('mensajes')
      .update({ leido: true, leido_at: new Date().toISOString() })
      .eq('conversacion_id', convId)
      .eq('remitente', 'admin')
      .eq('leido', false),
    supabaseAdmin.from('conversaciones')
      .update({ no_leidos_cliente: 0 })
      .eq('id', convId),
  ])

  return NextResponse.json(data || [])
}

// POST — client sends a message (text or file)
export async function POST(req: NextRequest) {
  const clienteId = await getClienteId(req)
  if (!clienteId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contentType = req.headers.get('content-type') || ''
  let conversacion_id = '', contenido: string | null = null
  let archivo_url: string | null = null, archivo_nombre: string | null = null, archivo_tipo: string | null = null

  if (contentType.includes('multipart/form-data')) {
    const fd = await req.formData()
    conversacion_id = fd.get('conversacion_id') as string
    contenido = (fd.get('contenido') as string) || null
    const file = fd.get('archivo') as File | null

    if (file && file.size > 0) {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'file'
      const safeName = file.name.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '')
      const path = `${conversacion_id}/c_${Date.now()}_${safeName}`
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
  }

  if (!conversacion_id) return NextResponse.json({ error: 'conversacion_id requerido' }, { status: 400 })
  if (!(await verifyConvOwner(conversacion_id, clienteId))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: mensaje, error } = await supabaseAdmin
    .from('mensajes')
    .insert({
      conversacion_id,
      remitente: 'cliente',
      contenido,
      archivo_url,
      archivo_nombre,
      archivo_tipo,
      nota_interna: false,
      requiere_firma: false,
      es_broadcast: false,
      leido: false,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Update conversation + increment admin unread
  const { data: conv } = await supabaseAdmin
    .from('conversaciones')
    .select('no_leidos_admin')
    .eq('id', conversacion_id)
    .single()

  await supabaseAdmin.from('conversaciones').update({
    ultimo_mensaje: contenido?.slice(0, 80) || (archivo_nombre ? `📎 ${archivo_nombre}` : 'Mensaje'),
    ultimo_mensaje_at: new Date().toISOString(),
    no_leidos_admin: (conv?.no_leidos_admin || 0) + 1,
  }).eq('id', conversacion_id)

  return NextResponse.json(mensaje, { status: 201 })
}
