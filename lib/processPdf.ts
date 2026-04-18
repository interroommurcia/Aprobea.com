import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export type PdfZone = {
  page: number
  from_bottom: number
  height: number
  mode: 'erase' | 'branding'
}

export type PdfBranding = {
  nombre: string
  telefono: string
  email: string
  web: string
}

const GOLD       = rgb(0.788, 0.627, 0.263)
const GOLD_LIGHT = rgb(0.910, 0.788, 0.478)
const GOLD_DARK  = rgb(0.545, 0.431, 0.176)
const BG_DARK    = rgb(0.024, 0.027, 0.035)
const TEXT_MID   = rgb(0.741, 0.718, 0.667)
const TEXT_DIM   = rgb(0.478, 0.455, 0.412)

export async function processPdfClient(
  file: File,
  zones: PdfZone[],
  branding: PdfBranding,
): Promise<Uint8Array> {
  const bytes = await file.arrayBuffer()
  const doc   = await PDFDocument.load(bytes)
  const pages = doc.getPages()

  const font     = await doc.embedFont(StandardFonts.Helvetica)
  const boldFont = await doc.embedFont(StandardFonts.HelveticaBold)

  let logoImage: Awaited<ReturnType<typeof doc.embedPng>> | null = null
  try {
    const res = await fetch('/logo.png')
    if (res.ok) {
      const buf = await res.arrayBuffer()
      logoImage = await doc.embedPng(buf)
    }
  } catch { /* logo optional */ }

  for (const zone of zones) {
    const pageIdx = zone.page === -1 ? pages.length - 1 : Math.min(zone.page, pages.length - 1)
    const page = pages[pageIdx]
    if (!page) continue

    const { width, height } = page.getSize()
    const zoneY = zone.from_bottom * height
    const zoneH = zone.height * height

    if (zone.mode === 'erase') {
      page.drawRectangle({ x: 0, y: zoneY, width, height: zoneH, color: rgb(1, 1, 1) })
    } else {
      const PAD = 24
      const cy  = zoneY + zoneH * 0.5

      page.drawRectangle({ x: 0, y: zoneY, width, height: zoneH, color: BG_DARK })
      page.drawRectangle({ x: 0, y: zoneY + zoneH - 2, width, height: 2, color: GOLD })
      page.drawRectangle({ x: 0, y: zoneY, width, height: 1, color: GOLD_DARK })

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
        page.drawText(line.text, { x: cxStart, y: lineY, size: fontSize, font: line.bold ? boldFont : font, color: line.color })
        lineY -= lineGap
      }

      const disc  = 'Informacion confidencial - Exclusiva para inversores acreditados - GrupoSkyLine Investment'
      const discSz = 5
      const discW  = font.widthOfTextAtSize(disc, discSz)
      page.drawText(disc, { x: width / 2 - discW / 2, y: zoneY + 4, size: discSz, font, color: TEXT_DIM })
    }
  }

  return doc.save()
}
