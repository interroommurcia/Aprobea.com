import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'

export async function GET() {
  const cookieStore = await cookies()
  if (cookieStore.get('admin_session')?.value !== '1') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const since7d = new Date(Date.now() - 7 * 86400000).toISOString()
  const since30d = new Date(Date.now() - 30 * 86400000).toISOString()

  const [
    { count: totalUsers },
    { count: newUsers7d },
    { count: examenesHoy },
    { count: totalExamenes },
    { data: iaUso },
    { data: topOposiciones },
    { data: examenesSerie },
  ] = await Promise.all([
    supabaseAdmin.from('perfiles').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('perfiles').select('id', { count: 'exact', head: true }).gte('created_at', since7d),
    supabaseAdmin.from('examenes').select('id', { count: 'exact', head: true }).gte('created_at', new Date().toISOString().slice(0, 10)),
    supabaseAdmin.from('examenes').select('id', { count: 'exact', head: true }),
    supabaseAdmin.from('ia_uso').select('tokens_entrada,tokens_salida,coste_estimado').gte('created_at', since30d),
    supabaseAdmin.from('suscripciones_oposicion').select('oposicion_id,oposiciones(nombre_corto)').eq('activa', true),
    supabaseAdmin.from('examenes').select('created_at,puntuacion').gte('created_at', since30d).eq('estado', 'completado').order('created_at'),
  ])

  // Coste IA total 30d
  const costoIA = (iaUso ?? []).reduce((s: number, r: any) => s + (r.coste_estimado ?? 0), 0)

  // Top oposiciones por suscriptores
  const oposCount: Record<string, { nombre: string; count: number }> = {}
  for (const s of topOposiciones ?? []) {
    const id = s.oposicion_id
    if (!oposCount[id]) oposCount[id] = { nombre: (s.oposiciones as any)?.nombre_corto ?? id, count: 0 }
    oposCount[id].count++
  }
  const topOpos = Object.values(oposCount).sort((a, b) => b.count - a.count).slice(0, 5)

  // Serie últimos 7 días (nuevos usuarios)
  const days7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    return d.toISOString().slice(0, 10)
  })

  // Media puntuación por día (últimos 30d)
  const puntuacionByDay: Record<string, number[]> = {}
  for (const e of examenesSerie ?? []) {
    const day = (e.created_at as string).slice(0, 10)
    if (!puntuacionByDay[day]) puntuacionByDay[day] = []
    if (e.puntuacion != null) puntuacionByDay[day].push(e.puntuacion)
  }
  const seriePuntuacion = Object.entries(puntuacionByDay).slice(-14).map(([day, vals]) => ({
    label: day.slice(5),
    valor: Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 10) / 10,
  }))

  return NextResponse.json({
    kpi: {
      totalUsers: totalUsers ?? 0,
      newUsers7d: newUsers7d ?? 0,
      totalExamenes: totalExamenes ?? 0,
      examenesHoy: examenesHoy ?? 0,
      costoIA30d: Math.round(costoIA * 10000) / 10000,
    },
    topOposiciones: topOpos,
    seriePuntuacion,
    days7,
  })
}
