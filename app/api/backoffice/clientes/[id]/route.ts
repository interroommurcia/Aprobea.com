import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_session')?.value === '1'
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params

  // Fetch cliente
  const { data: cliente, error } = await supabaseAdmin
    .from('clientes')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !cliente) return NextResponse.json({ error: 'No encontrado' }, { status: 404 })

  // Fetch auth user info if linked
  let authUser = null
  if (cliente.user_id) {
    const { data } = await supabaseAdmin.auth.admin.getUserById(cliente.user_id)
    if (data?.user) {
      authUser = {
        created_at: data.user.created_at,
        last_sign_in_at: data.user.last_sign_in_at,
        email_confirmed_at: data.user.email_confirmed_at,
        phone: data.user.phone ?? null,
        app_metadata: data.user.app_metadata,
        user_metadata: data.user.user_metadata,
      }
    }
  }

  return NextResponse.json({ ...cliente, authUser })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const body = await req.json()

  const { data, error } = await supabaseAdmin
    .from('clientes')
    .update(body)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
