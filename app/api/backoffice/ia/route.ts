import { NextRequest } from 'next/server'
import { supabaseAdmin as sb } from '@/lib/supabase-admin'

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_session')?.value === '1'
}

// GET: obtener documentos IA + stats de uso
export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const mesInicio = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [{ data: docs }, { data: uso }] = await Promise.all([
    sb.from('ia_documentos').select('id,nombre,created_at').order('created_at', { ascending: false }),
    sb.from('ia_uso').select('modelo,tokens_in,tokens_out,coste_eur,cache_hit').gte('created_at', mesInicio),
  ])

  const stats = {
    total_llamadas: uso?.length ?? 0,
    coste_mes: (uso ?? []).reduce((s: number, r: any) => s + (r.coste_eur ?? 0), 0),
    cache_hits: (uso ?? []).filter((r: any) => r.cache_hit).length,
    tokens_in: (uso ?? []).reduce((s: number, r: any) => s + (r.tokens_in ?? 0), 0),
    tokens_out: (uso ?? []).reduce((s: number, r: any) => s + (r.tokens_out ?? 0), 0),
    por_modelo: Object.fromEntries(
      [...new Set((uso ?? []).map((r: any) => r.modelo))].map(modelo => [
        modelo,
        {
          llamadas: (uso ?? []).filter((r: any) => r.modelo === modelo).length,
          coste: (uso ?? []).filter((r: any) => r.modelo === modelo).reduce((s: number, r: any) => s + (r.coste_eur ?? 0), 0),
        }
      ])
    ),
  }

  return Response.json({ documentos: docs ?? [], stats })
}

// POST: crear documento IA
export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const { nombre, contenido } = await req.json()
  if (!nombre || !contenido) return Response.json({ error: 'nombre y contenido requeridos' }, { status: 400 })

  const { data, error } = await sb.from('ia_documentos').insert({ nombre, contenido }).select().single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json(data, { status: 201 })
}

// DELETE: eliminar documento IA
export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return Response.json({ error: 'No autorizado' }, { status: 401 })

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return Response.json({ error: 'id requerido' }, { status: 400 })

  const { error } = await sb.from('ia_documentos').delete().eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
