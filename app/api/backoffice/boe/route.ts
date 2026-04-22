import { NextRequest } from 'next/server'
import { supabaseAdmin as sb } from '@/lib/supabase-admin'
import { scrapeBoE } from '@/lib/boe-scraper'

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_session')?.value === '1'
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const pendiente = req.nextUrl.searchParams.get('pendiente')

  if (pendiente) {
    const { count } = await sb.from('boe_publicaciones').select('*', { count: 'exact', head: true }).eq('procesado', false)
    return Response.json({ count: count ?? 0 })
  }

  const { data, error } = await sb.from('boe_publicaciones').select('*').order('fecha_publicacion', { ascending: false })
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ items: data ?? [] })
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { fecha, debug } = body
  try {
    const result = await scrapeBoE(fecha, !!debug)
    return Response.json({ ok: true, insertadas: typeof result === 'number' ? result : 0, ...(debug ? { debug: result } : {}) })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

