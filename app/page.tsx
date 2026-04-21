import type { Metadata } from 'next'
import HomeClient from './HomeClient'

export const metadata: Metadata = {
  title: 'Aprobea — Plataforma IA para oposiciones nacionales, regionales y locales',
  description:
    'Prepara tus oposiciones con IA. Tests adaptativos nacionales y regionales, BOE Radar 24/7, tutor personalizado con memoria y plan de estudio a medida. Oposiciones AGE, CCAA, Ayuntamientos y más. Empieza gratis, sin tarjeta.',
  keywords: [
    'oposiciones', 'tests oposiciones', 'tests nacionales', 'tests regionales',
    'BOE', 'preparar oposiciones IA', 'exámenes oposiciones', 'simulacros oposiciones',
    'oposiciones ayuntamiento', 'oposiciones CCAA', 'oposiciones AGE',
    'auxiliar administrativo', 'administrativo general', 'aprobea',
  ],
  openGraph: {
    title: 'Aprobea — La plataforma IA para oposiciones en España',
    description:
      'Tests nacionales y regionales generados con IA. BOE Radar en tiempo real, exámenes adaptativos IRT y tutor personalizado. 20 preguntas gratis al día.',
    type: 'website',
    url: 'https://aprobea.com',
    images: [{ url: 'https://aprobea.com/logo.svg', width: 680, height: 320, alt: 'Logo Aprobea' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aprobea — IA para oposiciones nacionales y regionales',
    description: 'Tests adaptativos, BOE Radar y tutor IA. Empieza gratis.',
    images: ['https://aprobea.com/logo.svg'],
  },
  icons: {
    icon: [{ url: '/favicon.svg', type: 'image/svg+xml' }, { url: '/logo.png', type: 'image/png' }],
    apple: '/logo.png',
    shortcut: '/favicon.svg',
  },
  alternates: {
    canonical: 'https://aprobea.com',
  },
}

export default function HomePage() {
  return <HomeClient />
}
