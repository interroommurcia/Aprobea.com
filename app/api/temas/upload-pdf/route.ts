import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
// @ts-ignore
import pdfParse from 'pdf-parse'

export async function POST(req: NextRequest) {
  const supabase = await createServiceClient()

  // Auth check
  const authHeader = req.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  if (!token) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('file') as File
  const titulo = formData.get('titulo') as string
  const categoria = formData.get('categoria') as string
  const convocatoria_id = formData.get('convocatoria_id') as string | null

  if (!file || !titulo) {
    return NextResponse.json({ error: 'Faltan campos: file y titulo' }, { status: 400 })
  }

  if (file.type !== 'application/pdf') {
    return NextResponse.json({ error: 'Solo se admiten archivos PDF' }, { status: 400 })
  }

  // Extraer texto del PDF
  const buffer = Buffer.from(await file.arrayBuffer())
  let textoExtraido = ''
  try {
    const parsed = await pdfParse(buffer)
    textoExtraido = parsed.text
  } catch {
    return NextResponse.json({ error: 'No se pudo leer el PDF' }, { status: 422 })
  }

  if (textoExtraido.trim().length < 100) {
    return NextResponse.json({ error: 'El PDF parece estar vacío o escaneado sin OCR' }, { status: 422 })
  }

  // Guardar PDF en Supabase Storage
  const fileName = `temas/${Date.now()}_${file.name.replace(/\s/g, '_')}`
  await supabase.storage.from('documentos').upload(fileName, buffer, {
    contentType: 'application/pdf',
    upsert: false,
  })

  // Crear tema en DB
  const { data: tema, error: temaError } = await supabase
    .from('temas')
    .insert({
      titulo,
      contenido_texto: textoExtraido,
      categoria: categoria || null,
      convocatoria_id: convocatoria_id || null,
    })
    .select('id, titulo')
    .single()

  if (temaError || !tema) {
    return NextResponse.json({ error: 'Error guardando tema' }, { status: 500 })
  }

  // Disparar ingestión automática (chunks + preguntas + flashcards)
  const ingestUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/temas/ingestar`
  fetch(ingestUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-cron-secret': process.env.CRON_SECRET ?? 'dev',
    },
    body: JSON.stringify({ tema_id: tema.id }),
  }).catch(() => {}) // fire & forget

  return NextResponse.json({
    ok: true,
    tema_id: tema.id,
    titulo: tema.titulo,
    caracteres: textoExtraido.length,
    mensaje: 'PDF subido. Generando preguntas y flashcards en segundo plano...',
  })
}
