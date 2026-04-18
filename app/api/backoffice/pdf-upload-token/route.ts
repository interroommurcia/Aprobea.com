import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_session')?.value === '1'
}

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { filename } = await req.json()
  if (!filename) return NextResponse.json({ error: 'filename required' }, { status: 400 })

  const path = `${Date.now()}-${filename.replace(/\s+/g, '_')}`

  const { data, error } = await supabaseAdmin.storage
    .from('operaciones-pdf')
    .createSignedUploadUrl(path)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: urlData } = supabaseAdmin.storage
    .from('operaciones-pdf')
    .getPublicUrl(path)

  return NextResponse.json({ token: data.token, path: data.path, publicUrl: urlData.publicUrl })
}
