import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json()
  const updates: Record<string, unknown> = {}
  if (body.estado) updates.estado = body.estado
  if (body.resolucion) updates.resolucion = body.resolucion
  if (body.prioridad) updates.prioridad = body.prioridad
  if (body.estado === 'resuelto') updates.resuelto_at = new Date().toISOString()

  const { error } = await supabase.from('tickets').update(updates).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
