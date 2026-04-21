import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { anthropic, MODEL } from '@/lib/anthropic'

const BOLETINES = [
  // Estatal
  { id: 'BOE',  url: 'https://www.boe.es/rss/canal.php?s=empleo-publico' },
  // CCAA
  { id: 'BOCM', url: 'https://www.bocm.es/rss/rss.php?s=empleo' },
  { id: 'BOJA', url: 'https://www.juntadeandalucia.es/boja/rss/boja_empleo.xml' },
  { id: 'DOGC', url: 'https://dogc.gencat.cat/ca/rss/rss.xml?categoria=empleo' },
  { id: 'DOG',  url: 'https://www.xunta.gal/dog/Publicados/rss/emprego.xml' },
  { id: 'BOA',  url: 'https://www.boa.aragon.es/rss/rss_empleo.xml' },
  { id: 'BORM', url: 'https://www.borm.es/borm/rss/empleo.xml' },
  { id: 'DOCV', url: 'https://dogv.gva.es/datos/rss/empleo.xml' },
  { id: 'BOPB', url: 'https://bop.diba.cat/rss/empleo.xml' },
  { id: 'BOP-MAD', url: 'https://www.comunidad.madrid/sites/default/files/rss/bopam_empleo.xml' },
]

const KEYWORDS = ['convocatoria','plaza','oposición','oposiciones','concurso-oposición','libre designación','funcionari']

function esRelevante(titulo: string, desc: string): boolean {
  const texto = (titulo + ' ' + desc).toLowerCase()
  return KEYWORDS.some(k => texto.includes(k))
}

async function clasificarBatch(items: { titulo: string; desc: string; boletin: string }[]) {
  if (items.length === 0) return []

  const lista = items.map((it, i) =>
    `[${i}] Boletín: ${it.boletin}\nTítulo: ${it.titulo}\nDesc: ${it.desc.slice(0, 200)}`
  ).join('\n\n')

  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: [{
      type: 'text',
      text: 'Eres un clasificador de convocatorias de oposiciones públicas españolas. Responde SOLO con JSON válido, sin explicaciones.',
      cache_control: { type: 'ephemeral' },
    }],
    messages: [{
      role: 'user',
      content: `Clasifica estas publicaciones. Para cada índice devuelve:
{"es_convocatoria":bool,"organismo":"","categoria":"","num_plazas":0,"fecha_limite":"YYYY-MM-DD|null"}

${lista}

Responde en JSON: {"resultados": [{...}, ...]} — un objeto por índice en el mismo orden.`,
    }],
  })

  const text = res.content[0].type === 'text' ? res.content[0].text : '{}'
  try {
    const match = text.match(/\{[\s\S]*\}/)
    const parsed = match ? JSON.parse(match[0]) : { resultados: [] }
    return parsed.resultados ?? []
  } catch {
    return items.map(() => ({ es_convocatoria: false }))
  }
}

async function run() {
  const supabase = await createServiceClient()
  const nuevos: { titulo: string; desc: string; boletin: string; link: string }[] = []

  // 1. Fetch RSS de todos los boletines en paralelo
  const fetches = await Promise.allSettled(
    BOLETINES.map(async b => {
      const res = await fetch(b.url, { signal: AbortSignal.timeout(8000) })
      const xml = await res.text()
      return { boletin: b.id, xml }
    })
  )

  for (const result of fetches) {
    if (result.status === 'rejected') continue
    const { boletin, xml } = result.value

    const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(m => ({
      titulo: m[1].match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/)?.[1]?.trim() ?? '',
      link:   m[1].match(/<link>(.*?)<\/link>/)?.[1]?.trim() ?? '',
      desc:   m[1].match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/)?.[1]?.trim() ?? '',
    })).filter(it => it.link && esRelevante(it.titulo, it.desc))

    for (const item of items) {
      const { count } = await supabase
        .from('boe_publicaciones')
        .select('id', { count: 'exact', head: true })
        .eq('url', item.link)
      if (!count || count === 0) nuevos.push({ ...item, boletin })
    }
  }

  if (nuevos.length === 0) return { procesadas: 0, nuevas_convocatorias: 0 }

  // 2. Clasificar con IA en un solo batch (máx 30 items)
  const lote = nuevos.slice(0, 30)
  const clasificaciones = await clasificarBatch(lote)

  // 3. Guardar resultados
  let nuevasConvocatorias = 0
  for (let i = 0; i < lote.length; i++) {
    const item = lote[i]
    const datos = clasificaciones[i] ?? { es_convocatoria: false }

    const { data: pub } = await supabase.from('boe_publicaciones').insert({
      boletin: item.boletin,
      fecha_publicacion: new Date().toISOString().split('T')[0],
      titulo: item.titulo,
      url: item.link,
      texto_extraido: item.desc,
      procesado: true,
      es_convocatoria: datos.es_convocatoria ?? false,
    }).select('id').single()

    if (datos.es_convocatoria && pub) {
      const { data: conv } = await supabase.from('convocatorias').insert({
        titulo: item.titulo,
        categoria: datos.categoria ?? null,
        num_plazas: datos.num_plazas ?? 0,
        fecha_limite: datos.fecha_limite ?? null,
        url_boletin: item.link,
        fecha_publicacion: new Date().toISOString().split('T')[0],
        boletin_referencia: item.boletin,
      }).select('id').single()

      if (conv) {
        nuevasConvocatorias++
        // Notificar usuarios con alertas activas
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
                boletin: item.boletin,
              },
              scheduled_for: new Date().toISOString(),
            }))
          )
        }
      }
    }
  }

  return { procesadas: lote.length, nuevas_convocatorias: nuevasConvocatorias }
}

// GET — lo llama Vercel Cron
export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const resultado = await run()
  return NextResponse.json(resultado)
}

// POST — para llamadas manuales desde backoffice
export async function POST(req: NextRequest) {
  const auth = req.headers.get('x-cron-secret')
  if (auth !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }
  const resultado = await run()
  return NextResponse.json(resultado)
}
