import { NextRequest, NextResponse } from 'next/server'

// Proxy to Catastro API — no API key required (Spanish public registry)
// https://ovc.catastro.meh.es

export async function GET(req: NextRequest) {
  const rc = req.nextUrl.searchParams.get('rc')?.trim().toUpperCase()
  if (!rc) return NextResponse.json({ error: 'Falta la referencia catastral' }, { status: 400 })

  try {
    // 1. Get property details
    const detailUrl = `https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc/rest/Consulta_DNPRC?Provincia=&Municipio=&RC=${encodeURIComponent(rc)}`
    const detailRes = await fetch(detailUrl, { headers: { Accept: 'application/xml' }, signal: AbortSignal.timeout(8000) })
    const detailXml = await detailRes.text()

    // 2. Get coordinates for Idealista link
    const coordUrl = `https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/ovccoordenadas.asmx/Consulta_CPMRC?Provincia=&Municipio=&SRS=EPSG:4326&RC=${encodeURIComponent(rc)}`
    const coordRes = await fetch(coordUrl, { headers: { Accept: 'application/xml' }, signal: AbortSignal.timeout(8000) })
    const coordXml = await coordRes.text()

    // Parse detail XML
    const errCode = extractXml(detailXml, 'cod')
    if (errCode && errCode !== '0') {
      const errMsg: Record<string, string> = {
        '1': 'Referencia catastral vacía',
        '17': 'Referencia catastral no encontrada — verifica que los 20 caracteres sean correctos',
        '43': 'Referencia catastral con formato incorrecto',
      }
      return NextResponse.json({ error: errMsg[errCode] ?? `Catastro: código de error ${errCode}` }, { status: 404 })
    }

    const direccion = extractXml(detailXml, 'ldt') ?? ''
    const uso       = extractXml(detailXml, 'luso') ?? ''
    const sfc       = extractXml(detailXml, 'sfc')  ?? ''
    const municipio = extractXml(detailXml, 'nm')   ?? ''
    const provincia = extractXml(detailXml, 'np')   ?? ''

    // Parse coordinates
    const lat = extractXml(coordXml, 'ycen') ?? ''
    const lon = extractXml(coordXml, 'xcen') ?? ''

    // Build Idealista search URL (opens search near the property)
    let idealistaUrl: string | null = null
    if (lat && lon) {
      idealistaUrl = `https://www.idealista.com/geo?lat=${lat}&lon=${lon}&tipo=viviendas`
    } else if (municipio) {
      const slug = municipio.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-')
      idealistaUrl = `https://www.idealista.com/casas-${slug}/`
    }

    return NextResponse.json({
      rc,
      direccion,
      municipio,
      provincia,
      superficie: sfc ? parseFloat(sfc) : null,
      tipo_propiedad: mapUso(uso),
      lat: lat ? parseFloat(lat) : null,
      lon: lon ? parseFloat(lon) : null,
      idealistaUrl,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Error consultando Catastro' }, { status: 500 })
  }
}

// Simple XML tag extractor (first match)
function extractXml(xml: string, tag: string): string | null {
  const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]+)<\/${tag}>`, 'i'))
  return m ? m[1].trim() : null
}

function mapUso(uso: string): string {
  const u = uso.toLowerCase()
  if (u.includes('residencial') || u.includes('vivienda')) return 'Residencial'
  if (u.includes('comercial') || u.includes('comercio')) return 'Comercial'
  if (u.includes('industrial') || u.includes('almacen')) return 'Industrial'
  if (u.includes('solar') || u.includes('suelo')) return 'Suelo'
  if (u.includes('oficina')) return 'Oficinas'
  if (uso) return uso.charAt(0).toUpperCase() + uso.slice(1).toLowerCase()
  return 'Residencial'
}
