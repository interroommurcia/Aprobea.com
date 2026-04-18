import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

// Public endpoint — authenticated users fetch active operations with ticket progress
export async function GET(_req: NextRequest) {
  const { data, error } = await supabaseAdmin
    .from('operaciones_estudiadas')
    .select('id, titulo, descripcion, tipo, pdf_url, pdf_nombre, created_at, tickets_total, tickets_por_participante, importe_objetivo, referencia_catastral, municipio, provincia, valor_mercado, precio_compra, comision, rentabilidad, ticket_minimo, superficie, tipo_propiedad, imagen_principal, publico, estado_operacion, fase_hipotecaria, participaciones(id, estado, operacion_id)')
    .eq('activa', true)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const ops = (data ?? []).map((op: any) => {
    const parts = (op.participaciones ?? []) as { id: string; estado: string; operacion_id: string | null }[]
    const tickets_vendidos = parts.filter(p =>
      p.operacion_id === op.id && ['activa', 'pendiente'].includes(p.estado)
    ).length
    const { participaciones: _, ...rest } = op
    return { ...rest, tickets_vendidos }
  })

  return NextResponse.json(ops)
}
