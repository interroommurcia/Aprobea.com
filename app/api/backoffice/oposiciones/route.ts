import { NextRequest } from 'next/server'
import { supabaseAdmin as sb } from '@/lib/supabase-admin'

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_session')?.value === '1'
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const top   = req.nextUrl.searchParams.get('top')
  const search = req.nextUrl.searchParams.get('q')

  let q = sb.from('oposiciones').select('*').order('suscriptores_count', { ascending: false })
  if (search) q = q.ilike('nombre', `%${search}%`)
  if (top) q = q.limit(parseInt(top))

  const { data, error } = await q
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json()
  const { data, error } = await sb.from('oposiciones').insert(body).select().single()
  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json(data)
}

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })
  const { id, ...rest } = await req.json()
  const { data, error } = await sb.from('oposiciones').update({ ...rest, updated_at: new Date().toISOString() }).eq('id', id).select().single()
  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json(data)
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await req.json()
  await sb.from('oposiciones').delete().eq('id', id)
  return Response.json({ ok: true })
}

