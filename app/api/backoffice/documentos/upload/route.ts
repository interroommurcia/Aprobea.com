/**
 * POST /api/backoffice/documentos/upload
 * Recibe un PDF (multipart/form-data), extrae el texto y lo guarda en ia_documentos
 */
import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
// @ts-ignore
import pdfParse from 'pdf-parse'

export const runtime = 'nodejs'

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_session')?.value === '1'
}

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 })
  if (!file.name.toLowerCase().endsWith('.pdf')) {
    return NextResponse.json({ error: 'Solo se permiten archivos PDF' }, { status: 400 })
  }
  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'El archivo no puede superar 10 MB' }, { status: 400 })
  }

  const buffer = Buffer.from(await file.arrayBuffer())

  let contenido: string
  try {
    const parsed = await pdfParse(buffer)
    contenido = parsed.text?.trim() ?? ''
  } catch (e: any) {
    return NextResponse.json({ error: 'No se pudo leer el PDF: ' + e.message }, { status: 422 })
  }

  if (!contenido) {
    return NextResponse.json({ error: 'El PDF no contiene texto extraíble (puede ser escaneado)' }, { status: 422 })
  }

  const { data, error } = await supabaseAdmin
    .from('ia_documentos')
    .insert({ nombre: file.name, contenido })
    .select('id, nombre, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
