'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export type PDFZone = {
  id: string
  page: number          // 0-indexed, -1 = última página
  from_bottom: number   // 0-1 desde abajo
  height: number        // 0-1
  mode: 'erase' | 'branding'
}

type Props = {
  file: File
  zones: PDFZone[]
  onZonesChange: (z: PDFZone[]) => void
  currentMode: 'erase' | 'branding'
}

type InteractState =
  | { type: 'idle' }
  | { type: 'drawing'; startRelY: number; currRelY: number }
  | { type: 'moving';   zoneId: string; startRelY: number; origFromBottom: number; origHeight: number }
  | { type: 'resize-top';    zoneId: string; startRelY: number; origFromBottom: number; origHeight: number }
  | { type: 'resize-bottom'; zoneId: string; startRelY: number; origFromBottom: number; origHeight: number }

const HANDLE_PX = 10   // px de zona sensible para handles
const MIN_H = 0.02     // altura mínima de una zona

export default function PDFVisualEditor({ file, zones, onZonesChange, currentMode }: Props) {
  const pdfCanvasRef  = useRef<HTMLCanvasElement>(null)
  const overlayRef    = useRef<HTMLCanvasElement>(null)
  const containerRef  = useRef<HTMLDivElement>(null)
  const interactRef   = useRef<InteractState>({ type: 'idle' })
  const zonesRef      = useRef(zones)
  zonesRef.current    = zones

  const [pdfDoc, setPdfDoc]           = useState<any>(null)
  const [totalPages, setTotalPages]   = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [canvasH, setCanvasH]         = useState(0)
  const [cursor, setCursor]           = useState<string>('crosshair')
  const [interact, setInteract]       = useState<InteractState>({ type: 'idle' })

  // Sync ref con state para que los handlers del canvas tengan el valor actual
  interactRef.current = interact

  /* ── Cargar PDF ─────────────────────────────────────────── */
  useEffect(() => {
    if (!file) return
    let blobUrl = ''
    ;(async () => {
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
      blobUrl = URL.createObjectURL(file)
      const doc = await pdfjsLib.getDocument(blobUrl).promise
      setPdfDoc(doc)
      setTotalPages(doc.numPages)
      setCurrentPage(1)
    })()
    return () => { if (blobUrl) URL.revokeObjectURL(blobUrl) }
  }, [file])

  /* ── Renderizar página ──────────────────────────────────── */
  const renderPage = useCallback(async () => {
    if (!pdfDoc || !pdfCanvasRef.current || !containerRef.current) return
    const page = await pdfDoc.getPage(currentPage)
    const containerW = containerRef.current.clientWidth || 600
    const baseVP = page.getViewport({ scale: 1 })
    const scale  = (containerW - 4) / baseVP.width
    const vp     = page.getViewport({ scale })

    const c = pdfCanvasRef.current
    c.width = vp.width; c.height = vp.height
    if (overlayRef.current) {
      overlayRef.current.width  = vp.width
      overlayRef.current.height = vp.height
    }
    setCanvasH(vp.height)
    await page.render({ canvasContext: c.getContext('2d')!, viewport: vp }).promise
  }, [pdfDoc, currentPage])

  useEffect(() => { renderPage() }, [renderPage])

  /* ── Zonas visibles en página actual ───────────────────── */
  const pageZones = useCallback((zoneList: PDFZone[]) =>
    zoneList.filter(z => z.page === currentPage - 1 || (z.page === -1 && currentPage === totalPages))
  , [currentPage, totalPages])

  /* ── Dibujar overlay ────────────────────────────────────── */
  const drawOverlay = useCallback(() => {
    const ov = overlayRef.current
    if (!ov || canvasH === 0) return
    const ctx = ov.getContext('2d')!
    ctx.clearRect(0, 0, ov.width, ov.height)

    const visible = pageZones(zonesRef.current)

    visible.forEach(z => {
      const yTop = ov.height - (z.from_bottom + z.height) * ov.height
      const yBot = ov.height - z.from_bottom * ov.height
      const h    = yBot - yTop
      const isB  = z.mode === 'branding'
      const color = isB ? 'rgba(201,160,67,' : 'rgba(238,0,85,'

      // Fondo semitransparente
      ctx.fillStyle   = color + '0.2)'
      ctx.fillRect(0, yTop, ov.width, h)

      // Borde
      ctx.strokeStyle = isB ? '#C9A043' : '#ee0055'
      ctx.lineWidth   = 2
      ctx.setLineDash([])
      ctx.strokeRect(1, yTop, ov.width - 2, h)

      // Handle superior ─────────────────────────────────────
      ctx.fillStyle = isB ? '#C9A043' : '#ee0055'
      const hW = 60
      ctx.beginPath()
      ctx.roundRect(ov.width / 2 - hW / 2, yTop - 6, hW, 12, 4)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.font = 'bold 9px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('▲ arrastra', ov.width / 2, yTop + 2)

      // Handle inferior ─────────────────────────────────────
      ctx.fillStyle = isB ? '#C9A043' : '#ee0055'
      ctx.beginPath()
      ctx.roundRect(ov.width / 2 - hW / 2, yBot - 6, hW, 12, 4)
      ctx.fill()
      ctx.fillStyle = '#fff'
      ctx.fillText('▼ arrastra', ov.width / 2, yBot + 2)

      // Etiqueta central
      ctx.fillStyle = isB ? '#C9A043' : '#ee0055'
      ctx.font = 'bold 12px system-ui'
      ctx.textAlign = 'left'
      const label = isB ? '✦ Mi branding — arrastra para mover' : '✕ Borrar — arrastra para mover'
      ctx.fillText(label, 10, Math.min(yTop + 22, yBot - 6))
    })

    // Rectángulo en proceso de dibujo
    const st = interactRef.current
    if (st.type === 'drawing') {
      const topRel = Math.min(st.startRelY, st.currRelY)
      const hRel   = Math.abs(st.currRelY - st.startRelY)
      const yTop   = topRel * ov.height
      const h      = hRel  * ov.height
      const isB    = currentMode === 'branding'
      ctx.fillStyle   = isB ? 'rgba(201,160,67,0.15)' : 'rgba(238,0,85,0.15)'
      ctx.strokeStyle = isB ? '#C9A043' : '#ee0055'
      ctx.lineWidth   = 2
      ctx.setLineDash([6, 3])
      ctx.fillRect(0, yTop, ov.width, h)
      ctx.strokeRect(1, yTop, ov.width - 2, h)
      ctx.setLineDash([])
    }
  }, [canvasH, pageZones, currentMode])

  useEffect(() => { drawOverlay() }, [drawOverlay, zones, interact])

  /* ── Helpers de coordenadas ─────────────────────────────── */
  const relY = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = overlayRef.current!.getBoundingClientRect()
    return Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height))
  }
  // relY desde arriba → from_bottom (PDF)
  const toFromBottom = (topRel: number, hRel: number) =>
    Math.max(0, Math.min(1 - hRel, 1 - topRel - hRel))

  /* ── Detectar qué zona/handle está bajo el cursor ──────── */
  type HitResult = { zoneId: string; action: 'move' | 'resize-top' | 'resize-bottom' } | null
  const hitTest = useCallback((relYVal: number): HitResult => {
    const ov = overlayRef.current
    if (!ov) return null
    const py = relYVal * ov.height
    const handlePct = HANDLE_PX / ov.height

    for (const z of pageZones(zonesRef.current)) {
      const yTop = 1 - (z.from_bottom + z.height)
      const yBot = 1 - z.from_bottom
      if (relYVal < yTop - handlePct || relYVal > yBot + handlePct) continue
      if (relYVal < yTop + handlePct) return { zoneId: z.id, action: 'resize-top' }
      if (relYVal > yBot - handlePct) return { zoneId: z.id, action: 'resize-bottom' }
      return { zoneId: z.id, action: 'move' }
    }
    return null
  }, [pageZones])

  /* ── Mouse events ───────────────────────────────────────── */
  const onMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const ry  = relY(e)
    const hit = hitTest(ry)
    if (hit) {
      const z = zonesRef.current.find(x => x.id === hit.zoneId)!
      const next: InteractState = hit.action === 'move'
        ? { type: 'moving',        zoneId: z.id, startRelY: ry, origFromBottom: z.from_bottom, origHeight: z.height }
        : hit.action === 'resize-top'
        ? { type: 'resize-top',    zoneId: z.id, startRelY: ry, origFromBottom: z.from_bottom, origHeight: z.height }
        : { type: 'resize-bottom', zoneId: z.id, startRelY: ry, origFromBottom: z.from_bottom, origHeight: z.height }
      setInteract(next)
    } else {
      setInteract({ type: 'drawing', startRelY: ry, currRelY: ry })
    }
  }

  const onMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const ry = relY(e)
    const st = interactRef.current

    if (st.type === 'idle') {
      const hit = hitTest(ry)
      setCursor(hit ? (hit.action === 'move' ? 'grab' : 'ns-resize') : 'crosshair')
      return
    }

    if (st.type === 'drawing') {
      setInteract({ ...st, currRelY: ry })
      return
    }

    const delta = ry - st.startRelY   // positivo = hacia abajo (desde arriba)

    if (st.type === 'moving') {
      // Mover: delta hacia abajo → from_bottom decrece
      const newFB = Math.max(0, Math.min(1 - st.origHeight, st.origFromBottom - delta))
      onZonesChange(zonesRef.current.map(z => z.id === st.zoneId ? { ...z, from_bottom: newFB } : z))

    } else if (st.type === 'resize-top') {
      // Borde superior: delta positivo = borde baja = la zona se hace más pequeña por arriba
      const newH  = Math.max(MIN_H, st.origHeight - delta)
      const newFB = Math.max(0, st.origFromBottom + (st.origHeight - newH))
      onZonesChange(zonesRef.current.map(z => z.id === st.zoneId ? { ...z, from_bottom: newFB, height: newH } : z))

    } else if (st.type === 'resize-bottom') {
      // Borde inferior: delta positivo = borde baja = from_bottom decrece
      const newFB = Math.max(0, st.origFromBottom - delta)
      const newH  = Math.max(MIN_H, st.origFromBottom + st.origHeight - newFB)
      onZonesChange(zonesRef.current.map(z => z.id === st.zoneId ? { ...z, from_bottom: newFB, height: newH } : z))
    }
  }

  const onMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const st = interactRef.current
    if (st.type === 'drawing') {
      const ry    = relY(e)
      const topRel = Math.min(st.startRelY, ry)
      const hRel   = Math.abs(ry - st.startRelY)
      if (hRel >= MIN_H) {
        const newZone: PDFZone = {
          id:          Math.random().toString(36).slice(2),
          page:        currentPage === totalPages ? -1 : currentPage - 1,
          from_bottom: toFromBottom(topRel, hRel),
          height:      hRel,
          mode:        currentMode,
        }
        onZonesChange([...zonesRef.current, newZone])
      }
    }
    setInteract({ type: 'idle' })
    setCursor('crosshair')
  }

  const removeZone = (id: string) => onZonesChange(zones.filter(z => z.id !== id))

  const visibleZones = pageZones(zones)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>

      {/* Toolbar */}
      <div style={{ padding: '0.5rem 1rem', borderBottom: '0.5px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, background: 'var(--bg-1)', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)}
            style={{ background: 'var(--bg-3)', border: '0.5px solid var(--gold-border)', color: 'var(--text-2)', padding: '4px 10px', borderRadius: '6px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.4 : 1 }}>←</button>
          <span style={{ fontSize: '11px', color: 'var(--text-3)', minWidth: '80px', textAlign: 'center' }}>Pág. {currentPage} / {totalPages || '…'}</span>
          <button disabled={currentPage === totalPages || totalPages === 0} onClick={() => setCurrentPage(p => p + 1)}
            style={{ background: 'var(--bg-3)', border: '0.5px solid var(--gold-border)', color: 'var(--text-2)', padding: '4px 10px', borderRadius: '6px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.4 : 1 }}>→</button>
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text-3)' }}>
          {currentMode === 'branding'
            ? <span style={{ color: '#C9A043' }}>✦ Branding</span>
            : <span style={{ color: '#ee0055' }}>✕ Borrar</span>}
          {' · '}dibuja · mueve · redimensiona handles
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} style={{ flex: 1, overflow: 'auto', background: '#1a1a1a', position: 'relative' }}>
        {!pdfDoc ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-3)', fontSize: '0.85rem' }}>Cargando PDF…</div>
        ) : (
          <div style={{ position: 'relative', display: 'inline-block', minWidth: '100%' }}>
            <canvas ref={pdfCanvasRef} style={{ display: 'block' }} />
            <canvas
              ref={overlayRef}
              style={{ position: 'absolute', top: 0, left: 0, cursor }}
              onMouseDown={onMouseDown}
              onMouseMove={onMouseMove}
              onMouseUp={onMouseUp}
              onMouseLeave={() => { setInteract({ type: 'idle' }); setCursor('crosshair') }}
            />
          </div>
        )}
      </div>

      {/* Lista de zonas en esta página */}
      {visibleZones.length > 0 && (
        <div style={{ flexShrink: 0, borderTop: '0.5px solid var(--gold-border)', padding: '0.625rem 0.875rem', background: 'var(--bg-1)', maxHeight: '140px', overflowY: 'auto' }}>
          <div style={{ fontSize: '9px', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '6px' }}>Zonas en esta página ({visibleZones.length})</div>
          {visibleZones.map(z => (
            <div key={z.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', marginBottom: '4px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: z.mode === 'branding' ? '#C9A043' : '#ee0055', flexShrink: 0 }} />
              <span style={{ color: 'var(--text-2)' }}>{z.mode === 'branding' ? 'Branding' : 'Borrar'}</span>
              <span style={{ color: 'var(--text-3)' }}>·</span>
              <span style={{ color: 'var(--gold-100)', fontWeight: 600 }}>desde {Math.round(z.from_bottom * 100)}% abajo</span>
              <span style={{ color: 'var(--text-3)' }}>·</span>
              <span style={{ color: 'var(--text-2)' }}>alto {Math.round(z.height * 100)}%</span>
              <button onClick={() => removeZone(z.id)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#ee0055', cursor: 'pointer', fontSize: '15px', lineHeight: 1, padding: '0 4px' }}>×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
