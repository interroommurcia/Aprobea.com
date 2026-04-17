/**
 * GET /api/backoffice/posthog
 * Obtiene métricas de tráfico web desde PostHog via HogQL.
 * Requiere POSTHOG_PERSONAL_API_KEY y POSTHOG_PROJECT_ID en env.
 */
import { NextRequest, NextResponse } from 'next/server'

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_session')?.value === '1'
}

const PH_API   = 'https://eu.posthog.com'
const PH_KEY   = process.env.POSTHOG_PERSONAL_API_KEY ?? ''
const PH_PROJ  = process.env.POSTHOG_PROJECT_ID ?? ''

async function hogql(query: string) {
  const res = await fetch(`${PH_API}/api/projects/${PH_PROJ}/query/`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PH_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
    next: { revalidate: 300 }, // cache 5 min
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`PostHog ${res.status}: ${txt.slice(0, 200)}`)
  }
  return res.json()
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!PH_KEY || !PH_PROJ) {
    return NextResponse.json({ error: 'POSTHOG_PERSONAL_API_KEY y POSTHOG_PROJECT_ID no configurados' }, { status: 503 })
  }

  try {
    const [r7d, r30d, rTop, rDaily, rBounce] = await Promise.all([

      // Visitantes, pageviews y sesiones últimos 7 días
      hogql(`
        SELECT
          count() AS pageviews,
          uniqExact(distinct_id) AS visitors,
          uniqExact(properties.$session_id) AS sessions
        FROM events
        WHERE event = '$pageview'
          AND timestamp >= now() - INTERVAL 7 DAY
      `),

      // Visitantes y pageviews últimos 30 días
      hogql(`
        SELECT
          count() AS pageviews,
          uniqExact(distinct_id) AS visitors
        FROM events
        WHERE event = '$pageview'
          AND timestamp >= now() - INTERVAL 30 DAY
      `),

      // Top 10 páginas últimos 30 días
      hogql(`
        SELECT
          replaceRegexpOne(properties.$current_url, 'https?://[^/]+', '') AS path,
          count() AS views,
          uniqExact(distinct_id) AS uniq
        FROM events
        WHERE event = '$pageview'
          AND timestamp >= now() - INTERVAL 30 DAY
        GROUP BY path
        ORDER BY views DESC
        LIMIT 10
      `),

      // Pageviews por día últimos 30 días
      hogql(`
        SELECT
          toDate(timestamp) AS day,
          count() AS pageviews,
          uniqExact(distinct_id) AS visitors
        FROM events
        WHERE event = '$pageview'
          AND timestamp >= now() - INTERVAL 30 DAY
        GROUP BY day
        ORDER BY day ASC
      `),

      // Tasa de rebote aproximada (sesiones con solo 1 pageview)
      hogql(`
        SELECT
          countIf(total = 1) AS bounced,
          count() AS total_sessions
        FROM (
          SELECT
            properties.$session_id AS sid,
            count() AS total
          FROM events
          WHERE event = '$pageview'
            AND timestamp >= now() - INTERVAL 7 DAY
          GROUP BY sid
        )
      `),
    ])

    const s7  = r7d.results?.[0]  ?? [0, 0, 0]
    const s30 = r30d.results?.[0] ?? [0, 0]
    const sb  = rBounce.results?.[0] ?? [0, 1]

    const bounceRate = sb[1] > 0 ? Math.round((sb[0] / sb[1]) * 100) : 0

    return NextResponse.json({
      stats7d: {
        pageviews: Number(s7[0]),
        visitors:  Number(s7[1]),
        sessions:  Number(s7[2]),
      },
      stats30d: {
        pageviews: Number(s30[0]),
        visitors:  Number(s30[1]),
      },
      bounceRate,
      topPages: (rTop.results ?? []).map((r: unknown[]) => ({
        path:  String(r[0] || '/'),
        views: Number(r[1]),
        uniq:  Number(r[2]),
      })),
      dailyViews: (rDaily.results ?? []).map((r: unknown[]) => ({
        day:       String(r[0]),
        pageviews: Number(r[1]),
        visitors:  Number(r[2]),
      })),
    })
  } catch (e: any) {
    console.error('[posthog api]', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
