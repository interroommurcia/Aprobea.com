import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const { slug, event } = await req.json()
  if (!slug || !['view', 'cta_click'].includes(event)) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  const column = event === 'cta_click' ? 'cta_clicks' : 'views'

  await supabaseAdmin.rpc('increment_article_stat', { p_slug: slug, p_column: column })

  return NextResponse.json({ ok: true })
}
