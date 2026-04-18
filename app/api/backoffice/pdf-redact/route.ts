import { NextRequest, NextResponse } from 'next/server'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import path from 'path'
import fs from 'fs'

export const runtime = 'nodejs'

type Zone = {
  page: number        // 0-indexed, -1 = última página
  from_bottom: number // ratio 0-1 desde abajo
  height: number      // ratio 0-1 de altura
  mode: 'erase' | 'branding'
}

type Branding = {
  nombre: string
  telefono: string
  email: string
  web: string
}

// Colores corporativos GrupoSkyLine
const GOLD       = rgb(0.788, 0.627, 0.263)   // #C9A043
const GOLD_LIGHT = rgb(0.910, 0.788, 0.478)   // #E8C97A
const GOLD_DARK  = rgb(0.545, 0.431, 0.176)   // #8B6E2D
const BG_DARK    = rgb(0.024, 0.027, 0.035)   // #060709
const BG_CARD    = rgb(0.067, 0.078, 0.094)   // #111318
const TEXT_LIGHT = rgb(0.961, 0.941, 0.910)   // #F5F0E8
const TEXT_MID   = rgb(0.741, 0.718, 0.667)   // #BDB7AA
const TEXT_DIM   = rgb(0.478, 0.455, 0.412)   // #7A7469

export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData()
    const pdfFile = fd.get('pdf') as File | null
    const zonesRaw = fd.get('zones') as string
    const brandingRaw = fd.get('branding') as string

    if (!pdfFile) return NextResponse.json({ error: 'No PDF' }, { status: 400 })

    const zones: Zone[] = zonesRaw ? JSON.parse(zonesRaw) : []
    const branding: Branding = brandingRaw
      ? JSON.parse(brandingRaw)
      : { nombre: 'Grupo SkyLine Investment', telefono: '', email: '', web: '' }

    const bytes = await pdfFile.arrayBuffer()
    const doc = await PDFDocument.load(bytes)
    const pages = doc.getPages()

    const font     = await doc.embedFont(StandardFonts.Helvetica)
    const boldFont = await doc.embedFont(StandardFonts.HelveticaBold)

    // Cargar logo corporativo desde /public/logo.png
    let logoImage: Awaited<ReturnType<typeof doc.embedPng>> | null = null
    try {
      const logoPath = path.join(process.cwd(), 'public', 'logo.png')
      if (fs.existsSync(logoPath)) {
        const logoBytes = fs.readFileSync(logoPath)
        logoImage = await doc.embedPng(logoBytes)
      }
    } catch {
      // Si no se puede cargar el logo, continúa con texto
    }

    for (const zone of zones) {
      const pageIdx = zone.page === -1 ? pages.length - 1 : Math.min(zone.page, pages.length - 1)
      const page = pages[pageIdx]
      if (!page) continue

      const { width, height } = page.getSize()
      const zoneY = zone.from_bottom * height
      const zoneH = zone.height * height

      if (zone.mode === 'erase') {
        // Borrar con blanco — neutro para cualquier fondo de PDF
        page.drawRectangle({
          x: 0, y: zoneY, width, height: zoneH,
          color: rgb(1, 1, 1),
        })

      } else {
        // ── BRANDING CORPORATIVO — barra limpia ─────────────────
        const PAD = 24
        const cy  = zoneY + zoneH * 0.5

        // Fondo oscuro corporativo
        page.drawRectangle({ x: 0, y: zoneY, width, height: zoneH, color: BG_DARK })

        // Línea dorada superior
        page.drawRectangle({ x: 0, y: zoneY + zoneH - 2, width, height: 2, color: GOLD })

        // Línea dorada inferior
        page.drawRectangle({ x: 0, y: zoneY, width, height: 1, color: GOLD_DARK })

        // ── LOGO (izquierda) ────────────────────────────────────
        let afterLogoX = PAD
        if (logoImage) {
          const imgDims = logoImage.scale(1)
          const maxH  = Math.min(zoneH - 12, 48)
          const maxW  = width * 0.20
          const scale = Math.min(maxW / imgDims.width, maxH / imgDims.height)
          const lW    = imgDims.width  * scale
          const lH    = imgDims.height * scale
          page.drawImage(logoImage, { x: PAD, y: cy - lH / 2, width: lW, height: lH })
          afterLogoX = PAD + lW + 20
        } else {
          const nameSize = Math.min(11, zoneH * 0.24)
          page.drawText('GRUPOSKYLINE', { x: PAD, y: cy + 3, size: nameSize, font: boldFont, color: GOLD })
          page.drawText('Investment',   { x: PAD, y: cy + 3 - nameSize - 2, size: nameSize * 0.7, font, color: TEXT_MID })
          afterLogoX = PAD + 110
        }

        // ── DATOS DE CONTACTO (centro) ──────────────────────────
        const fontSize = Math.max(7, Math.min(9, zoneH * 0.2))
        const lineGap  = fontSize + 3.5

        const contactLines: { text: string; color: ReturnType<typeof rgb>; bold?: boolean }[] = []
        if (branding.nombre)   contactLines.push({ text: branding.nombre.toUpperCase(), color: GOLD_LIGHT, bold: true })
        if (branding.email)    contactLines.push({ text: branding.email,    color: TEXT_MID })
        if (branding.web)      contactLines.push({ text: branding.web,      color: GOLD })
        if (branding.telefono) contactLines.push({ text: branding.telefono, color: TEXT_MID })

        const totalTextH = contactLines.length * lineGap
        let lineY = cy + totalTextH / 2 - fontSize / 2
        const cxStart = afterLogoX + (width * 0.5 - afterLogoX) * 0.2

        for (const line of contactLines) {
          page.drawText(line.text, {
            x: cxStart, y: lineY,
            size: fontSize,
            font: line.bold ? boldFont : font,
            color: line.color,
          })
          lineY -= lineGap
        }

        // ── DISCLAIMER ──────────────────────────────────────────
        const disc  = 'Informacion confidencial - Exclusiva para inversores acreditados - GrupoSkyLine Investment'
        const discSz = 5
        const discW  = font.widthOfTextAtSize(disc, discSz)
        page.drawText(disc, {
          x: width / 2 - discW / 2, y: zoneY + 4,
          size: discSz, font, color: TEXT_DIM,
        })
      }
    }

    const out = await doc.save()
    return new NextResponse(Buffer.from(out), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="procesado.pdf"',
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Error procesando PDF' }, { status: 500 })
  }
}
