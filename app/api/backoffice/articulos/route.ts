import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_session')?.value === '1'
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { data, error } = await supabaseAdmin
    .from('articulos')
    .select('id, slug, meta_title, h1, keyword, estado, created_at, hero_image_thumb')
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const body = await req.json()
  const { slug, meta_title, meta_description, h1, intro, sections, cta, faq,
          hero_image, hero_image_thumb, hero_image_credit, hero_image_credit_url,
          hero_image_query, keyword } = body

  if (!slug || !h1) return NextResponse.json({ error: 'slug y h1 requeridos' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('articulos')
    .upsert({
      slug, meta_title, meta_description, h1, intro,
      sections: sections ?? [], cta,
      faq: faq ?? [],
      hero_image, hero_image_thumb, hero_image_credit,
      hero_image_credit_url, hero_image_query, keyword,
      estado: 'borrador',
      updated_at: new Date().toISOString(),
    }, { onConflict: 'slug' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id, estado } = await req.json()
  if (!id || !estado) return NextResponse.json({ error: 'id y estado requeridos' }, { status: 400 })

  const { data, error } = await supabaseAdmin
    .from('articulos')
    .update({ estado, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await req.json()
  const { error } = await supabaseAdmin.from('articulos').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
