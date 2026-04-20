'use client'
import { useEffect } from 'react'

export function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    fetch('/api/blog/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug, event: 'view' }),
    })
  }, [slug])
  return null
}

export function CtaLink({ slug, href, children, style }: { slug: string; href: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={style}
      onClick={() => fetch('/api/blog/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, event: 'cta_click' }),
      })}
    >
      {children}
    </a>
  )
}
