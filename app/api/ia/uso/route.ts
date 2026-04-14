/**
 * GET /api/ia/uso
 * Devuelve el gasto IA del cliente en el período actual.
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createClient } from '@supabase/supabase-js'

const LIMITES: Record<string, { importe: number; periodo: 'dia' | 'semana' }> = {
  crowdfunding: { importe: 0.10, periodo: 'dia' },
  npl:          { importe: 1.00, periodo: 'semana' },
  hipotecario:  { importe: 0.10, periodo: 'dia' },
}

function fechaDesde(periodo: 'dia' | 'semana'): string {
  const ahora = new Date()
  if (periodo === 'dia') return ahora.toISOString().slice(0, 10)
  const diaSemana = ahora.getDay() === 0 ? 6 : ahora.getDay() - 1
  const lunes = new Date(ahora)
  lunes.setDate(ahora.getDate() - diaSemana)
  return lunes.toISOString().slice(0, 10)
}

export async function GET(req: NextRequest) {
  const token = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const supabaseUser = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Token inválido' }, { status: 401 })

  const { data: cliente } = await supabaseAdmin
    .from('clientes')
    .select('id, tipo_inversor')
    .eq('user_id', user.id)
    .single()
  if (!cliente) return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })

  const limiteConfig = LIMITES[cliente.tipo_inversor] ?? LIMITES.crowdfunding
  const desde = fechaDesde(limiteConfig.periodo)

  const { data: usos } = await supabaseAdmin
    .from('ia_uso_clientes')
    .select('coste_eur')
    .eq('cliente_id', cliente.id)
    .gte('fecha', desde)

  const gastoActual = (usos ?? []).reduce((s, r: any) => s + (r.coste_eur ?? 0), 0)

  return NextResponse.json({
    gasto: gastoActual,
    limite: limiteConfig.importe,
    periodo: limiteConfig.periodo,
    modoGratuito: gastoActual >= limiteConfig.importe,
    tipo_inversor: cliente.tipo_inversor,
  })
}
