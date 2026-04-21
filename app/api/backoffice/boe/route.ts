import { NextRequest } from 'next/server'
import { supabaseAdmin as sb } from '@/lib/supabase-admin'

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_session')?.value === '1'
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const pendiente = req.nextUrl.searchParams.get('pendiente')
  const limit     = parseInt(req.nextUrl.searchParams.get('limit') ?? '20')

  if (pendiente) {
    const { count } = await sb.from('boe_publicaciones').select('*', { count: 'exact', head: true }).eq('procesado', false)
    return Response.json({ count: count ?? 0 })
  }

  const { data, error } = await sb.from('boe_publicaciones').select('*').order('fecha_publicacion', { ascending: false }).limit(limit)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ items: data ?? [] })
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })

  // Disparar scraping manual del BOE
  try {
    const result = await scrapeBoE()
    return Response.json({ ok: true, insertadas: result })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

async function scrapeBoE() {
  const hoy = new Date().toISOString().slice(0, 10)
  const url = `https://www.boe.es/boe/dias/${hoy.replace(/-/g, '/')}/index.php?o=AGE_JUSTICIA`

  // Llamamos a la API oficial del BOE (XML sumario)
  const apiUrl = `https://www.boe.es/diario_boe/xml.php?id=BOE-S-${hoy.replace(/-/g, '')}`
  const res = await fetch(apiUrl, { next: { revalidate: 0 } })
  if (!res.ok) return 0

  const xml = await res.text()

  // Extraer items del sumario con regex simple
  const items: any[] = []
  const rItems = /<item[^>]*>([\s\S]*?)<\/item>/g
  let m
  while ((m = rItems.exec(xml)) !== null) {
    const content = m[1]
    const titulo  = content.match(/<titulo>([\s\S]*?)<\/titulo>/)?.[1]?.trim()
    const urlItem = content.match(/<urlPdf[^>]*>([\s\S]*?)<\/urlPdf>/)?.[1]?.trim()
    const id      = content.match(/<identificador>([\s\S]*?)<\/identificador>/)?.[1]?.trim()
    if (!titulo || !id) continue

    const tipoDetect = detectTipo(titulo)
    items.push({
      boe_id: id, titulo, url_pdf: urlItem ? `https://www.boe.es${urlItem}` : null,
      tipo: tipoDetect, boe_fuente: 'estatal', fecha_publicacion: hoy, procesado: false,
    })
  }

  if (!items.length) return 0

  const { error } = await sb.from('boe_publicaciones').upsert(items, { onConflict: 'boe_id', ignoreDuplicates: true })
  if (error) throw new Error(error.message)

  // Notificar alertas de usuarios
  await notificarAlertas(items)

  return items.length
}

function detectTipo(titulo: string): string {
  const t = titulo.toLowerCase()
  if (t.includes('convocatoria') || t.includes('convocatÃ³rio')) return 'convocatoria'
  if (t.includes('bases') || t.includes('reglamento')) return 'bases'
  if (t.includes('resultado') || t.includes('aprobado') || t.includes('lista')) return 'resultado'
  if (t.includes('temario') || t.includes('programa')) return 'temario'
  if (t.includes('rectificacion') || t.includes('correcciÃ³n')) return 'rectificacion'
  return 'otro'
}

async function notificarAlertas(items: any[]) {
  // Buscar alertas activas y cruzar con palabras clave
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
          titulo: `ðŸ“¡ BOE: ${item.tipo === 'convocatoria' ? 'ðŸ”” Nueva convocatoria' : 'Nueva publicaciÃ³n'}`,
          mensaje: item.titulo,
          url: `/dashboard/boe-radar`,
          datos: { boe_id: item.boe_id, tipo: item.tipo },
        })
      }
    }
  }

  if (notifs.length) await sb.from('notificaciones_usuario').insert(notifs)
}

