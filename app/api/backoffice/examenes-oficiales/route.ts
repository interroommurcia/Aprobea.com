import { NextRequest } from 'next/server'
import { supabaseAdmin as sb } from '@/lib/supabase-admin'

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_session')?.value === '1'
}

/** GET /api/backoffice/examenes-oficiales
 *  Lista resoluciones de exámenes (tipo=resultado) de boe_publicaciones.
 *  Query params: page, limit, anio, organismo, q (búsqueda libre)
 */
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const sp     = req.nextUrl.searchParams
  const page   = parseInt(sp.get('page')  ?? '1')
  const limit  = parseInt(sp.get('limit') ?? '50')
  const anio   = sp.get('anio')
  const org    = sp.get('organismo')
  const q      = sp.get('q')
  const from   = (page - 1) * limit

  let query = sb
    .from('boe_publicaciones')
    .select('id,boe_id,titulo,fecha_publicacion,organismo,departamento,url_pdf,procesado,anio_convocatoria,grupo,num_plazas', { count: 'exact' })
    .eq('tipo', 'resultado')
    .order('fecha_publicacion', { ascending: false })
    .range(from, from + limit - 1)

  if (anio)  query = query.eq('anio_convocatoria', parseInt(anio))
  if (org)   query = query.ilike('organismo', `%${org}%`)
  if (q)     query = query.ilike('titulo', `%${q}%`)

  const { data, count, error } = await query
  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ items: data ?? [], total: count ?? 0, page, limit })
}
