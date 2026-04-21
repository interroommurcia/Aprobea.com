import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { anthropic, MODEL, EXAM_SYSTEM_PROMPT } from '@/lib/anthropic'

const BOLETINES = [
  { id: 'BOE',  url: 'https://www.boe.es/rss/canal.php?s=empleo-publico' },
  { id: 'BOCM', url: 'https://www.bocm.es/rss/rss_empleo.xml' },
  { id: 'BOJA', url: 'https://www.juntadeandalucia.es/boja/rss/boja.xml' },
  // Añadir más boletines aquí
]

// Este endpoint lo llama un cron diario (Supabase Edge Function o Vercel Cron)
export async function POST(req: NextRequest) {
  // Verificar secret para que solo lo llame el cron
  const auth = req.headers.get('x-cron-secret')
  if (auth !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const supabase = await createServiceClient()
  const resultados = []

  for (const boletin of BOLETINES) {
    try {
      const res = await fetch(boletin.url)
      const xml = await res.text()

      // Extraer items del RSS
      const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => {
        const titulo = m[1].match(/<title>(.*?)<\/title>/)?.[1] ?? ''
        const link   = m[1].match(/<link>(.*?)<\/link>/)?.[1] ?? ''
        const desc   = m[1].match(/<description>(.*?)<\/description>/)?.[1] ?? ''
        return { titulo, link, desc }
      })

      for (const item of items) {
        // Filtrar solo convocatorias relevantes
        const keywords = ['convocatoria','plaza','oposición','oposiciones','concurso-oposición','libre designación']
        const esRelevante = keywords.some(k => item.titulo.toLowerCase().includes(k))
        if (!esRelevante) continue

        // Evitar duplicados
        const { count } = await supabase
          .from('boe_publicaciones')
          .select('id', { count: 'exact', head: true })
          .eq('url', item.link)
        if (count && count > 0) continue

        // Clasificar con IA
        const ia = await anthropic.messages.create({
          model: MODEL,
          max_tokens: 512,
          system: [{ type: 'text', text: EXAM_SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
          messages: [{
            role: 'user',
            content: `Analiza esta publicación del ${boletin.id}:
Título: ${item.titulo}
Descripción: ${item.desc}

Responde en JSON:
{"es_convocatoria":true/false,"organismo":"...","categoria":"...","num_plazas":0,"fecha_limite":"YYYY-MM-DD o null"}`,
          }],
        })

        const iaText = ia.content[0].type === 'text' ? ia.content[0].text : '{}'
        let datos: Record<string, unknown> = {}
        try {
          const match = iaText.match(/\{[\s\S]*\}/)
          datos = match ? JSON.parse(match[0]) : {}
        } catch {}

        // Guardar publicación
        const { data: pub } = await supabase.from('boe_publicaciones').insert({
          boletin: boletin.id,
          fecha_publicacion: new Date().toISOString().split('T')[0],
          titulo: item.titulo,
          url: item.link,
          texto_extraido: item.desc,
          procesado: true,
          es_convocatoria: datos.es_convocatoria ?? false,
        }).select('id').single()

        if (datos.es_convocatoria && pub) {
          // Crear convocatoria y notificar usuarios con alertas activas
          const { data: conv } = await supabase.from('convocatorias').insert({
            titulo: item.titulo,
            categoria: datos.categoria,
            num_plazas: datos.num_plazas ?? 0,
            fecha_limite: datos.fecha_limite,
            url_boletin: item.link,
            fecha_publicacion: new Date().toISOString().split('T')[0],
          }).select('id').single()

          if (conv) {
            // Encolar emails de alerta para usuarios suscritos
            const { data: alertas } = await supabase
              .from('alertas_usuario')
              .select('user_id')
              .eq('email_activo', true)

            if (alertas && alertas.length > 0) {
              await supabase.from('email_queue').insert(
                alertas.map(a => ({
                  user_id: a.user_id,
                  tipo: 'alerta_convocatoria',
                  payload: {
                    titulo: item.titulo,
                    url: item.link,
                    plazas: datos.num_plazas,
                    fecha_limite: datos.fecha_limite,
                    boletin: boletin.id,
                  },
                  scheduled_for: new Date().toISOString(),
                }))
              )
            }
          }
        }

        resultados.push({ boletin: boletin.id, titulo: item.titulo, es_convocatoria: datos.es_convocatoria })
      }
    } catch (e) {
      console.error(`Error procesando ${boletin.id}:`, e)
    }
  }

  return NextResponse.json({ procesadas: resultados.length, resultados })
}
