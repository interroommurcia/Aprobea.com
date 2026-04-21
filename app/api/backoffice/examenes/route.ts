import { NextRequest } from 'next/server'
import { supabaseAdmin as sb } from '@/lib/supabase-admin'

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_session')?.value === '1'
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const { searchParams } = req.nextUrl
  const tipo   = searchParams.get('tipo')
  const estado = searchParams.get('estado')
  const user   = searchParams.get('user_id')
  const page   = parseInt(searchParams.get('page') ?? '1')
  const limit  = 30

  let q = sb.from('examenes')
    .select('id,user_id,tipo,estado,total_preguntas,correctas,puntuacion,created_at,oposicion_id,oposiciones(nombre_corto),perfiles(nombre)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * limit, page * limit - 1)

  if (tipo)   q = q.eq('tipo', tipo)
  if (estado) q = q.eq('estado', estado)
  if (user)   q = q.eq('user_id', user)

  const { data, count, error } = await q
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ items: data ?? [], total: count ?? 0, page, limit })
}
