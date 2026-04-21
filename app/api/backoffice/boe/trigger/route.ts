import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('plan').eq('id', user.id).single()

  const admins = (process.env.ADMIN_EMAILS ?? '').split(',')
  const isAdmin = profile?.plan === 'academia' || admins.includes(user.email ?? '')
  if (!isAdmin) return NextResponse.json({ error: 'No autorizado' }, { status: 403 })

  // Llamar al monitor internamente con el secret
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3001'
  const res = await fetch(`${base}/api/boe/monitor`, {
    method: 'POST',
    headers: { 'x-cron-secret': process.env.CRON_SECRET ?? '' },
  })
  const data = await res.json()
  return NextResponse.json(data)
}
