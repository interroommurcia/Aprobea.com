/**
 * GET    /api/backoffice/base-clientes  → lista todos los contactos
 * POST   /api/backoffice/base-clientes  → importa Excel (reemplaza o añade)
 * PATCH  /api/backoffice/base-clientes  → edita un contacto
 * DELETE /api/backoffice/base-clientes  → elimina uno o todos
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import * as XLSX from 'xlsx'

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_session')?.value === '1'
}

// Encuentra el valor de una columna por múltiples nombres posibles
function getField(row: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const found = Object.keys(row).find(
      (k) => k.toLowerCase().replace(/[^a-záéíóúñ]/g, '') === key.toLowerCase().replace(/[^a-záéíóúñ]/g, '')
    )
    if (found && row[found] !== '' && row[found] != null) return String(row[found]).trim()
  }
  return null
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(req.url)
  const search = url.searchParams.get('q')

  let query = supabaseAdmin
    .from('base_clientes_excel')
    .select('*')
    .order('created_at', { ascending: false })

  if (search) {
    const q = `%${search}%`
    query = query.or(
      `nombre.ilike.${q},apellidos.ilike.${q},email.ilike.${q},telefono.ilike.${q},empresa.ilike.${q}`
    )
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await req.formData()
  const file = form.get('excel') as File | null
  const replace = form.get('replace') === 'true'

  if (!file) return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 })

  const bytes = await file.arrayBuffer()
  const workbook = XLSX.read(bytes, { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' }) as Record<string, unknown>[]

  if (rows.length === 0) return NextResponse.json({ error: 'El archivo está vacío' }, { status: 400 })

  const mapped = rows.map((row) => ({
    nombre:    getField(row, 'nombre', 'name', 'firstname', 'primernombre'),
    apellidos: getField(row, 'apellidos', 'apellido', 'surname', 'lastname', 'segundonombre'),
    email:     getField(row, 'email', 'correo', 'mail', 'email1'),
    telefono:  getField(row, 'telefono', 'teléfono', 'phone', 'móvil', 'movil', 'tel', 'celular'),
    empresa:   getField(row, 'empresa', 'company', 'compania', 'sociedad', 'organizacion'),
    ciudad:    getField(row, 'ciudad', 'city', 'localidad', 'poblacion', 'municipio'),
    notas:     getField(row, 'notas', 'notes', 'observaciones', 'comentarios', 'descripcion'),
    datos_extra: row,
  }))

  if (replace) {
    // Borrar todo antes de insertar
    await supabaseAdmin
      .from('base_clientes_excel')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
  }

  const { error } = await supabaseAdmin.from('base_clientes_excel').insert(mapped)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, count: mapped.length, hoja: sheetName })
}

export async function PATCH(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, ...updates } = await req.json()
  if (!id) return NextResponse.json({ error: 'Falta id' }, { status: 400 })

  const { error } = await supabaseAdmin
    .from('base_clientes_excel')
    .update(updates)
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id, todos } = await req.json()

  if (todos) {
    await supabaseAdmin
      .from('base_clientes_excel')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')
  } else if (id) {
    await supabaseAdmin.from('base_clientes_excel').delete().eq('id', id)
  }

  return NextResponse.json({ ok: true })
}
