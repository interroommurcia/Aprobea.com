import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_session')?.value === '1'
}

const SOURCE_LABELS: Record<string, string> = {
  chatgpt: 'ChatGPT',
  grok: 'Grok',
  gemini: 'Gemini',
  perplexity: 'Perplexity',
  copilot: 'Copilot',
  google: 'Google',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  x: 'X / Twitter',
  facebook: 'Facebook',
  whatsapp: 'WhatsApp',
  direct: 'Directo',
  other: 'Otro',
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const slug = req.nextUrl.searchParams.get('slug')
  if (!slug) return NextResponse.json({ error: 'slug requerido' }, { status: 400 })

  const { data } = await supabaseAdmin
    .from('articulos_views')
    .select('source, created_at')
    .eq('slug', slug)
    .order('created_at', { ascending: false })
    .limit(2000)

  const sources: Record<string, number> = {}
  const byDay: Record<string, number> = {}

  for (const row of data ?? []) {
    sources[row.source] = (sources[row.source] ?? 0) + 1
    const day = row.created_at.slice(0, 10)
    byDay[day] = (byDay[day] ?? 0) + 1
  }

  const sourcesLabeled = Object.entries(sources)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({ source: key, label: SOURCE_LABELS[key] ?? key, count }))

  const last7 = Object.entries(byDay)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-7)
    .map(([date, count]) => ({ date, count }))

  return NextResponse.json({ sources: sourcesLabeled, last7, total: data?.length ?? 0 })
}
