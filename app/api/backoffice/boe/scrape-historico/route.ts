import { NextRequest, NextResponse } from 'next/server'
import { scrapeExamenesHistorico } from '@/lib/boe-scraper'
import { supabaseAdmin } from '@/lib/supabase-admin'

/**
 * POST /api/backoffice/boe/scrape-historico
 *
 * Body JSON:
 *   { desde: 'YYYY-MM-DD', hasta: 'YYYY-MM-DD' }
 *
 * Scrapea el BOE en el rango dado buscando resoluciones de exámenes oficiales
 * (resultados de pruebas selectivas, listas de aprobados, actas de tribunal…).
 *
 * Recomendación: lanzar por tramos de ~3 meses para evitar timeouts.
 */
export async function POST(req: NextRequest) {
  // Auth básica de backoffice: solo con CRON_SECRET o sesión admin
  const auth = req.headers.get('authorization') ?? ''
  const secret = process.env.CRON_SECRET ?? ''
  if (secret && auth !== `Bearer ${secret}`) {
    // Verificar sesión de Supabase si no viene el token cron
    const { data: { user } } = await supabaseAdmin.auth.getUser(
      req.headers.get('x-supabase-auth') ?? ''
    )
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { desde, hasta } = await req.json().catch(() => ({}))

  if (!desde || !hasta) {
    return NextResponse.json(
      { error: 'Parámetros requeridos: desde (YYYY-MM-DD), hasta (YYYY-MM-DD)' },
      { status: 400 },
    )
  }

  // Validar rango máximo: 6 meses para evitar timeouts en Vercel
  const msRange = new Date(hasta).getTime() - new Date(desde).getTime()
  const diasRange = msRange / 86_400_000
  if (diasRange > 185) {
    return NextResponse.json(
      { error: 'Rango máximo 6 meses. Divide en varias peticiones.' },
      { status: 400 },
    )
  }

  const resultado = await scrapeExamenesHistorico(desde, hasta)

  return NextResponse.json({
    ok: true,
    desde,
    hasta,
    ...resultado,
  })
}

/**
 * GET /api/backoffice/boe/scrape-historico?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
 * Versión GET para lanzar desde el navegador / backoffice UI.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const desde = searchParams.get('desde')
  const hasta = searchParams.get('hasta')

  if (!desde || !hasta) {
    return NextResponse.json(
      { error: 'Parámetros requeridos: desde, hasta (YYYY-MM-DD)' },
      { status: 400 },
    )
  }

  const msRange = new Date(hasta).getTime() - new Date(desde).getTime()
  if (msRange / 86_400_000 > 185) {
    return NextResponse.json(
      { error: 'Rango máximo 6 meses.' },
      { status: 400 },
    )
  }

  const resultado = await scrapeExamenesHistorico(desde, hasta)
  return NextResponse.json({ ok: true, desde, hasta, ...resultado })
}
