import { NextRequest } from 'next/server'
import { supabaseAdmin as sb } from '@/lib/supabase-admin'

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_session')?.value === '1'
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const opos   = searchParams.get('oposicion_id')
  const tema   = searchParams.get('tema_id')
  const dif    = searchParams.get('dificultad')
  const search = searchParams.get('q')
  const page   = parseInt(searchParams.get('page') ?? '1')
  const limit  = 30

  let q = sb.from('preguntas')
    .select('id,enunciado,tipo,dificultad,activa,fuente,oposicion_id,tema_id,respuesta_correcta,opciones,oposiciones(nombre_corto)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (opos)   q = q.eq('oposicion_id', opos)
  if (tema)   q = q.eq('tema_id', tema)
  if (dif)    q = q.eq('dificultad', parseInt(dif))
  if (search) q = q.ilike('enunciado', `%${search}%`)

  const { data, count, error } = await q
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ items: data ?? [], total: count ?? 0, page, limit })
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const { enunciado, tipo = 'test', opciones, respuesta_correcta, dificultad = 3, oposicion_id, tema_id, explicacion, fuente = 'admin' } = body

  if (!enunciado || !respuesta_correcta) return Response.json({ error: 'enunciado y respuesta_correcta son requeridos' }, { status: 400 })

  const { data, error } = await sb.from('preguntas').insert({
    enunciado, tipo, opciones, respuesta_correcta, dificultad, oposicion_id, tema_id, explicacion, fuente, activa: true,
  }).select().single()

  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const { id, ...fields } = await req.json()
  if (!id) return Response.json({ error: 'id requerido' }, { status: 400 })

  const { error } = await sb.from('preguntas').update(fields).eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return Response.json({ error: 'id requerido' }, { status: 400 })

  const { error } = await sb.from('preguntas').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
