import { NextRequest } from 'next/server'

const ADMIN_EMAIL    = process.env.ADMIN_EMAIL    ?? 'interroommurcia@gmail.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'KikeMiguelo3'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()

  if (email !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
    return Response.json({ error: 'Credenciales incorrectas' }, { status: 401 })
  }

  const res = Response.json({ ok: true })
  res.headers.set('Set-Cookie', `admin_session=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800`)
  return res
}
