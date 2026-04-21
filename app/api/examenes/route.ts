import { NextRequest } from 'next/server'
import { supabaseAdmin as sb } from '@/lib/supabase-admin'

export async function GET(req: NextRequest) {
  const uid  = req.nextUrl.searchParams.get('user_id')
  const tipo = req.nextUrl.searchParams.get('tipo')
  const opos = req.nextUrl.searchParams.get('oposicion_id')
  if (!uid) return Response.json({ error: 'user_id required' }, { status: 400 })

  let q = sb.from('examenes').select('*,oposiciones(nombre_corto)').eq('user_id', uid).order('created_at', { ascending: false }).limit(30)
  if (tipo) q = q.eq('tipo', tipo)
  if (opos) q = q.eq('oposicion_id', opos)

  const { data, error } = await q
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { user_id, oposicion_id, tipo = 'practica', tema_ids, n = 20, penalizacion = false } = body
  if (!user_id) return Response.json({ error: 'user_id required' }, { status: 400 })

  // Obtener preguntas segÃºn tipo
  let preguntas: any[] = []

  if (tipo === 'repaso_fallos') {
    // Preguntas de temas dÃ©biles del usuario
    const { data: progresos } = await sb.from('progreso_temas').select('tema_id').eq('user_id', user_id).lt('porcentaje_acierto', 60).order('porcentaje_acierto').limit(10)
    const temaIds = progresos?.map(p => p.tema_id) ?? []
    if (temaIds.length) {
      const { data } = await sb.from('preguntas').select('id').in('tema_id', temaIds).eq('activa', true).limit(n * 2)
      preguntas = shuffleAndPick(data ?? [], n)
    }
  } else if (tipo === 'adaptativo') {
    // IRT: seleccionar preguntas por dificultad ajustada al nivel del usuario
    const { data: perfil } = await sb.from('perfiles').select('xp_total').eq('id', user_id).single()
    const xp = perfil?.xp_total ?? 0
    const dificultad_target = xp < 500 ? 2 : xp < 2000 ? 3 : xp < 5000 ? 4 : 5
    let q2 = sb.from('preguntas').select('id').eq('activa', true)
    if (oposicion_id) q2 = q2.eq('oposicion_id', oposicion_id)
    q2 = q2.in('dificultad', [Math.max(1, dificultad_target - 1), dificultad_target, Math.min(5, dificultad_target + 1)]).limit(n * 2)
    const { data } = await q2
    preguntas = shuffleAndPick(data ?? [], n)
  } else {
    // PrÃ¡ctica / simulacro / oficial â€” preguntas de oposiciÃ³n o temas especÃ­ficos
    let q2 = sb.from('preguntas').select('id').eq('activa', true)
    if (oposicion_id) q2 = q2.eq('oposicion_id', oposicion_id)
    if (tema_ids?.length) q2 = q2.in('tema_id', tema_ids)
    q2 = q2.limit(n * 2)
    const { data } = await q2
    preguntas = shuffleAndPick(data ?? [], n)
  }

  if (!preguntas.length) return Response.json({ error: 'No hay preguntas disponibles para estos criterios' }, { status: 404 })

  const preguntas_ids = preguntas.map((p: any) => p.id)
  const { data: examen, error } = await sb.from('examenes').insert({
    user_id, oposicion_id, tipo, estado: 'en_curso',
    preguntas_ids, total_preguntas: preguntas_ids.length,
    penalizacion, coeficiente_pen: penalizacion ? 0.25 : 0,
  }).select().single()

  if (error) return Response.json({ error: error.message }, { status: 500 })

  // Devolver preguntas completas
  const { data: preguntasData } = await sb.from('preguntas').select('id,enunciado,tipo,opciones,dificultad,tema_id,temas(titulo)').in('id', preguntas_ids)

  return Response.json({ examen, preguntas: preguntasData ?? [] })
}

export async function PATCH(req: NextRequest) {
  // Finalizar o guardar respuesta
  const body = await req.json()
  const { examen_id, respuestas, finalizar = false } = body

  if (!examen_id) return Response.json({ error: 'examen_id required' }, { status: 400 })

  const { data: examen } = await sb.from('examenes').select('*').eq('id', examen_id).single()
  if (!examen) return Response.json({ error: 'Examen no encontrado' }, { status: 404 })

  if (!finalizar) {
    await sb.from('examenes').update({ respuestas }).eq('id', examen_id)
    return Response.json({ ok: true })
  }

  // Calcular resultado
  const { data: preguntas } = await sb.from('preguntas').select('id,respuesta_correcta,tema_id,oposicion_id').in('id', examen.preguntas_ids)

  let correctas = 0, incorrectas = 0, sin_responder = 0
  const respDetalladas: any[] = []

  for (const p of preguntas ?? []) {
    const resp = respuestas?.[p.id]
    if (!resp) { sin_responder++; continue }
    const correcta = resp === p.respuesta_correcta
    if (correcta) correctas++; else incorrectas++
    respDetalladas.push({ examen_id, user_id: examen.user_id, pregunta_id: p.id, respuesta_dada: resp, correcta })
  }

  // PuntuaciÃ³n con/sin penalizaciÃ³n
  let puntuacion = (correctas / examen.total_preguntas) * 10
  if (examen.penalizacion) puntuacion -= (incorrectas * examen.coeficiente_pen) / examen.total_preguntas * 10
  puntuacion = Math.max(0, Math.round(puntuacion * 100) / 100)

  const tiempo = Math.round((Date.now() - new Date(examen.fecha_inicio).getTime()) / 1000)

  await Promise.all([
    sb.from('examenes').update({ estado: 'completado', respuestas, correctas, incorrectas, sin_responder, puntuacion, tiempo_segundos: tiempo, fecha_fin: new Date().toISOString() }).eq('id', examen_id),
    respDetalladas.length ? sb.from('respuestas_usuario').insert(respDetalladas) : Promise.resolve(),
  ])

  // Actualizar progreso por tema
  const temaMap: Record<string, { correctas: number; total: number }> = {}
  for (const p of preguntas ?? []) {
    if (!p.tema_id) continue
    const resp = respuestas?.[p.id]
    if (!resp) continue
    if (!temaMap[p.tema_id]) temaMap[p.tema_id] = { correctas: 0, total: 0 }
    temaMap[p.tema_id].total++
    if (resp === p.respuesta_correcta) temaMap[p.tema_id].correctas++
  }

  for (const [tema_id, data] of Object.entries(temaMap)) {
    const pct = (data.correctas / data.total) * 100
    const nivel = pct >= 85 ? 'dominado' : pct >= 60 ? 'en_progreso' : 'iniciado'
    await sb.from('progreso_temas').upsert({
      user_id: examen.user_id, tema_id,
      oposicion_id: examen.oposicion_id,
      porcentaje_acierto: pct, nivel_dominio: nivel,
      preguntas_respondidas: data.total, preguntas_acertadas: data.correctas,
      ultima_sesion: new Date().toISOString(),
    }, { onConflict: 'user_id,tema_id' })
  }

  // XP: +2 por correcta, +10 si >80%, +20 si simulacro completo
  let xp = correctas * 2
  if (puntuacion >= 8) xp += 10
  if (examen.tipo === 'simulacro') xp += 20
  try { await sb.rpc('increment_xp', { p_user_id: examen.user_id, p_xp: xp }) } catch { /* no crÃ­tico */ }

  return Response.json({ puntuacion, correctas, incorrectas, sin_responder, tiempo, xp_ganado: xp })
}

function shuffleAndPick<T>(arr: T[], n: number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a.slice(0, n)
}

