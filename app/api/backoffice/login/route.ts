import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const { password } = await req.json()

  if (password !== process.env.ADMIN_PASSWORD) {
    return Response.json({ error: 'Contraseña incorrecta' }, { status: 401 })
  }

  const res = Response.json({ ok: true })
  // Set httpOnly cookie valid for 8 hours
  res.headers.set(
    'Set-Cookie',
    `admin_session=1; Path=/; HttpOnly; SameSite=Lax; Max-Age=28800`
  )
  return res
}
