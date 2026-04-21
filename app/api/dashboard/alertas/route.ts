import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { categorias, comunidades, email_activo } = await req.json()

  const { data: existing } = await supabase
    .from('alertas_usuario')
    .select('id')
    .eq('user_id', user.id)
    .single()

  if (existing) {
    await supabase
      .from('alertas_usuario')
      .update({ categorias, comunidades, email_activo })
      .eq('user_id', user.id)
  } else {
    await supabase
      .from('alertas_usuario')
      .insert({ user_id: user.id, categorias, comunidades, email_activo })
  }

  return NextResponse.json({ ok: true })
}
