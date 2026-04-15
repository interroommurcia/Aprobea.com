/**
 * GET  /api/backoffice/leads        — Lista todos los leads
 * PATCH /api/backoffice/leads?id=.. — Actualiza estado/nota
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'

async function checkAuth() {
  const cookieStore = await cookies()
  const pass = cookieStore.get('bo_auth')?.value
  return pass === process.env.ADMIN_PASSWORD
}

export async function GET() {
  if (!await checkAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function PATCH(req: NextRequest) {
  if (!await checkAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

  const body = await req.json()
  const { estado, nota_admin } = body

  const { error } = await supabaseAdmin
    .from('leads')
    .update({ estado, nota_admin })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
