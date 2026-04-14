import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_session')?.value === '1'
}

const DEFAULTS: Record<string, string> = {
  precio_suscripcion_anual:         '29',
  precio_reserva_npl:               '1000',
  precio_reserva_crowdfunding:      '100',
  precio_membresia_crowdfunding:    '60',
  pagos_activos:                    'false',
  ia_protocolo:                     `Eres el asistente virtual de GrupoSkyLine Investment, una firma española especializada en inversión NPL (Non-Performing Loans) y crowdfunding inmobiliario.\n\nTONO: Profesional, cercano y conciso. Responde siempre en el idioma del cliente.\n\nINFORMACIÓN CLAVE:\n- Inversión NPL: mínimo 80.000€, requiere justificante de previsión de fondos, acceso por invitación, sin cuota de membresía\n- Crowdfunding inmobiliario: mínimo 5.000€, membresía anual 60€ + IVA (concepto: consigna de documento y capital)\n- Web: gruposkyline.org\n- Contacto: hola@gruposkyline.org\n\nREGLAS:\n1. Si preguntan por rentabilidades concretas, di que depende de cada operación y que un asesor les informará\n2. Si quieren reunión o más info, redirige a hola@gruposkyline.org o al botón "Acceder" de la web\n3. No inventes datos, operaciones ni precios que no estén en los protocolos\n4. Si no puedes resolver la duda, ofrece escalar al equipo humano\n5. Respuestas cortas y directas — máximo 3-4 frases por respuesta`,
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('configuracion')
    .select('key, value')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Merge con defaults para que siempre existan todas las claves
  const result = { ...DEFAULTS }
  for (const row of data ?? []) result[row.key] = row.value

  return NextResponse.json(result)
}

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json() as Record<string, string>

  // Upsert cada key-value
  const rows = Object.entries(body).map(([key, value]) => ({ key, value: String(value) }))

  const { error } = await supabaseAdmin
    .from('configuracion')
    .upsert(rows, { onConflict: 'key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
