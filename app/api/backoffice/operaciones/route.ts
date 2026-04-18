import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { notificarActivoPublicado } from '@/lib/notificar-activo'

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_session')?.value === '1'
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch operations with nested participaciones to count tickets sold
  const { data, error } = await supabaseAdmin
    .from('operaciones_estudiadas')
    .select('*, participaciones(id, estado, operacion_id)')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Calculate tickets_vendidos = participaciones linked to this op with estado activa|pendiente
  const ops = (data ?? []).map((op: any) => {
    const parts = (op.participaciones ?? []) as { id: string; estado: string; operacion_id: string | null }[]
    const tickets_vendidos = parts.filter(p =>
      p.operacion_id === op.id && ['activa', 'pendiente'].includes(p.estado)
    ).length
    const { participaciones: _, ...rest } = op
    return { ...rest, tickets_vendidos }
  })

  return NextResponse.json(ops)
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const titulo = form.get('titulo') as string
  const descripcion = form.get('descripcion') as string
  const tipo = form.get('tipo') as string
  const file = form.get('pdf') as File | null
  const tickets_total = parseInt((form.get('tickets_total') as string) || '10', 10)
  const tickets_por_participante = parseInt((form.get('tickets_por_participante') as string) || '1', 10)
  const importe_objetivo_raw = form.get('importe_objetivo') as string | null
  const importe_objetivo = importe_objetivo_raw ? parseFloat(importe_objetivo_raw) : null

  // Property fields
  const referencia_catastral = (form.get('referencia_catastral') as string) || null
  const municipio             = (form.get('municipio') as string) || null
  const provincia             = (form.get('provincia') as string) || null
  const superficie_raw        = form.get('superficie') as string | null
  const superficie            = superficie_raw ? parseFloat(superficie_raw) : null
  const tipo_propiedad        = (form.get('tipo_propiedad') as string) || 'Residencial'
  const valor_mercado_raw     = form.get('valor_mercado') as string | null
  const valor_mercado         = valor_mercado_raw ? parseFloat(valor_mercado_raw) : null
  const precio_compra_raw     = form.get('precio_compra') as string | null
  const precio_compra         = precio_compra_raw ? parseFloat(precio_compra_raw) : null
  const comision_raw          = form.get('comision') as string | null
  const comision              = comision_raw ? parseFloat(comision_raw) : null
  const rentabilidad_raw      = form.get('rentabilidad') as string | null
  const rentabilidad          = rentabilidad_raw ? parseFloat(rentabilidad_raw) : null
  const ticket_minimo_raw     = form.get('ticket_minimo') as string | null
  const ticket_minimo         = ticket_minimo_raw ? parseFloat(ticket_minimo_raw) : null
  const imagen_principal      = (form.get('imagen_principal') as string) || null
  const comunidad_autonoma    = (form.get('comunidad_autonoma') as string) || null
  const publico               = form.get('publico') !== 'false'

  if (!titulo || !tipo) return NextResponse.json({ error: 'Faltan campos' }, { status: 400 })

  // Accept either a pre-uploaded URL (client-side upload) or a raw file
  let pdf_url: string | null = (form.get('pdf_url') as string) || null
  let pdf_nombre: string | null = (form.get('pdf_nombre') as string) || null

  if (!pdf_url && file && file.size > 0) {
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`

    const { error: uploadError } = await supabaseAdmin.storage
      .from('operaciones-pdf')
      .upload(filename, buffer, { contentType: 'application/pdf', upsert: false })

    if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

    const { data: urlData } = supabaseAdmin.storage
      .from('operaciones-pdf')
      .getPublicUrl(filename)

    pdf_url = urlData.publicUrl
    pdf_nombre = file.name
  }

  const { data, error } = await supabaseAdmin
    .from('operaciones_estudiadas')
    .insert({
      titulo, descripcion, tipo, pdf_url, pdf_nombre, activa: true,
      tickets_total, tickets_por_participante, importe_objetivo,
      referencia_catastral, municipio, provincia, comunidad_autonoma, superficie, tipo_propiedad,
      valor_mercado, precio_compra, comision, rentabilidad, ticket_minimo,
      imagen_principal, publico,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notificar a clientes cuyas preferencias encajen con este activo
  if (publico) {
    notificarActivoPublicado({
      id: data.id,
      titulo: data.titulo,
      tipo: data.tipo,
      comunidad_autonoma: data.comunidad_autonoma ?? null,
      ticket_minimo: data.ticket_minimo ?? null,
      descripcion: data.descripcion ?? null,
      provincia: data.provincia ?? null,
    }).catch(e => console.error('[operaciones] Error notificando activo:', e))
  }

  return NextResponse.json({ ...data, tickets_vendidos: 0 })
}

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const contentType = req.headers.get('content-type') || ''

  // ── Modo FormData: actualización de PDF ────────────────────────────────────
  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData()
    const id   = form.get('id') as string | null
    const file = form.get('pdf') as File | null

    if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

    // Obtener url antigua para borrarla
    const { data: existing } = await supabaseAdmin
      .from('operaciones_estudiadas')
      .select('pdf_url, pdf_nombre')
      .eq('id', id)
      .single()

    // Accept either a pre-uploaded URL (client-side upload) or a raw file
    const preUploadedUrl    = (form.get('pdf_url')    as string) || null
    const preUploadedNombre = (form.get('pdf_nombre') as string) || null
    let pdf_url    = preUploadedUrl    ?? existing?.pdf_url    ?? null
    let pdf_nombre = preUploadedNombre ?? existing?.pdf_nombre ?? null

    if (!preUploadedUrl && file && file.size > 0) {
      // Borrar archivo antiguo de storage
      if (existing?.pdf_url) {
        const oldName = existing.pdf_url.split('/').pop()
        if (oldName) await supabaseAdmin.storage.from('operaciones-pdf').remove([oldName])
      }

      const bytes    = await file.arrayBuffer()
      const buffer   = Buffer.from(bytes)
      const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`

      const { error: uploadError } = await supabaseAdmin.storage
        .from('operaciones-pdf')
        .upload(filename, buffer, { contentType: 'application/pdf', upsert: false })

      if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

      const { data: urlData } = supabaseAdmin.storage
        .from('operaciones-pdf')
        .getPublicUrl(filename)

      pdf_url    = urlData.publicUrl
      pdf_nombre = file.name
    }

    const { error } = await supabaseAdmin
      .from('operaciones_estudiadas')
      .update({ pdf_url, pdf_nombre })
      .eq('id', id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, pdf_url, pdf_nombre })
  }

  // ── Modo JSON: actualización de campos ────────────────────────────────────
  const body = await req.json()
  const { id, activa, tickets_total, tickets_por_participante, importe_objetivo,
    titulo, descripcion, tipo, referencia_catastral, municipio, provincia,
    comunidad_autonoma, superficie, tipo_propiedad, valor_mercado, precio_compra,
    comision, rentabilidad, ticket_minimo, imagen_principal, publico } = body

  const update: Record<string, unknown> = {}
  if (activa !== undefined)                   update.activa = activa
  if (tickets_total !== undefined)            update.tickets_total = tickets_total
  if (tickets_por_participante !== undefined) update.tickets_por_participante = tickets_por_participante
  if (importe_objetivo !== undefined)         update.importe_objetivo = importe_objetivo
  if (titulo !== undefined)                   update.titulo = titulo
  if (descripcion !== undefined)              update.descripcion = descripcion
  if (tipo !== undefined)                     update.tipo = tipo
  if (referencia_catastral !== undefined)     update.referencia_catastral = referencia_catastral || null
  if (municipio !== undefined)                update.municipio = municipio || null
  if (provincia !== undefined)                update.provincia = provincia || null
  if (comunidad_autonoma !== undefined)       update.comunidad_autonoma = comunidad_autonoma || null
  if (superficie !== undefined)               update.superficie = superficie || null
  if (tipo_propiedad !== undefined)           update.tipo_propiedad = tipo_propiedad || null
  if (valor_mercado !== undefined)            update.valor_mercado = valor_mercado || null
  if (precio_compra !== undefined)            update.precio_compra = precio_compra || null
  if (comision !== undefined)                 update.comision = comision || null
  if (rentabilidad !== undefined)             update.rentabilidad = rentabilidad || null
  if (ticket_minimo !== undefined)            update.ticket_minimo = ticket_minimo || null
  if (imagen_principal !== undefined)         update.imagen_principal = imagen_principal || null
  if (publico !== undefined)                  update.publico = publico

  const { error } = await supabaseAdmin.from('operaciones_estudiadas').update(update).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id, pdf_url } = await req.json()

  // Delete file from storage if exists
  if (pdf_url) {
    const filename = pdf_url.split('/').pop()
    if (filename) await supabaseAdmin.storage.from('operaciones-pdf').remove([filename])
  }

  const { error } = await supabaseAdmin.from('operaciones_estudiadas').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
