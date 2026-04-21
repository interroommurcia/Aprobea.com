import { NextRequest } from 'next/server'
import { supabaseAdmin as sb } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const search = req.nextUrl.searchParams.get('q')
  const admin  = req.nextUrl.searchParams.get('admin') === 'estatal'
  const limit  = parseInt(req.nextUrl.searchParams.get('limit') ?? '100')

  let q = sb.from('oposiciones').select('id,nombre,nombre_corto,administracion,estado,plazas_ultima,suscriptores_count,destacada,dificultad,proxima_convocatoria,categoria').eq('estado', 'activa').order('destacada', { ascending: false }).order('suscriptores_count', { ascending: false }).limit(limit)

  if (search) q = q.ilike('nombre', `%${search}%`)
  if (admin)  q = q.eq('administracion', 'estatal')

  const { data, error } = await q
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? [])
}

