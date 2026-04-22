import { NextRequest } from 'next/server'
import { supabaseAdmin as sb } from '@/lib/supabase-admin'

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_session')?.value === '1'
}

/** GET /api/backoffice/temarios
 *  Lista temarios oficiales. Query: oposicion_id, vigente, q
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const sp         = req.nextUrl.searchParams
  const opoId      = sp.get('oposicion_id')
  const soloVigentes = sp.get('vigente')
  const q          = sp.get('q')

  let query = sb
    .from('boe_temarios')
    .select(`
      id, titulo, organismo, comunidad, url_pdf, url_fuente,
      fecha_vigencia, vigente, ia_procesado_at,
      temas,
      oposicion_id,
      oposiciones ( id, nombre, nombre_corto )
    `, { count: 'exact' })
    .order('vigente', { ascending: false })
    .order('fecha_vigencia', { ascending: false })

  if (opoId)       query = query.eq('oposicion_id', opoId)
  if (soloVigentes === '1') query = query.eq('vigente', true)
  if (q)           query = query.ilike('titulo', `%${q}%`)

  const { data, count, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ items: data ?? [], total: count ?? 0 })
}

/** POST /api/backoffice/temarios — Crear nuevo temario */
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { oposicion_id, titulo, organismo, comunidad, url_pdf, url_fuente, fecha_vigencia } = body

  if (!oposicion_id || !titulo || !url_fuente) {
    return Response.json({ error: 'oposicion_id, titulo y url_fuente son obligatorios' }, { status: 400 })
  }

  const { data, error } = await sb.from('boe_temarios').insert({
    oposicion_id, titulo, organismo: organismo ?? null, comunidad: comunidad ?? null,
    url_pdf: url_pdf ?? null, url_fuente,
    fecha_vigencia: fecha_vigencia ?? null,
    vigente: true, temas: [],
  }).select().single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true, item: data })
}

/** PATCH /api/backoffice/temarios — Actualizar temario */
export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { id, ...fields } = body
  if (!id) return Response.json({ error: 'id requerido' }, { status: 400 })

  const { error } = await sb.from('boe_temarios').update(fields).eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

/** DELETE /api/backoffice/temarios?id=xxx */
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return Response.json({ error: 'id requerido' }, { status: 400 })

  const { error } = await sb.from('boe_temarios').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
