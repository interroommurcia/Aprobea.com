import { NextRequest } from 'next/server'
import { supabaseAdmin as sb } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get('user_id')
  if (!uid) return Response.json({ error: 'user_id required' }, { status: 400 })

  const [
    { data: examenes },
    { data: progresos },
    { data: suscripcion },
  ] = await Promise.all([
    sb.from('examenes').select('id,puntuacion,tipo,created_at,correctas,total_preguntas,oposicion_id').eq('user_id', uid).eq('estado', 'completado').order('created_at', { ascending: false }).limit(20),
    sb.from('progreso_temas').select('*,temas(titulo)').eq('user_id', uid).order('porcentaje_acierto', { ascending: true }),
    sb.from('suscripciones_oposicion').select('oposiciones(id,nombre,nombre_corto)').eq('user_id', uid).eq('activa', true).limit(1).single(),
  ])

  const temas_debiles    = (progresos ?? []).filter((p: any) => p.preguntas_respondidas > 0 && p.porcentaje_acierto < 60).slice(0, 8).map((p: any) => ({ tema_id: p.tema_id, titulo: p.temas?.titulo ?? 'Tema', porcentaje_acierto: p.porcentaje_acierto }))
  const temas_fuertes    = (progresos ?? []).filter((p: any) => p.porcentaje_acierto >= 80).reverse().slice(0, 8).map((p: any) => ({ tema_id: p.tema_id, titulo: p.temas?.titulo ?? 'Tema', porcentaje_acierto: p.porcentaje_acierto }))
  const temas_dominados  = (progresos ?? []).filter((p: any) => p.nivel_dominio === 'dominado').length
  const temas_en_progreso = (progresos ?? []).filter((p: any) => p.nivel_dominio === 'en_progreso').length

  const correctas_total   = (examenes ?? []).reduce((s: number, e: any) => s + (e.correctas ?? 0), 0)
  const total_preguntas   = (examenes ?? []).reduce((s: number, e: any) => s + (e.total_preguntas ?? 0), 0)
  const examen_reciente   = examenes?.[0] ?? null
  const proximas_revisiones = (progresos ?? []).filter((p: any) => p.sm2_proxima_revision && p.sm2_proxima_revision <= new Date().toISOString().slice(0, 10)).slice(0, 10).map((p: any) => ({ titulo: p.temas?.titulo ?? 'Tema', fecha: p.sm2_proxima_revision }))

  const oposicion_activa = (suscripcion as any)?.oposiciones ?? null

  return Response.json({
    examenes_total: examenes?.length ?? 0,
    correctas_total,
    total_preguntas,
    temas_dominados,
    temas_en_progreso,
    temas_debiles,
    temas_fuertes,
    examen_reciente,
    proximas_revisiones,
    oposicion_activa,
  })
}

