import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function detectSource(referrer: string | null): string {
  if (!referrer) return 'direct'
  if (referrer.includes('chatgpt.com') || referrer.includes('chat.openai.com')) return 'chatgpt'
  if (referrer.includes('grok.') || referrer.includes('grok.x.ai')) return 'grok'
  if (referrer.includes('gemini.google.com') || referrer.includes('bard.google.com')) return 'gemini'
  if (referrer.includes('perplexity.ai')) return 'perplexity'
  if (referrer.includes('copilot.microsoft.com') || referrer.includes('bing.com')) return 'copilot'
  if (referrer.includes('google.')) return 'google'
  if (referrer.includes('instagram.com')) return 'instagram'
  if (referrer.includes('linkedin.com')) return 'linkedin'
  if (referrer.includes('twitter.com') || referrer.includes('t.co') || referrer.includes('x.com')) return 'x'
  if (referrer.includes('facebook.com') || referrer.includes('fb.')) return 'facebook'
  if (referrer.includes('whatsapp.com') || referrer.includes('wa.me')) return 'whatsapp'
  return 'other'
}

export async function POST(req: NextRequest) {
  const { slug, event, referrer } = await req.json()
  if (!slug || !['view', 'cta_click'].includes(event)) {
    return NextResponse.json({ ok: false }, { status: 400 })
  }

  if (event === 'view') {
    const source = detectSource(referrer ?? null)
    await Promise.all([
      supabaseAdmin.rpc('increment_article_stat', { p_slug: slug, p_column: 'views' }),
      supabaseAdmin.from('articulos_views').insert({ slug, source, referrer: referrer || null }),
    ])
  } else {
    await supabaseAdmin.rpc('increment_article_stat', { p_slug: slug, p_column: 'cta_clicks' })
  }

  return NextResponse.json({ ok: true })
}
