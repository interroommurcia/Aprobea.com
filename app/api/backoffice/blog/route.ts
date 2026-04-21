import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function adminGuard(supabase: Awaited<ReturnType<typeof createClient>>, email: string | undefined) {
  const admins = (process.env.ADMIN_EMAILS ?? 'aprobe.com@gmail.com').split(',').map(e => e.trim())
  return admins.includes(email ?? '')
}

export async function GET() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('blog_posts')
    .select('id, titulo, slug, categoria, publicado, vistas, created_at')
    .order('created_at', { ascending: false })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !await adminGuard(supabase, user.email)) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json()
  const slug = body.slug || body.titulo?.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || `post-${Date.now()}`

  const { data, error } = await supabase
    .from('blog_posts')
    .insert({
      titulo: body.titulo,
      slug,
      contenido: body.contenido ?? null,
      resumen: body.resumen ?? null,
      imagen_url: body.imagen_url ?? null,
      categoria: body.categoria ?? null,
      tags: body.tags ?? [],
      publicado: body.publicado ?? false,
      meta_title: body.meta_title ?? null,
      meta_desc: body.meta_desc ?? null,
      autor_id: user.id,
      publicado_at: body.publicado ? new Date().toISOString() : null,
    })
    .select('id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
