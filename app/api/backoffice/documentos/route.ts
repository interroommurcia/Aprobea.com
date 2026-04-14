/**
 * GET  /api/backoffice/documentos  → lista documentos IA
 * DELETE /api/backoffice/documentos  → elimina por id
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_session')?.value === '1'
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('ia_documentos')
    .select('id, nombre, created_at, contenido')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = (data ?? []).map((d: any) => ({
    id: d.id,
    nombre: d.nombre,
    created_at: d.created_at,
    caracteres: d.contenido?.length ?? 0,
  }))
  return NextResponse.json(result)
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { id } = await req.json()
  const { error } = await supabaseAdmin.from('ia_documentos').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
