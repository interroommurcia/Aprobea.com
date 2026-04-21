import { createClient } from '@supabase/supabase-js'

// Safe lazy singleton — does NOT throw at build time when env vars are absent
function buildAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  // Return a no-op proxy during build (url/key will be set at runtime)
  if (!url || !key) return null as any
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

let _admin: ReturnType<typeof createClient> | null = null

export function getSupabaseAdmin() {
  if (!_admin) _admin = buildAdmin()
  return _admin
}

// Direct named export — calls lazy getter on first property access
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabaseAdmin: any = new Proxy(
  {} as ReturnType<typeof createClient>,
  { get(_t, prop) { const c = getSupabaseAdmin(); return c ? (c as any)[prop]?.bind?.(c) ?? (c as any)[prop] : undefined } }
)
