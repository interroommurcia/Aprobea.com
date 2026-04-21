import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin as sb } from '@/lib/supabase-admin'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: NextRequest) {
  const { user_id, oposicion_id, fecha_examen, horas_semana, dias } = await req.json()
  if (!user_id || !oposicion_id) return Response.json({ error: 'Faltan parámetros' }, { status: 400 })

  const [{ data: oposicion }, { data: temas }, { data: progresos }] = await Promise.all([
    sb.from('oposiciones').select('nombre,descripcion').eq('id', oposicion_id).single(),
    sb.from('temas').select('id,numero,titulo,importancia,frecuencia_examen').eq('oposicion_id', oposicion_id).order('numero'),
    sb.from('progreso_temas').select('tema_id,porcentaje_acierto,nivel_dominio').eq('user_id', user_id).eq('oposicion_id', oposicion_id),
  ])

  const progresoMap = Object.fromEntries((progresos ?? []).map(p => [p.tema_id, p]))
  const temasConProgreso = (temas ?? []).map(t => ({
    numero: t.numero, titulo: t.titulo, importancia: t.importancia, frecuencia: t.frecuencia_examen,
    dominio: progresoMap[t.id]?.nivel_dominio ?? 'sin_iniciar',
    acierto: progresoMap[t.id]?.porcentaje_acierto ?? 0,
  }))

  const diasHastaExamen = fecha_examen ? Math.ceil((new Date(fecha_examen).getTime() - Date.now()) / 86400000) : 90
  const horasTotales    = Math.floor(diasHastaExamen / 7) * (horas_semana ?? 10)

  const prompt = `Eres un experto en planificación de estudio para oposiciones españolas. Genera un plan de estudio detallado en formato JSON.

OPOSICIÓN: ${oposicion?.nombre}
DÍAS HASTA EL EXAMEN: ${diasHastaExamen}
HORAS DISPONIBLES/SEMANA: ${horas_semana ?? 10}
DÍAS DISPONIBLES: ${(dias ?? ['lunes','martes','miercoles','jueves','viernes']).join(', ')}
HORAS TOTALES ESTIMADAS: ${horasTotales}

ESTADO ACTUAL DE TEMAS (${temasConProgreso.length} temas):
${JSON.stringify(temasConProgreso.slice(0, 40), null, 2)}

Genera un plan de estudio semanal en JSON con esta estructura:
{
  "resumen": "descripción general del plan",
  "semanas": [
    {
      "semana": 1,
      "objetivo": "...",
      "temas": [{ "numero": 1, "titulo": "...", "horas": 2, "prioridad": "alta|media|baja" }],
      "examenes": ["Descripción del examen de repaso a hacer esta semana"]
    }
  ],
  "recomendaciones": ["..."]
}

Prioriza temas con bajo dominio y alta frecuencia en examen. Sé realista con las horas.`

  // Usar Sonnet para planes — requiere más razonamiento
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  })

  let plan: any = null
  const text = msg.content[0].type === 'text' ? msg.content[0].text : ''
  try {
    const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) ?? text.match(/(\{[\s\S]*\})/)
    plan = JSON.parse(jsonMatch?.[1] ?? text)
  } catch { plan = { resumen: text, semanas: [], recomendaciones: [] } }

  const coste = (msg.usage.input_tokens * 0.000003 + msg.usage.output_tokens * 0.000015)
  await sb.from('ia_uso').insert({ user_id, tipo: 'plan', modelo: 'claude-sonnet-4-6', tokens_entrada: msg.usage.input_tokens, tokens_salida: msg.usage.output_tokens, coste_eur: coste })

  // Guardar plan
  const { data: planGuardado } = await sb.from('planes_estudio').upsert({
    user_id, oposicion_id, fecha_examen, horas_disponibles_semana: horas_semana, dias_disponibles: dias ?? [], plan, activo: true, updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,oposicion_id' }).select().single()

  return Response.json({ plan, plan_id: planGuardado?.id })
}
