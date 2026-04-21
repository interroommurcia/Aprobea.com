import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

const PROTECTED = ['/dashboard', '/backoffice']

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return req.cookies.getAll() },
        setAll(cs) { cs.forEach(({ name, value, options }) => res.cookies.set(name, value, options)) },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const path = req.nextUrl.pathname

  // Rutas protegidas → redirigir al login
  if (PROTECTED.some(p => path.startsWith(p)) && !user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Backoffice solo para admins (perfil con plan='academia' o email en whitelist)
  if (path.startsWith('/backoffice') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan')
      .eq('id', user.id)
      .single()

    if (profile?.plan !== 'academia' && !isAdmin(user.email)) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
  }

  return res
}

function isAdmin(email?: string | null) {
  const admins = (process.env.ADMIN_EMAILS ?? '').split(',')
  return admins.includes(email ?? '')
}

export const config = { matcher: ['/dashboard/:path*', '/backoffice/:path*'] }
