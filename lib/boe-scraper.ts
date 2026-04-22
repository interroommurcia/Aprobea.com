import { supabaseAdmin as sb } from '@/lib/supabase-admin'

// ---------------------------------------------------------------------------
// Filtro de relevancia: solo guardamos lo que interesa al opositor
// ---------------------------------------------------------------------------
const EXCLUSION_KW = [
  'subvenci', 'ayuda económica', 'ayudas económicas', 'beca', 'becas',
  'prestación económica', 'subsidio', 'incentivo económico', 'bonificaci',
  'financiaci', 'licitaci', 'adjudicaci', 'contrato de suministro',
  'contrato de servicio', 'concesión de ayuda', 'concesión de subvenci',
  'resolución de concesión', 'fondo europeo', 'fondo social',
]

const OPOSICION_KW = [
  'oposici', 'proceso selectivo', 'proceso de selección', 'prueba selectiva',
  'convocatoria de plazas', 'convocatoria de ingreso', 'convocatoria libre',
  'cuerpo de', 'escala de', 'subescala de',
  'funcionario', 'funcionaria', 'interino', 'interina',
  'plazas de', 'plaza de', 'libre designaci', 'concurso de méritos',
  'concurso-oposici', 'concurso oposici',
  'bases de la convocatoria', 'tribunal calificador', 'tribunal de selecci',
  'temario', 'programa de materias', 'lista de admitidos',
  'lista provisional de aprobados', 'lista definitiva de aprobados',
  'aprobados', 'relación de aprobados',
  'ingreso al cuerpo', 'acceso al cuerpo', 'turno libre',
  'actas del tribunal', 'nota de corte', 'puntuación definitiva',
  'resolución de convocatoria', 'resolución de la convocatoria',
  'ejercicio práctico', 'primer ejercicio', 'segundo ejercicio',
  'examen', 'prueba teórica', 'prueba práctica',
]

function esRelevanteParaOpositor(titulo: string): boolean {
  const t = titulo.toLowerCase()

  // Excluir explícitamente subvenciones y similares
  if (EXCLUSION_KW.some(kw => t.includes(kw))) return false

  const tipo = detectTipo(titulo)

  // Rectificaciones: solo si también mencionan algo de oposiciones
  if (tipo === 'rectificacion') {
    return OPOSICION_KW.some(kw => t.includes(kw))
  }

  // Para "otro": solo si tiene keyword de oposición explícito
  if (tipo === 'otro') {
    return OPOSICION_KW.some(kw => t.includes(kw))
  }

  // convocatoria, bases, resultado, temario → relevantes por definición,
  // pero verificamos que no sean de subvenciones (ya filtrado arriba)
  return true
}

// ---------------------------------------------------------------------------
// Parser genérico de un bloque XML del sumario BOE
// ---------------------------------------------------------------------------
function parseItemXml(content: string, fecha: string): Record<string, any> | null {
  const id        = content.match(/<identificador>([\s\S]*?)<\/identificador>/)?.[1]?.trim()
  const titulo    = content.match(/<titulo>([\s\S]*?)<\/titulo>/)?.[1]?.trim()
  const urlPdf    = content.match(/<url_pdf[^>]*>([\s\S]*?)<\/url_pdf>/)?.[1]?.trim()
  const organismo = content.match(/<departamento>([\s\S]*?)<\/departamento>/)?.[1]?.trim() ?? null
  if (!titulo || !id) return null

  return {
    boe_id: id, titulo, url_pdf: urlPdf ?? null,
    tipo: detectTipo(titulo), fecha_publicacion: fecha, procesado: false,
    comunidad: 'estatal',
    organismo,
    departamento: organismo,
    num_plazas: detectPlazas(titulo),
    grupo: detectGrupo(titulo),
    anio_convocatoria: detectAnio(titulo, fecha),
    vigente: true,
  }
}

