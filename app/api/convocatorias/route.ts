import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const revalidate = 300 // 5 min cache

export async function GET(req: NextRequest) {
  const supabase = await createServiceClient()
  const { searchParams } = new URL(req.url)
  const limit = parseInt(searchParams.get('limit') ?? '6')
  const categoria = searchParams.get('categoria')
  const boletin = searchParams.get('boletin')

  let query = supabase
    .from('convocatorias')
    .select('id, titulo, categoria, num_plazas, fecha_limite, boletin_referencia, url_boletin, organismo_nombre, enlace_bases, created_at')
    .eq('estado', 'activa')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (categoria) query = query.eq('categoria', categoria)
  if (boletin) query = query.eq('boletin_referencia', boletin)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data ?? [], {
    headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=60' },
  })
}
