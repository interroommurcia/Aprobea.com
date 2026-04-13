import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

async function getClienteId(req: NextRequest): Promise<string | null> {
  const auth = req.headers.get('authorization')
  if (!auth) return null
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(auth.replace('Bearer ', ''))
  if (error || !user) return null
  const { data } = await supabaseAdmin.from('clientes').select('id').eq('user_id', user.id).single()
  return data?.id || null
}

// GET — list client's conversations
export async function GET(req: NextRequest) {
  const clienteId = await getClienteId(req)
  if (!clienteId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('conversaciones')
    .select('*')
    .eq('cliente_id', clienteId)
    .eq('activa', true)
    .order('ultimo_mensaje_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}
