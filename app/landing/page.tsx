import type { Metadata } from 'next'
import LandingClient from './LandingClient'

export const metadata: Metadata = {
  title: 'ExamIA — Exámenes de oposiciones con IA para Murcia',
  description:
    'Genera tests personalizados por tema, dificultad y tipo para oposiciones administrativas. Temarios oficiales CARM y Ayuntamientos de Murcia. 1 examen gratis al día, Pro ilimitado por 9,90 €/mes.',
  openGraph: {
    title: 'ExamIA — Exámenes de oposiciones con IA para Murcia',
    description: 'IA fine-tuned en temarios CARM. Genera exámenes a medida en segundos.',
    type: 'website',
  },
}

export default function LandingPage() {
  return <LandingClient />
}
