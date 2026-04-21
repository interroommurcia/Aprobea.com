import { NextRequest } from 'next/server'
import { supabaseAdmin as sb } from '@/lib/supabase-admin'

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_session')?.value === '1'
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })
  const { data, error } = await sb.from('perfiles').select('id,email,nombre,apellidos,plan,plan_activo,xp_total,racha_dias,created_at').order('created_at', { ascending: false }).limit(500)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data ?? [])
}

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })
  const { id, plan, plan_activo } = await req.json()
  const { data, error } = await sb.from('perfiles').update({ plan, plan_activo }).eq('id', id).select().single()
  if (error) return Response.json({ error: error.message }, { status: 400 })
  return Response.json(data)
}

