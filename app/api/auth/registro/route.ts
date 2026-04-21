import { NextRequest } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabase-admin'

export async function POST(req: NextRequest) {
  const { nombre, email, password, oposicion } = await req.json()

  if (!email || !password || password.length < 8) {
    return Response.json({ error: 'Email y contraseña (mín. 8 caracteres) requeridos' }, { status: 400 })
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email, password, email_confirm: false,
  })
  if (authError) return Response.json({ error: authError.message }, { status: 400 })

  const uid = authData.user.id
  await supabase.from('perfiles').upsert({
    id: uid, email, nombre: nombre ?? email.split('@')[0],
    plan: 'free', plan_activo: true,
  })

  if (oposicion) {
    const { data: ops } = await supabase.from('oposiciones').select('id').ilike('nombre', `%${oposicion}%`).limit(1)
    if (ops?.[0]) {
      await supabase.from('suscripciones_oposicion').upsert({ user_id: uid, oposicion_id: ops[0].id })
    }
  }

  return Response.json({ ok: true, user_id: uid })
}