// ---------------------------------------------------------------------------
// Scraper diario (cron)
// ---------------------------------------------------------------------------
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
    const item = parseItemXml(m[1], hoy)
    if (!item) continue
    if (!esRelevanteParaOpositor(item.titulo)) continue
    items.push(item)
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

// ---------------------------------------------------------------------------
// Keywords que identifican resoluciones con exámenes reales (preguntas/respuestas)
// ---------------------------------------------------------------------------
const EXAMEN_OFICIAL_KW = [
  'resolución de las pruebas selectivas',
  'resolución de la prueba selectiva',
  'aprobados en las pruebas selectivas',
  'aprobados en el proceso selectivo',
  'relación de aprobados',
  'lista definitiva de aprobados',
  'actas del tribunal',
  'resultado de las pruebas',
  'resultado del proceso selectivo',
  'puntuación definitiva',
  'nota de corte',
  'examen de acceso',
  'ejercicio de la oposición',
  'primer ejercicio', 'segundo ejercicio', 'tercer ejercicio',
]

function esExamenOficial(titulo: string): boolean {
  const t = titulo.toLowerCase()
  return EXAMEN_OFICIAL_KW.some(kw => t.includes(kw))
}

/**
 * Scrapea un rango de fechas del BOE buscando resoluciones de exámenes oficiales.
 * Útil para poblar el histórico de años anteriores.
 *
 * @param desde  fecha inicio 'YYYY-MM-DD'
 * @param hasta  fecha fin   'YYYY-MM-DD' (inclusive)
 * @param onProgress callback opcional con { fecha, found }
 */
export async function scrapeExamenesHistorico(
  desde: string,
  hasta: string,
  onProgress?: (info: { fecha: string; found: number; total: number }) => void,
): Promise<{ procesadas: number; encontradas: number; insertadas: number }> {
  const start = new Date(desde)
  const end   = new Date(hasta)
  let procesadas = 0, encontradas = 0, insertadas = 0

  // Generamos la lista de fechas laborables (L-V) entre desde y hasta
  const fechas: string[] = []
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay()
    if (dow === 0 || dow === 6) continue // skip fines de semana
    fechas.push(d.toISOString().slice(0, 10))
  }

  for (const fecha of fechas) {
    const fechaStr = fecha.replace(/-/g, '')
    try {
      const res = await fetch(
        `https://www.boe.es/datosabiertos/api/boe/sumario/${fechaStr}`,
        { headers: { Accept: 'application/xml', 'User-Agent': 'Aprobea/1.0' }, cache: 'no-store' },
      )
      procesadas++
      if (!res.ok) continue

      const xml = await res.text()
      if (xml.match(/<code>(\d+)<\/code>/)?.[1] !== '200') continue

      const items: any[] = []
      const rItems = /<item>([\s\S]*?)<\/item>/g
      let m
      while ((m = rItems.exec(xml)) !== null) {
        const item = parseItemXml(m[1], fecha)
        if (!item) continue
        // Solo guardamos si es examen oficial o resultado relevante para opositores
        if (!esExamenOficial(item.titulo) && item.tipo !== 'resultado') continue
        if (!esRelevanteParaOpositor(item.titulo)) continue
        // Marcar como examen oficial si aplica
        if (esExamenOficial(item.titulo)) item.tipo = 'resultado'
        items.push(item)
      }

      if (items.length) {
        encontradas += items.length
        const { error } = await sb
          .from('boe_publicaciones')
          .upsert(items, { onConflict: 'boe_id', ignoreDuplicates: true })
        if (!error) insertadas += items.length
      }

      onProgress?.({ fecha, found: items.length, total: fechas.length })

      // Pausa mínima para no sobrecargar la API del BOE
      await new Promise(r => setTimeout(r, 300))
    } catch {
      // continuar con la siguiente fecha si hay error de red
    }
  }

  return { procesadas, encontradas, insertadas }
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
