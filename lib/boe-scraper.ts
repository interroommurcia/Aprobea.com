import { supabaseAdmin as sb } from '@/lib/supabase-admin'

export async function scrapeBoE(fechaOverride?: string, debug = false): Promise<number | object> {
  const hoy = fechaOverride ?? new Date().toISOString().slice(0, 10)
  const fechaStr = hoy.replace(/-/g, '')

  const apiUrl = `https://www.boe.es/datosabiertos/api/boe/sumario/${fechaStr}`
  const res = await fetch(apiUrl, {
    headers: { Accept: 'application/xml', 'User-Agent': 'Aprobea/1.0' },
    cache: 'no-store',
  })
  if (!res.ok) return debug ? { step: 'fetch_failed', status: res.status } : 0

  const xml = await res.text()
  const statusCode = xml.match(/<code>(\d+)<\/code>/)?.[1]
  if (statusCode !== '200') return debug ? { step: 'bad_status', statusCode, xml: xml.slice(0, 300) } : 0

  const items: any[] = []
  const rItems = /<item>([\s\S]*?)<\/item>/g
  let m
  while ((m = rItems.exec(xml)) !== null) {
    const content = m[1]
    const id        = content.match(/<identificador>([\s\S]*?)<\/identificador>/)?.[1]?.trim()
    const titulo    = content.match(/<titulo>([\s\S]*?)<\/titulo>/)?.[1]?.trim()
    const urlPdf    = content.match(/<url_pdf[^>]*>([\s\S]*?)<\/url_pdf>/)?.[1]?.trim()
    const organismo = content.match(/<departamento>([\s\S]*?)<\/departamento>/)?.[1]?.trim() ?? null
    if (!titulo || !id) continue

    items.push({
      boe_id: id, titulo, url_pdf: urlPdf ?? null,
      tipo: detectTipo(titulo), fecha_publicacion: hoy, procesado: false,
      comunidad: 'estatal',
      organismo,
      departamento: organismo,
      num_plazas: detectPlazas(titulo),
      grupo: detectGrupo(titulo),
      anio_convocatoria: detectAnio(titulo, hoy),
      vigente: true,
    })
  }

  if (!items.length) return debug ? { step: 'no_items', xmlSnippet: xml.slice(0, 500) } : 0
  if (debug) return { step: 'parsed', count: items.length, sample: items.slice(0, 2) }

  const { error } = await sb.from('boe_publicaciones').upsert(items, { onConflict: 'boe_id', ignoreDuplicates: true })
  if (error) throw new Error(error.message)

  await notificarAlertas(items)
  return items.length
}

function detectPlazas(titulo: string): number | null {
  const m = titulo.match(/\b(\d{1,4})\s*plazas?\b/i)
  return m ? parseInt(m[1]) : null
}

function detectGrupo(titulo: string): string | null {
  const m = titulo.match(/\b(subgrupo\s+)?(A1|A2|B|C1|C2)\b/i)
  return m ? m[2].toUpperCase() : null
}

function detectAnio(titulo: string, hoy: string): number | null {
  const m = titulo.match(/\b(20\d{2})\b/)
  return m ? parseInt(m[1]) : parseInt(hoy.slice(0, 4))
}

function detectTipo(titulo: string): string {
  const t = titulo.toLowerCase()
  if (t.includes('convocatoria') || t.includes('convocatorio')) return 'convocatoria'
  if (t.includes('bases') || t.includes('reglamento')) return 'bases'
  if (t.includes('resultado') || t.includes('aprobado') || t.includes('lista')) return 'resultado'
  if (t.includes('temario') || t.includes('programa')) return 'temario'
  if (t.includes('rectificacion') || t.includes('rectificación') || t.includes('corrección') || t.includes('correccion')) return 'rectificacion'
  return 'otro'
}

async function notificarAlertas(items: any[]) {
  const { data: alertas } = await sb.from('alertas_boe').select('*,oposiciones(nombre,tags)').eq('activa', true)
  if (!alertas?.length) return

  const notifs: any[] = []
  for (const alerta of alertas) {
    for (const item of items) {
      const tituloLow = item.titulo?.toLowerCase() ?? ''
      const kwMatch   = (alerta.palabras_clave ?? []).some((kw: string) => tituloLow.includes(kw.toLowerCase()))
      const opoMatch  = alerta.oposicion_id ? tituloLow.includes((alerta.oposiciones?.nombre ?? '').toLowerCase().slice(0, 10)) : false
      if (kwMatch || opoMatch) {
        notifs.push({
          user_id: alerta.user_id,
          tipo: 'boe',
          titulo: `BOE: ${item.tipo === 'convocatoria' ? 'Nueva convocatoria' : 'Nueva publicación'}`,
          mensaje: item.titulo,
          url: `/dashboard/boe-radar`,
          datos: { boe_id: item.boe_id, tipo: item.tipo },
        })
      }
    }
  }

  if (notifs.length) await sb.from('notificaciones_usuario').insert(notifs)
}
