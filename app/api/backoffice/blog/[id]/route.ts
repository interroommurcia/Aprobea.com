import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  }
  if (body.titulo !== undefined) updates.titulo = body.titulo
  if (body.slug !== undefined) updates.slug = body.slug
  if (body.contenido !== undefined) updates.contenido = body.contenido
  if (body.resumen !== undefined) updates.resumen = body.resumen
  if (body.imagen_url !== undefined) updates.imagen_url = body.imagen_url
  if (body.categoria !== undefined) updates.categoria = body.categoria
  if (body.tags !== undefined) updates.tags = body.tags
  if (body.meta_title !== undefined) updates.meta_title = body.meta_title
  if (body.meta_desc !== undefined) updates.meta_desc = body.meta_desc
  if (body.publicado !== undefined) {
    updates.publicado = body.publicado
    if (body.publicado) updates.publicado_at = new Date().toISOString()
  }

  const { error } = await supabase.from('blog_posts').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { error } = await supabase.from('blog_posts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
