import { NextRequest, NextResponse } from 'next/server'
import { extractText } from 'unpdf'

const RC_RE = /\b(\d{7}[A-Z]{2}\d{4}[A-Z]\d{4}[A-Z]{2})\b/i

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData()
    const file = form.get('file')
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No se recibió el PDF' }, { status: 400 })
    }

    const buf = await (file as File).arrayBuffer()
    const { text } = await extractText(new Uint8Array(buf), { mergePages: true })
    const combined = Array.isArray(text) ? text.join('\n') : text

    const match = combined.match(RC_RE)
    return NextResponse.json({ rc: match ? match[1].toUpperCase() : null, text: combined.slice(0, 500) })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
