import { NextRequest } from 'next/server'

// Vercel Cron: ejecutar a las 06:00 cada día (configurar en vercel.json)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Scraping BOE estatal
    const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/backoffice/boe`, {
      method: 'POST',
      headers: { 'Cookie': 'admin_session=1' },
    })
    const data = await res.json()
    return Response.json({ ok: true, insertadas: data.insertadas ?? 0 })
  } catch (err: any) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
