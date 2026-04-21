import { NextRequest } from 'next/server'
import { supabaseAdmin as sb } from '@/lib/supabase-admin'

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_session')?.value === '1'
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const now = new Date()
  const mesInicio = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [
    { count: usuarios_total },
    { count: usuarios_pro },
    { count: oposiciones },
    { count: preguntas },
    { count: examenes_hoy },
    { count: boe_pendientes },
    { data: ia_mes },
    { data: nuevos_raw },
  ] = await Promise.all([
    sb.from('perfiles').select('*', { count: 'exact', head: true }),
    sb.from('perfiles').select('*', { count: 'exact', head: true }).in('plan', ['pro','elite']).eq('plan_activo', true),
    sb.from('oposiciones').select('*', { count: 'exact', head: true }).eq('estado', 'activa'),
    sb.from('preguntas').select('*', { count: 'exact', head: true }).eq('activa', true),
    sb.from('examenes').select('*', { count: 'exact', head: true }).gte('created_at', new Date().toISOString().slice(0, 10)),
    sb.from('boe_publicaciones').select('*', { count: 'exact', head: true }).eq('procesado', false),
    sb.from('ia_uso').select('coste_eur').gte('created_at', mesInicio),
    sb.from('perfiles').select('created_at').order('created_at', { ascending: false }).limit(200),
  ])

  const ia_coste_mes = (ia_mes ?? []).reduce((s: number, r: any) => s + (r.coste_eur ?? 0), 0)

  const nuevos_7d = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const key = d.toISOString().slice(0, 10)
    return (nuevos_raw ?? []).filter((u: any) => u.created_at?.startsWith(key)).length
  })

  return Response.json({
    usuarios_total: usuarios_total ?? 0,
    usuarios_pro:   usuarios_pro ?? 0,
    oposiciones:    oposiciones ?? 0,
    preguntas:      preguntas ?? 0,
    examenes_hoy:   examenes_hoy ?? 0,
    boe_pendientes: boe_pendientes ?? 0,
    ia_coste_mes,
    nuevos_7d,
  })
}

