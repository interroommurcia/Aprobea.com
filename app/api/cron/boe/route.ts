import { NextRequest } from 'next/server'
import { scrapeBoE } from '@/lib/boe-scraper'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'No autorizado' }, { status: 401 })
  }

  try {
    const insertadas = await scrapeBoE()
    return Response.json({ ok: true, insertadas, ts: new Date().toISOString() })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
