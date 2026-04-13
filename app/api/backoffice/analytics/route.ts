import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { cookies } from 'next/headers'

export async function GET() {
  // Auth check
  const cookieStore = await cookies()
  if (cookieStore.get('admin_session')?.value !== '1') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [
    { data: clientes },
    { data: parts },
    { count: msgCount },
    { count: convCount },
  ] = await Promise.all([
    supabaseAdmin.from('clientes').select('id, estado, capital_inicial, created_at'),
    supabaseAdmin.from('participaciones').select('id, estado, tipo, importe, rentabilidad_anual, created_at'),
    supabaseAdmin.from('mensajes').select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    supabaseAdmin.from('conversaciones').select('id', { count: 'exact', head: true }).eq('estado', 'activa'),
  ])

  const cl = clientes ?? []
  const pt = parts ?? []

  const aum = pt.filter((p: any) => p.estado === 'activa').reduce((s: number, p: any) => s + (p.importe ?? 0), 0)
  const rentMedia = pt.length ? pt.reduce((s: number, p: any) => s + (p.rentabilidad_anual ?? 0), 0) / pt.length : 0
  const capMedio = cl.length ? cl.reduce((s: number, c: any) => s + (c.capital_inicial ?? 0), 0) / cl.length : 0

  // Serie últimos 6 meses
  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5 - i))
    return { key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, label: d.toLocaleString('es-ES', { month: 'short' }) }
  })

  const serieClientes = meses.map(m => ({
    label: m.label,
    valor: cl.filter((c: any) => c.created_at?.startsWith(m.key)).length,
  }))

  const serieCapital = meses.map(m => ({
    label: m.label,
    valor: pt.filter((p: any) => p.created_at?.startsWith(m.key)).reduce((s: number, p: any) => s + (p.importe ?? 0), 0),
  }))

  const tipos: Record<string, number> = {}
  pt.forEach((p: any) => { tipos[p.tipo] = (tipos[p.tipo] ?? 0) + (p.importe ?? 0) })
  const distribTipo = Object.entries(tipos).map(([name, value]) => ({ name: name.toUpperCase(), value: Math.round(value as number) }))

  const estados: Record<string, number> = {}
  cl.forEach((c: any) => { estados[c.estado] = (estados[c.estado] ?? 0) + 1 })
  const distribEstado = Object.entries(estados).map(([name, value]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), value }))

  return NextResponse.json({
    kpi: {
      aum,
      totalClientes: cl.length,
      clientesActivos: cl.filter((c: any) => c.estado === 'activo').length,
      clientesLeads: cl.filter((c: any) => c.estado === 'lead').length,
      totalParticipaciones: pt.length,
      participacionesActivas: pt.filter((p: any) => p.estado === 'activa').length,
      rentabilidadMedia: Math.round(rentMedia * 10) / 10,
      capitalMedio: Math.round(capMedio),
      mensajesSemana: msgCount ?? 0,
      conversacionesActivas: convCount ?? 0,
    },
    serieClientes,
    serieCapital,
    distribTipo,
    distribEstado,
  })
}
