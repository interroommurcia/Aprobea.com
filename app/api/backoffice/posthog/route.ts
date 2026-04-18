/**
 * GET /api/backoffice/posthog
 * Métricas de tráfico web desde PostHog via HogQL.
 * Requiere POSTHOG_PERSONAL_API_KEY y POSTHOG_PROJECT_ID en env.
 */
import { NextRequest, NextResponse } from 'next/server'

function isAdmin(req: NextRequest) {
  return req.cookies.get('admin_session')?.value === '1'
}

const PH_API  = 'https://eu.posthog.com'
const PH_KEY  = process.env.POSTHOG_PERSONAL_API_KEY ?? ''
const PH_PROJ = process.env.POSTHOG_PROJECT_ID ?? ''

async function hogql(query: string) {
  const res = await fetch(`${PH_API}/api/projects/${PH_PROJ}/query/`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PH_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query } }),
    cache: 'no-store',
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`PostHog ${res.status}: ${txt.slice(0, 300)}`)
  }
  return res.json()
}

export async function GET(req: NextRequest) {
  if (!isAdmin(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!PH_KEY || !PH_PROJ) {
    return NextResponse.json({ error: 'POSTHOG_PERSONAL_API_KEY y POSTHOG_PROJECT_ID no configurados' }, { status: 503 })
  }

  try {
    const [r7d, r30d, rTop, rDaily, rBounce, rSources, rDevices, rEntry, rUtm, rCountries, rRealtime, rLogins, rLoginsByDay, rClicks, rUsers] = await Promise.all([

      // Stats 7 días
      hogql(`
        SELECT
          count() AS pageviews,
          uniqExact(distinct_id) AS visitors,
          uniqExact(properties.$session_id) AS sessions
        FROM events
        WHERE event = '$pageview'
          AND timestamp >= now() - INTERVAL 7 DAY
      `),

      // Stats 30 días
      hogql(`
        SELECT
          count() AS pageviews,
          uniqExact(distinct_id) AS visitors
        FROM events
        WHERE event = '$pageview'
          AND timestamp >= now() - INTERVAL 30 DAY
      `),

      // Top 10 páginas (30d)
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

      // Pageviews por día (30d)
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

      // Tasa de rebote (7d)
      hogql(`
        SELECT
          countIf(total = 1) AS bounced,
          count() AS total_sessions
        FROM (
          SELECT properties.$session_id AS sid, count() AS total
          FROM events
          WHERE event = '$pageview'
            AND timestamp >= now() - INTERVAL 7 DAY
          GROUP BY sid
        )
      `),

      // Fuentes de tráfico — referrer domain (30d)
      hogql(`
        SELECT
          if(
            properties.$referring_domain IS NULL OR properties.$referring_domain = '',
            '(directo)',
            properties.$referring_domain
          ) AS source,
          count() AS visits,
          uniqExact(distinct_id) AS visitors
        FROM events
        WHERE event = '$pageview'
          AND timestamp >= now() - INTERVAL 30 DAY
        GROUP BY source
        ORDER BY visits DESC
        LIMIT 15
      `),

      // Dispositivos (30d)
      hogql(`
        SELECT
          if(
            properties.$device_type IS NULL OR properties.$device_type = '',
            'Unknown',
            properties.$device_type
          ) AS device,
          count() AS visits,
          uniqExact(distinct_id) AS visitors
        FROM events
        WHERE event = '$pageview'
          AND timestamp >= now() - INTERVAL 30 DAY
        GROUP BY device
        ORDER BY visits DESC
      `),

      // Páginas de entrada (primera página de la sesión) (30d)
      hogql(`
        SELECT
          replaceRegexpOne(first_url, 'https?://[^/]+', '') AS entry_path,
          count() AS sessions
        FROM (
          SELECT
            properties.$session_id AS sid,
            argMin(properties.$current_url, timestamp) AS first_url
          FROM events
          WHERE event = '$pageview'
            AND timestamp >= now() - INTERVAL 30 DAY
          GROUP BY sid
        )
        GROUP BY entry_path
        ORDER BY sessions DESC
        LIMIT 8
      `),

      // UTM sources (30d)
      hogql(`
        SELECT
          if(properties.utm_source IS NULL OR properties.utm_source = '', '(sin UTM)', properties.utm_source) AS utm_source,
          if(properties.utm_medium IS NULL OR properties.utm_medium = '', '', properties.utm_medium) AS utm_medium,
          count() AS visits,
          uniqExact(distinct_id) AS visitors
        FROM events
        WHERE event = '$pageview'
          AND timestamp >= now() - INTERVAL 30 DAY
        GROUP BY utm_source, utm_medium
        ORDER BY visits DESC
        LIMIT 12
      `),

      // Países (30d)
      hogql(`
        SELECT
          if(
            properties.$geoip_country_name IS NULL OR properties.$geoip_country_name = '',
            'Unknown',
            properties.$geoip_country_name
          ) AS country,
          count() AS visits,
          uniqExact(distinct_id) AS visitors
        FROM events
        WHERE event = '$pageview'
          AND timestamp >= now() - INTERVAL 30 DAY
        GROUP BY country
        ORDER BY visits DESC
        LIMIT 10
      `),

      // Usuarios activos ahora (últimos 5 min)
      hogql(`
        SELECT
          replaceRegexpOne(properties.$current_url, 'https?://[^/]+', '') AS path,
          uniqExact(distinct_id) AS active_users
        FROM events
        WHERE timestamp >= now() - INTERVAL 5 MINUTE
        GROUP BY path
        ORDER BY active_users DESC
        LIMIT 10
      `),

      // Inicios de sesión — primera visita al /dashboard por sesión (30d)
      hogql(`
        SELECT count() AS logins, uniqExact(distinct_id) AS unique_users
        FROM (
          SELECT distinct_id, properties.$session_id
          FROM events
          WHERE event = '$pageview'
            AND properties.$current_url LIKE '%/dashboard%'
            AND timestamp >= now() - INTERVAL 30 DAY
          GROUP BY distinct_id, properties.$session_id
        )
      `),

      // Logins por día (30d)
      hogql(`
        SELECT toDate(min_ts) AS day, count() AS logins
        FROM (
          SELECT distinct_id, properties.$session_id, min(timestamp) AS min_ts
          FROM events
          WHERE event = '$pageview'
            AND properties.$current_url LIKE '%/dashboard%'
            AND timestamp >= now() - INTERVAL 30 DAY
          GROUP BY distinct_id, properties.$session_id
        )
        GROUP BY day
        ORDER BY day ASC
      `),

      // Clicks en landing/público — autocapture (30d)
      hogql(`
        SELECT
          coalesce(nullIf(trim(properties.$el_text), ''), '[sin texto]') AS element,
          count() AS clicks,
          uniqExact(distinct_id) AS unique_users
        FROM events
        WHERE event = '$autocapture'
          AND properties.$event_type = 'click'
          AND properties.$current_url NOT LIKE '%/backoffice%'
          AND properties.$current_url NOT LIKE '%/dashboard%'
          AND timestamp >= now() - INTERVAL 30 DAY
        GROUP BY element
        HAVING element != '[sin texto]'
        ORDER BY clicks DESC
        LIMIT 15
      `),

      // Actividad por usuario — top 20 por sesiones (30d)
      hogql(`
        SELECT
          distinct_id,
          uniqExact(properties.$session_id) AS sessions,
          count() AS pageviews,
          argMax(
            if(properties.$referring_domain IS NULL OR properties.$referring_domain = '',
               '(directo)', properties.$referring_domain),
            timestamp
          ) AS last_source
        FROM events
        WHERE event = '$pageview'
          AND timestamp >= now() - INTERVAL 30 DAY
        GROUP BY distinct_id
        ORDER BY sessions DESC
        LIMIT 20
      `),
    ])

    const s7  = r7d.results?.[0]  ?? [0, 0, 0]
    const s30 = r30d.results?.[0] ?? [0, 0]
    const sb  = rBounce.results?.[0] ?? [0, 1]

    return NextResponse.json({
      stats7d:  { pageviews: Number(s7[0]),  visitors: Number(s7[1]),  sessions: Number(s7[2]) },
      stats30d: { pageviews: Number(s30[0]), visitors: Number(s30[1]) },
      bounceRate: sb[1] > 0 ? Math.round((Number(sb[0]) / Number(sb[1])) * 100) : 0,
      topPages: (rTop.results ?? []).map((r: unknown[]) => ({
        path: String(r[0] || '/'), views: Number(r[1]), uniq: Number(r[2]),
      })),
      dailyViews: (rDaily.results ?? []).map((r: unknown[]) => ({
        day: String(r[0]), pageviews: Number(r[1]), visitors: Number(r[2]),
      })),
      sources: (rSources.results ?? []).map((r: unknown[]) => ({
        source: String(r[0]), visits: Number(r[1]), visitors: Number(r[2]),
      })),
      devices: (rDevices.results ?? []).map((r: unknown[]) => ({
        device: String(r[0]), visits: Number(r[1]), visitors: Number(r[2]),
      })),
      entryPages: (rEntry.results ?? []).map((r: unknown[]) => ({
        path: String(r[0] || '/'), sessions: Number(r[1]),
      })),
      utmSources: (rUtm.results ?? []).map((r: unknown[]) => ({
        source: String(r[0]), medium: String(r[1]), visits: Number(r[2]), visitors: Number(r[3]),
      })),
      countries: (rCountries.results ?? []).map((r: unknown[]) => ({
        country: String(r[0]), visits: Number(r[1]), visitors: Number(r[2]),
      })),
      realtime: (rRealtime.results ?? []).map((r: unknown[]) => ({
        path: String(r[0] || '/'), active: Number(r[1]),
      })),
      logins: {
        total:  Number(rLogins.results?.[0]?.[0] ?? 0),
        unique: Number(rLogins.results?.[0]?.[1] ?? 0),
      },
      loginsByDay: (rLoginsByDay.results ?? []).map((r: unknown[]) => ({
        day: String(r[0]), count: Number(r[1]),
      })),
      clicks: (rClicks.results ?? []).map((r: unknown[]) => ({
        element: String(r[0]), clicks: Number(r[1]), users: Number(r[2]),
      })),
      userActivity: (rUsers.results ?? []).map((r: unknown[]) => ({
        id: String(r[0]), sessions: Number(r[1]), pageviews: Number(r[2]), source: String(r[3]),
      })),
    })
  } catch (e: any) {
    console.error('[posthog api]', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
