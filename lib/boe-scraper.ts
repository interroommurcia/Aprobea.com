import { supabaseAdmin as sb } from '@/lib/supabase-admin'

// ---------------------------------------------------------------------------
// Filtro de relevancia: solo guardamos lo que interesa al opositor
// Usamos STEMS (raíces) para capturar singular y plural en español
// ---------------------------------------------------------------------------

// Si el título contiene alguna de estas → descartar siempre
const EXCLUSION_KW = [
  'subvenci',            // subvención, subvenciones
  'ayuda económic',      // ayuda económica/s
  'ayudas económic',
  'concesión de ayuda',
  'concesión de subvenci',
  'resolución de concesión',
  'beca', 'becas',
  'prestación económic',
  'subsidio',
  'incentivo económic',
  'bonificaci',          // bonificación
  'financiaci',          // financiación
  'licitaci',            // licitación, licitaciones
  'adjudicaci',          // adjudicación
  'contrato de suministro',
  'contrato de servicio',
  'fondo europeo',
  'fondo social',
  'tarifa',
  'arancel',
  'precio público',
  'tasa ',               // tasa fiscal (con espacio para no confundir con 'tasas de oposición')
]

// Si el título contiene alguna de estas → INCLUIR (siempre que no esté en EXCLUSION)
// Stems truncados antes de desinencias para capturar singular/plural/género
const OPOSICION_KW = [
  'oposici',             // oposición, oposiciones, opositor
  'selectiv',            // selectiva, selectivas, selectivo, selectivos → "pruebas selectivas"
  'convocatori',         // convocatoria, convocatorias → "se convocan" NO, pero "convocatoria" SÍ
  'convocan',            // "se convocan pruebas", "se convocan plazas"
  'proceso de selección',
  'procesos de selección',
  'cuerpo de ',          // Cuerpo de Gestión, Cuerpo de Técnicos
  'escala de ',          // Escala de Administración
  'subescala de ',
  'funcionari',          // funcionario/a/os/as
  'interino',
  'interina',
  'libre designaci',
  'concurso de mérito',  // concurso de méritos (con y sin tilde)
  'concurso de merito',
  'concurso-oposici',
  'concurso oposici',
  'tribunal calificador',
  'tribunal de selecci',
  'tribunal de oposici',
  'bases de la convocatori',
  'bases reguladoras.*oposici',  // se evalúa como includes, no regex, pero útil
  'temario',
  'programa de materias',
  'lista de admitido',   // lista de admitidos/as
  'lista provisional',
  'lista definitiva',
  'aprobado',            // aprobado, aprobados, aprobadas
  'relación de aprobado',
  'ingreso al cuerpo',
  'acceso al cuerpo',
  'turno libre',
  'actas del tribunal',
  'nota de corte',
  'puntuación definitiva',
  'puntuacion definitiva',
  'ejercicio práctico',
  'ejercicio practico',
  'primer ejercicio',
  'segundo ejercicio',
  'tercer ejercicio',
  'plazas de acceso',
  'plazas de ingreso',
  'plazas convocada',    // plazas convocadas
  'plazas ofertada',     // plazas ofertadas
  'personal funcionari',
  'personal laboral',
  'acceso libre',
  'promoción interna',
  'promocion interna',
  'oferta de empleo público',
  'oferta de empleo publico',
  'oferta de empleo',
]

function esRelevanteParaOpositor(titulo: string): boolean {
  const t = titulo.toLowerCase()

  // 1. Excluir siempre si es sobre subvenciones/ayudas/licitaciones
  if (EXCLUSION_KW.some(kw => t.includes(kw))) return false

  // 2. Incluir si contiene cualquier keyword de oposición (stem)
  if (OPOSICION_KW.some(kw => t.includes(kw))) return true

  // 3. detectTipo como último recurso para tipos claramente relevantes
  const tipo = detectTipo(titulo)
  return tipo === 'temario' || tipo === 'bases'
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

  // boe_fuente: 'BOE-A', 'BOE-B', 'BOE-C' extraído del id
  const boe_fuente = id.match(/^(BOE-[A-Z])/)?.[1] ?? 'BOE-A'

  return {
    boe_id: id, titulo, url_pdf: urlPdf ?? null,
    tipo: detectTipo(titulo), fecha_publicacion: fecha, procesado: false,
    boe_fuente,
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
  // Stems para capturar singular/plural/género
  if (t.includes('convocatori') || t.includes('convocan') || t.includes('se convoca')) return 'convocatoria'
  if (t.includes('oferta de empleo')) return 'convocatoria'
  if (t.includes('bases reguladora') || t.includes('bases de la convocatori')) return 'bases'
  if (t.includes('aprobado') || t.includes('lista definitiva') || t.includes('lista provisional') || t.includes('resultado') || t.includes('nota de corte')) return 'resultado'
  if (t.includes('temario') || t.includes('programa de materias')) return 'temario'
  if (t.includes('rectificaci') || t.includes('correci') || t.includes('correccion') || t.includes('corrección')) return 'rectificacion'
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
