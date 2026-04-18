'use client'

import { useEffect, useState, useRef } from 'react'
import dynamic from 'next/dynamic'
import type { PDFZone } from '@/components/PDFVisualEditor'
import TicketProgress from '@/components/TicketProgress'

const PDFVisualEditor = dynamic(() => import('@/components/PDFVisualEditor'), { ssr: false, loading: () => <div style={{ color: 'var(--text-3)', fontSize: '0.82rem', padding: '2rem', textAlign: 'center' }}>Cargando editor…</div> })
const PropertyMap = dynamic(() => import('@/components/PropertyMap'), { ssr: false })

type Operacion = {
  id: string; titulo: string; descripcion: string; tipo: string
  pdf_url: string | null; pdf_nombre: string | null; activa: boolean; created_at: string
  tickets_total: number; tickets_vendidos: number; importe_objetivo: number | null
  tickets_por_participante: number
  referencia_catastral: string | null; municipio: string | null; provincia: string | null
  comunidad_autonoma: string | null
  valor_mercado: number | null; precio_compra: number | null; comision: number | null
  rentabilidad: number | null; ticket_minimo: number | null
  superficie: number | null; tipo_propiedad: string | null
  imagen_principal: string | null; publico: boolean
}

type _PDFZone = {
  id: string
  page: number
  from_bottom: number
  height: number
  mode: 'erase' | 'branding'
}

type Branding = { nombre: string; telefono: string; email: string; web: string }

const TIPO_COLOR: Record<string, string> = { npl: '#b87333', crowdfunding: 'var(--gold-200)' }

export default function OperacionesPage() {
  const [ops, setOps] = useState<Operacion[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const EMPTY_FORM = {
    titulo: '', descripcion: '', tipo: 'crowdfunding',
    tickets_total: '10', importe_objetivo: '', tickets_por_participante: '1',
    // Property fields
    referencia_catastral: '', municipio: '', provincia: '', comunidad_autonoma: '',
    superficie: '', tipo_propiedad: 'Residencial',
    valor_mercado: '', precio_compra: '', comision: '',
    rentabilidad: '', ticket_minimo: '', imagen_principal: '',
    publico: 'true',
  }
  const [form, setForm] = useState(EMPTY_FORM)
  const [catastroLoading, setCatastroLoading] = useState(false)
  const [catastroMsg, setCatastroMsg] = useState('')
  const [idealistaUrl, setIdealistaUrl] = useState<string | null>(null)
  const [catastroCoords, setCatastroCoords] = useState<{ lat: number; lon: number } | null>(null)
  const [pdfRCMsg, setPdfRCMsg] = useState('')
  const [editingTickets, setEditingTickets] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState('')
  const [ok, setOk] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // PDF Editor state
  const [showEditor, setShowEditor] = useState(false)
  const [zones, setZones] = useState<PDFZone[]>([])
  const [currentMode, setCurrentMode] = useState<'erase' | 'branding'>('branding')
  const [branding, setBranding] = useState<Branding>({
    nombre: 'GrupoSkyLine', telefono: '', email: 'info@gruposkyline.es', web: 'gruposkyline.es'
  })
  const [origUrl, setOrigUrl] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [previewError, setPreviewError] = useState('')
  // Re-editar operación publicada
  const [editingOp, setEditingOp] = useState<Operacion | null>(null)
  const [fetchingPdfOp, setFetchingPdfOp] = useState<string | null>(null)

  function load() {
    setLoading(true)
    fetch('/api/backoffice/operaciones')
      .then(r => r.json())
      .then(d => { setOps(Array.isArray(d) ? d : []); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  // Abrir editor para nuevo PDF (desde el formulario de subida)
  function openEditor() {
    if (!file) return
    setEditingOp(null)
    setZones([])
    setPreviewUrl(null)
    setPreviewBlob(null)
    setPreviewError('')
    setShowEditor(true)
  }

  // Abrir editor para re-editar el PDF de una operación ya publicada
  async function openEditorForOp(op: Operacion) {
    if (!op.pdf_url) return
    setFetchingPdfOp(op.id)
    setPreviewError('')
    try {
      const res = await fetch(op.pdf_url)
      if (!res.ok) throw new Error('No se pudo descargar el PDF')
      const blob = await res.blob()
      const pdfFile = new File([blob], op.pdf_nombre || 'documento.pdf', { type: 'application/pdf' })
      setFile(pdfFile)
      setEditingOp(op)
      setZones([])
      setPreviewUrl(null)
      setPreviewBlob(null)
      setPreviewError('')
      setShowEditor(true)
    } catch (err: any) {
      alert('Error al cargar el PDF: ' + (err.message || 'Error desconocido'))
    } finally {
      setFetchingPdfOp(null)
    }
  }

  // Guardar PDF procesado sobre una operación ya existente (re-edición)
  async function handleUpdateProcessed() {
    if (!previewBlob || !editingOp) return
    setUploading(true)
    setError('')
    const name = (editingOp.pdf_nombre || 'documento.pdf').replace(/\.pdf$/i, '_redactado.pdf')
    const processedFile = new File([previewBlob], name, { type: 'application/pdf' })
    const fd = new FormData()
    fd.append('id', editingOp.id)
    fd.append('pdf', processedFile)
    const res = await fetch('/api/backoffice/operaciones', { method: 'PATCH', body: fd })
    if (res.ok) {
      const data = await res.json()
      setOps(prev => prev.map(o => o.id === editingOp.id
        ? { ...o, pdf_url: data.pdf_url ?? o.pdf_url, pdf_nombre: data.pdf_nombre ?? o.pdf_nombre }
        : o
      ))
      setShowEditor(false)
      setEditingOp(null)
      setPreviewUrl(null)
      setPreviewBlob(null)
      setOk(true)
      setTimeout(() => setOk(false), 3000)
    } else {
      const d = await res.json()
      setError(d.error || 'Error al guardar el PDF')
    }
    setUploading(false)
  }

  // Generate preview via API
  async function handlePreview() {
    if (!file) return
    setPreviewing(true)
    setPreviewError('')
    const fd = new FormData()
    fd.append('pdf', file)
    fd.append('zones', JSON.stringify(zones))
    fd.append('branding', JSON.stringify(branding))
    const res = await fetch('/api/backoffice/pdf-redact', { method: 'POST', body: fd })
    if (!res.ok) {
      const e = await res.json().catch(() => ({ error: 'Error desconocido' }))
      setPreviewError(e.error || 'Error procesando el PDF')
      setPreviewing(false)
      return
    }
    const blob = await res.blob()
    setPreviewBlob(blob)
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(URL.createObjectURL(blob))
    setPreviewing(false)
  }

  // Publish with processed PDF
  async function handlePublishProcessed() {
    if (!previewBlob) return
    setUploading(true)
    setError('')
    const processedFile = new File([previewBlob], file!.name.replace('.pdf', '_redactado.pdf'), { type: 'application/pdf' })
    const fd = new FormData()
    fd.append('titulo', form.titulo)
    fd.append('descripcion', form.descripcion)
    fd.append('tipo', form.tipo)
    fd.append('tickets_total', form.tickets_total || '10')
    fd.append('tickets_por_participante', form.tickets_por_participante || '1')
    if (form.importe_objetivo) fd.append('importe_objetivo', form.importe_objetivo)
    appendPropertyFields(fd)
    fd.append('pdf', processedFile)
    const res = await fetch('/api/backoffice/operaciones', { method: 'POST', body: fd })
    if (res.ok) {
      setForm(EMPTY_FORM)
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      setShowEditor(false)
      setPreviewUrl(null)
      setPreviewBlob(null)
      setOk(true)
      setTimeout(() => setOk(false), 3000)
      load()
    } else {
      const d = await res.json()
      setError(d.error || 'Error al publicar')
    }
    setUploading(false)
  }

  // Publish original (sin redactar)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.titulo) { setError('El título es obligatorio'); return }
    setUploading(true); setError('')
    const fd = new FormData()
    fd.append('titulo', form.titulo)
    fd.append('descripcion', form.descripcion)
    fd.append('tipo', form.tipo)
    fd.append('tickets_total', form.tickets_total || '10')
    fd.append('tickets_por_participante', form.tickets_por_participante || '1')
    if (form.importe_objetivo) fd.append('importe_objetivo', form.importe_objetivo)
    appendPropertyFields(fd)
    if (file) fd.append('pdf', file)
    const res = await fetch('/api/backoffice/operaciones', { method: 'POST', body: fd })
    if (res.ok) {
      setForm(EMPTY_FORM)
      setFile(null)
      if (fileRef.current) fileRef.current.value = ''
      setOk(true); setTimeout(() => setOk(false), 3000)
      load()
    } else {
      const d = await res.json()
      setError(d.error || 'Error al subir')
    }
    setUploading(false)
  }

  async function toggleActiva(op: Operacion) {
    await fetch('/api/backoffice/operaciones', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: op.id, activa: !op.activa }),
    })
    setOps(prev => prev.map(o => o.id === op.id ? { ...o, activa: !o.activa } : o))
  }

  async function deleteOp(op: Operacion) {
    if (!confirm(`¿Eliminar "${op.titulo}"?`)) return
    await fetch('/api/backoffice/operaciones', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: op.id, pdf_url: op.pdf_url }),
    })
    setOps(prev => prev.filter(o => o.id !== op.id))
  }

  async function extractRCFromPDF(file: File): Promise<string | null> {
    try {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/extract-rc', { method: 'POST', body: fd })
      if (!res.ok) return null
      const data = await res.json()
      return data.rc ?? null
    } catch { return null }
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f); setPreviewBlob(null); setPreviewUrl(null); setPdfRCMsg('')
    if (!f) return
    setPdfRCMsg('🔍 Analizando PDF…')
    const rc = await extractRCFromPDF(f)
    if (rc) {
      setPdfRCMsg(`🔍 Ref. catastral detectada: ${rc} — consultando Catastro…`)
      setForm(prev => ({ ...prev, referencia_catastral: rc }))
      await buscarCatastro(rc)
      setPdfRCMsg(`✓ Ref. catastral detectada en el PDF: ${rc}`)
    } else {
      setPdfRCMsg('No se detectó ref. catastral en el PDF — introdúcela manualmente')
    }
  }

  async function buscarCatastro(rcParam?: string) {
    const rc = (rcParam ?? form.referencia_catastral).trim().toUpperCase()
    if (!rc) return
    setCatastroLoading(true); setCatastroMsg(''); setIdealistaUrl(null); setCatastroCoords(null)
    try {
      // Call Catastro directly from the browser — the API allows CORS (*) but blocks non-Spanish server IPs
      const detailUrl = `https://ovc.catastro.meh.es/OVCServWeb/OVCWcfCallejero/COVCCallejero.svc/rest/Consulta_DNPRC?Provincia=&Municipio=&RC=${encodeURIComponent(rc)}`
      const coordUrl  = `https://ovc.catastro.meh.es/ovcservweb/OVCSWLocalizacionRC/ovccoordenadas.asmx/Consulta_CPMRC?Provincia=&Municipio=&SRS=EPSG:4326&RC=${encodeURIComponent(rc)}`
      const [detailRes, coordRes] = await Promise.all([
        fetch(detailUrl, { headers: { Accept: 'application/xml' } }),
        fetch(coordUrl,  { headers: { Accept: 'application/xml' } }),
      ])
      const [detailXml, coordXml] = await Promise.all([detailRes.text(), coordRes.text()])

      function extractXml(xml: string, tag: string) {
        const m = xml.match(new RegExp(`<${tag}[^>]*>([^<]+)<\/${tag}>`, 'i'))
        return m ? m[1].trim() : null
      }
      function mapUso(uso: string) {
        const u = uso.toLowerCase()
        if (u.includes('residencial') || u.includes('vivienda')) return 'Residencial'
        if (u.includes('comercial') || u.includes('comercio')) return 'Comercial'
        if (u.includes('industrial') || u.includes('almacen')) return 'Industrial'
        if (u.includes('solar') || u.includes('suelo')) return 'Suelo'
        if (u.includes('oficina')) return 'Oficinas'
        return uso ? uso.charAt(0).toUpperCase() + uso.slice(1).toLowerCase() : 'Residencial'
      }

      // Use <cuerr> (control field) for error detection — more reliable than <cod>
      // <cod> appears in multiple contexts in success responses (street code, etc.)
      const cuerr = extractXml(detailXml, 'cuerr')
      if (cuerr && cuerr !== '0') {
        const errCode = extractXml(detailXml, 'cod') ?? ''
        const msgs: Record<string, string> = {
          '1':  'Referencia catastral vacía',
          '17': 'Referencia catastral no encontrada — verifica los 20 caracteres',
          '43': 'Formato de referencia incorrecto',
        }
        setCatastroMsg(`⚠ ${msgs[errCode] ?? `Error Catastro ${errCode || cuerr}`}`)
        return
      }

      const direccion = extractXml(detailXml, 'ldt') ?? ''
      const uso       = extractXml(detailXml, 'luso') ?? ''
      const sfc       = extractXml(detailXml, 'sfc') ?? ''
      const municipio = extractXml(detailXml, 'nm') ?? ''
      const provincia = extractXml(detailXml, 'np') ?? ''
      const latStr    = extractXml(coordXml, 'ycen') ?? ''
      const lonStr    = extractXml(coordXml, 'xcen') ?? ''
      const lat = latStr ? parseFloat(latStr) : null
      const lon = lonStr ? parseFloat(lonStr) : null

      let idealistaUrl: string | null = null
      if (lat && lon) idealistaUrl = `https://www.idealista.com/geo?lat=${lat}&lon=${lon}&tipo=viviendas`
      else if (municipio) {
        const slug = municipio.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-')
        idealistaUrl = `https://www.idealista.com/casas-${slug}/`
      }

      setForm(f => ({
        ...f,
        referencia_catastral: rc,
        titulo:         !f.titulo && direccion ? direccion : f.titulo,
        municipio:      municipio || f.municipio,
        provincia:      provincia || f.provincia,
        superficie:     sfc ? String(parseFloat(sfc)) : f.superficie,
        tipo_propiedad: uso ? mapUso(uso) : f.tipo_propiedad,
      }))
      if (lat && lon) setCatastroCoords({ lat, lon })
      if (idealistaUrl) setIdealistaUrl(idealistaUrl)
      setCatastroMsg('✓ Datos del Catastro cargados')
    } catch { setCatastroMsg('⚠ Error de conexión con Catastro') }
    finally { setCatastroLoading(false) }
  }

  function appendPropertyFields(fd: FormData) {
    const props: (keyof typeof EMPTY_FORM)[] = [
      'referencia_catastral','municipio','provincia','comunidad_autonoma','superficie','tipo_propiedad',
      'valor_mercado','precio_compra','comision','rentabilidad','ticket_minimo',
      'imagen_principal','publico',
    ]
    for (const k of props) if (form[k]) fd.append(k, form[k])
  }

  async function saveTickets(op: Operacion, tickets_total: number) {
    if (isNaN(tickets_total) || tickets_total < 1) return
    await fetch('/api/backoffice/operaciones', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: op.id, tickets_total }),
    })
    setOps(prev => prev.map(o => o.id === op.id ? { ...o, tickets_total } : o))
    setEditingTickets(null)
  }

  function updateZone(id: string, patch: Partial<PDFZone>) {
    setZones(prev => prev.map(z => z.id === id ? { ...z, ...patch } : z))
  }

  return (
    <div style={{ padding: '2.5rem 3rem', maxWidth: '900px' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.5rem' }}>Backoffice</div>
        <h1 className="serif" style={{ fontSize: '2rem', fontWeight: 300, color: 'var(--text-0)' }}>Operaciones estudiadas</h1>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-3)', marginTop: '4px' }}>Sube informes en PDF, redacta los datos del proveedor y publica en el marketplace.</p>
      </div>

      {/* Upload form */}
      <form onSubmit={handleSubmit} className="bo-form" style={{ marginBottom: '2.5rem' }}>
        <div className="bo-section-title">Nueva operación</div>

        {/* ── 1: Identificación ── */}
        <div style={{ background: 'var(--bg-0)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem', border: '0.5px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontSize: '9px', color: 'var(--text-3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>Identificación</div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.875rem', marginBottom: '0.875rem' }}>
            <div>
              <label className="bo-label">Título *</label>
              <input className="bo-input" value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} placeholder="Ej: Cartera NPL Región de Murcia 2025" />
            </div>
            <div>
              <label className="bo-label">Tipo</label>
              <select className="bo-input" value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                <option value="crowdfunding">Crowdfunding</option>
                <option value="npl">NPL</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem', marginBottom: '0.875rem' }}>
            <div>
              <label className="bo-label">Tipo de propiedad</label>
              <select className="bo-input" value={form.tipo_propiedad} onChange={e => setForm(f => ({ ...f, tipo_propiedad: e.target.value }))}>
                {['Residencial','Comercial','Industrial','Suelo','Oficinas','Garaje','Otro'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="bo-label">Visibilidad</label>
              <select className="bo-input" value={form.publico} onChange={e => setForm(f => ({ ...f, publico: e.target.value }))}>
                <option value="true">🌐 Público</option>
                <option value="false">🔒 Privado</option>
              </select>
            </div>
          </div>
          <div>
            <label className="bo-label">Descripción</label>
            <textarea className="bo-input" value={form.descripcion} onChange={e => setForm(f => ({ ...f, descripcion: e.target.value }))} rows={2} placeholder="Descripción visible para el inversor…" style={{ resize: 'vertical' }} />
          </div>
        </div>

        {/* ── 2: Catastro + Ubicación ── */}
        <div style={{ background: 'var(--bg-0)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem', border: '0.5px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontSize: '9px', color: 'var(--text-3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>Ubicación del activo</div>
          <div style={{ marginBottom: '0.875rem' }}>
            <label className="bo-label">Referencia Catastral</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input className="bo-input" value={form.referencia_catastral} onChange={e => setForm(f => ({ ...f, referencia_catastral: e.target.value.toUpperCase() }))} placeholder="Ej: 5237101WG9153S0025FK" style={{ flex: 1, fontFamily: 'monospace', letterSpacing: '0.05em' }} />
              <button type="button" onClick={() => buscarCatastro()} disabled={!form.referencia_catastral || catastroLoading} className="bo-btn bo-btn-ghost" style={{ flexShrink: 0 }}>
                {catastroLoading ? '⏳ Buscando…' : '🏛 Consultar Catastro'}
              </button>
            </div>
            {catastroMsg && (
              <div style={{ fontSize: '11px', marginTop: '6px', color: catastroMsg.startsWith('✓') ? '#6dc86d' : '#e8a020', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {catastroMsg}
                {idealistaUrl && <a href={idealistaUrl} target="_blank" rel="noopener noreferrer" className="bo-btn bo-btn-ghost bo-btn-sm" style={{ textDecoration: 'none' }}>Ver en Idealista ↗</a>}
              </div>
            )}
            {catastroCoords && catastroMsg.startsWith('✓') && (
              <PropertyMap lat={catastroCoords.lat} lon={catastroCoords.lon} address={form.titulo || undefined} />
            )}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.875rem', marginBottom: '0.875rem' }}>
            <div><label className="bo-label">Municipio</label><input className="bo-input" value={form.municipio} onChange={e => setForm(f => ({ ...f, municipio: e.target.value.toUpperCase() }))} placeholder="LOS GALLARDOS" /></div>
            <div><label className="bo-label">Provincia</label><input className="bo-input" value={form.provincia} onChange={e => setForm(f => ({ ...f, provincia: e.target.value.toUpperCase() }))} placeholder="ALMERÍA" /></div>
            <div><label className="bo-label">Superficie (m²)</label><input className="bo-input" type="number" step="0.01" value={form.superficie} onChange={e => setForm(f => ({ ...f, superficie: e.target.value }))} placeholder="122" /></div>
          </div>
          <div>
            <label className="bo-label">Comunidad Autónoma</label>
            <select className="bo-input" value={form.comunidad_autonoma} onChange={e => setForm(f => ({ ...f, comunidad_autonoma: e.target.value }))}>
              <option value="">— Sin especificar —</option>
              {['Andalucía','Aragón','Asturias','Islas Baleares','Canarias','Cantabria','Castilla-La Mancha','Castilla y León','Cataluña','Comunitat Valenciana','Extremadura','Galicia','La Rioja','Madrid','Murcia','Navarra','País Vasco'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* ── 3: Financiero ── */}
        <div style={{ background: 'var(--bg-0)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem', border: '0.5px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontSize: '9px', color: 'var(--text-3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>Datos financieros</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.875rem', marginBottom: '0.875rem' }}>
            <div>
              <label className="bo-label">Valor de mercado (€)</label>
              <input className="bo-input" type="number" step="100" value={form.valor_mercado} onChange={e => setForm(f => ({ ...f, valor_mercado: e.target.value }))} placeholder="300000" />
              {idealistaUrl && !form.valor_mercado && <a href={idealistaUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: '9px', color: 'var(--gold-200)', marginTop: '4px', display: 'block', textDecoration: 'none' }}>→ Consultar en Idealista</a>}
            </div>
            <div><label className="bo-label">Precio de compra (€)</label><input className="bo-input" type="number" step="100" value={form.precio_compra} onChange={e => setForm(f => ({ ...f, precio_compra: e.target.value }))} placeholder="150000" /></div>
            <div>
              <label className="bo-label" style={{ color: 'var(--gold-200)' }}>Comisión (€)</label>
              <input className="bo-input" type="number" step="100" value={form.comision} onChange={e => setForm(f => ({ ...f, comision: e.target.value }))} placeholder="2500" style={{ borderColor: 'rgba(201,160,67,0.4)' }} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.875rem' }}>
            <div>
              <label className="bo-label">Rentabilidad (%)</label>
              <input className="bo-input" type="number" step="0.01" value={form.rentabilidad} onChange={e => setForm(f => ({ ...f, rentabilidad: e.target.value }))} placeholder="75.39" />
              {form.valor_mercado && form.precio_compra && (
                <div style={{ fontSize: '9px', color: 'var(--gold-200)', marginTop: '4px' }}>
                  Calculada: {((parseFloat(form.valor_mercado) / parseFloat(form.precio_compra) - 1) * 100).toFixed(2)}%
                </div>
              )}
            </div>
            <div><label className="bo-label">Ticket mínimo (€)</label><input className="bo-input" type="number" step="1000" value={form.ticket_minimo} onChange={e => setForm(f => ({ ...f, ticket_minimo: e.target.value }))} placeholder="50000" /></div>
          </div>
        </div>

        {/* ── 4: Tickets ── */}
        <div style={{ background: 'var(--bg-0)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem', border: '0.5px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontSize: '9px', color: 'var(--text-3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>Tickets de participación</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.875rem', marginBottom: '0.875rem' }}>
            <div><label className="bo-label">Nº total de tickets *</label><input className="bo-input" type="number" min="1" value={form.tickets_total} onChange={e => setForm(f => ({ ...f, tickets_total: e.target.value }))} placeholder="10" /></div>
            <div>
              <label className="bo-label">Máx. por inversor</label>
              <input className="bo-input" type="number" min="0" value={form.tickets_por_participante} onChange={e => setForm(f => ({ ...f, tickets_por_participante: e.target.value }))} placeholder="1" />
              <div style={{ fontSize: '9px', color: 'var(--text-3)', marginTop: '3px' }}>0 = sin límite</div>
            </div>
            <div><label className="bo-label">Capital objetivo (€)</label><input className="bo-input" type="number" step="1000" value={form.importe_objetivo} onChange={e => setForm(f => ({ ...f, importe_objetivo: e.target.value }))} placeholder="500000" /></div>
          </div>
          {form.tickets_total && parseInt(form.tickets_total) > 0 && (
            <TicketProgress total={parseInt(form.tickets_total) || 10} vendidos={0} tipo={form.tipo} size="sm" />
          )}
        </div>

        {/* ── 5: Imagen ── */}
        <div style={{ background: 'var(--bg-0)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1rem', border: '0.5px solid rgba(255,255,255,0.04)' }}>
          <div style={{ fontSize: '9px', color: 'var(--text-3)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '0.875rem' }}>Imagen principal</div>
          <label className="bo-label">URL de imagen</label>
          <input className="bo-input" type="url" value={form.imagen_principal} onChange={e => setForm(f => ({ ...f, imagen_principal: e.target.value }))} placeholder="https://…/foto.jpg" />
          <div style={{ fontSize: '9px', color: 'var(--text-3)', marginTop: '4px' }}>Pega el enlace directo a la foto de la propiedad</div>
          {form.imagen_principal && (
            <div style={{ marginTop: '0.875rem', borderRadius: '10px', overflow: 'hidden', maxHeight: '160px', border: '0.5px solid var(--gold-border)' }}>
              <img src={form.imagen_principal} alt="Preview" style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }} onError={e => (e.currentTarget.style.display = 'none')} />
            </div>
          )}
        </div>

        {/* PDF drop zone */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label className="bo-label">Archivo PDF</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--bg-0)', border: `0.5px dashed ${file ? 'var(--gold-200)' : 'var(--gold-border)'}`, borderRadius: '12px', padding: '1.25rem 1.5rem', cursor: 'pointer', transition: 'border-color 0.2s' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={file ? 'var(--gold-200)' : 'var(--text-3)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14,2 14,8 20,8"/>
              <line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>
            </svg>
            <div>
              <div style={{ fontSize: '0.85rem', color: file ? 'var(--gold-100)' : 'var(--text-2)' }}>
                {file ? file.name : 'Haz clic para seleccionar un PDF'}
              </div>
              {file && <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '2px' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>}
            </div>
            <input ref={fileRef} type="file" accept=".pdf" onChange={onFileChange} style={{ display: 'none' }} />
          </label>
        </div>

        {pdfRCMsg && (
          <div style={{
            fontSize: '11px', marginTop: '-0.75rem', marginBottom: '1rem',
            padding: '8px 14px', borderRadius: '8px',
            background: pdfRCMsg.startsWith('✓') ? 'rgba(109,200,109,0.07)' : pdfRCMsg.startsWith('🔍') ? 'rgba(201,160,67,0.07)' : 'rgba(255,255,255,0.04)',
            border: `0.5px solid ${pdfRCMsg.startsWith('✓') ? 'rgba(109,200,109,0.3)' : pdfRCMsg.startsWith('🔍') ? 'rgba(201,160,67,0.3)' : 'rgba(255,255,255,0.08)'}`,
            color: pdfRCMsg.startsWith('✓') ? '#6dc86d' : pdfRCMsg.startsWith('🔍') ? 'var(--gold-200)' : 'var(--text-3)',
            display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            {catastroLoading && <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', border: '1.5px solid rgba(201,160,67,0.3)', borderTopColor: 'var(--gold-200)', animation: 'spin 0.8s linear infinite' }} />}
            {pdfRCMsg}
          </div>
        )}

        {error && <p style={{ fontSize: '0.8rem', color: '#e05', marginBottom: '1rem', background: 'rgba(238,0,85,0.07)', border: '0.5px solid rgba(238,0,85,0.2)', borderRadius: '10px', padding: '10px 14px' }}>{error}</p>}

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          {file && (
            <button type="button" onClick={openEditor} className="bo-btn bo-btn-ghost">
              ✏️ Redactar y previsualizar
            </button>
          )}
          <button type="submit" disabled={uploading} className="bo-btn bo-btn-primary">
            {uploading ? 'Subiendo…' : 'Publicar sin redactar →'}
          </button>
          {ok && <span style={{ fontSize: '0.78rem', color: '#6dc86d', display: 'flex', alignItems: 'center', gap: '5px' }}>✓ Operación publicada</span>}
        </div>
      </form>

      {/* Lista */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <span className="bo-section-title" style={{ marginBottom: 0 }}>Operaciones publicadas</span>
          <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>
            <span style={{ color: 'var(--text-1)' }}>{ops.length}</span> total · <span style={{ color: '#6dc86d' }}>{ops.filter(o => o.activa).length}</span> activas
          </span>
        </div>
        {loading ? (
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Cargando…</p>
        ) : ops.length === 0 ? (
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>Aún no hay operaciones publicadas.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {ops.map(op => (
              <div key={op.id} className="bo-card" style={{ padding: '1.5rem', opacity: op.activa ? 1 : 0.55 }}>
                {/* Top row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.875rem', flex: 1, minWidth: 0 }}>
                    {/* Tipo badge — pill */}
                    <span className="bo-badge" style={{ color: TIPO_COLOR[op.tipo] ?? 'var(--gold-200)', borderColor: TIPO_COLOR[op.tipo] ?? 'var(--gold-border)', background: `${TIPO_COLOR[op.tipo] ?? 'var(--gold-200)'}18`, flexShrink: 0, marginTop: '2px' }}>
                      {op.tipo}
                    </span>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-0)', fontSize: '0.9rem', lineHeight: 1.35 }}>{op.titulo}</div>
                      {op.descripcion && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', marginTop: '3px', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{op.descripcion}</div>
                      )}
                      <div style={{ display: 'flex', gap: '0.75rem', marginTop: '6px', flexWrap: 'wrap' }}>
                        {op.pdf_nombre && <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>📄 {op.pdf_nombre}</span>}
                        {op.importe_objetivo && <span style={{ fontSize: '0.72rem', color: 'var(--text-3)' }}>🎯 {op.importe_objetivo.toLocaleString('es-ES')} €</span>}
                        {op.tickets_por_participante > 0 && (
                          <span className="bo-badge bo-status-pending" style={{ fontSize: '8px', padding: '2px 8px' }}>máx. {op.tickets_por_participante}/participante</span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    {op.pdf_url && (
                      <>
                        <a href={op.pdf_url} target="_blank" rel="noopener noreferrer" className="bo-btn bo-btn-ghost bo-btn-sm" style={{ textDecoration: 'none' }}>
                          PDF ↗
                        </a>
                        <button
                          onClick={() => openEditorForOp(op)}
                          disabled={fetchingPdfOp === op.id}
                          className="bo-btn bo-btn-ghost bo-btn-sm"
                          title="Re-editar el PDF: añadir branding o borrar zonas"
                          style={{ borderColor: 'rgba(201,160,67,0.5)', color: 'var(--gold-200)' }}
                        >
                          {fetchingPdfOp === op.id ? '⏳ Cargando…' : '✏ Editar PDF'}
                        </button>
                      </>
                    )}
                    <button onClick={() => toggleActiva(op)} className={`bo-btn bo-btn-sm ${op.activa ? 'bo-btn-success' : 'bo-btn-neutral'}`}>
                      {op.activa ? '● Activa' : '○ Oculta'}
                    </button>
                    <button onClick={() => deleteOp(op)} className="bo-btn bo-btn-danger bo-btn-sm">✕</button>
                  </div>
                </div>

                {/* Progress bar */}
                <div style={{ borderTop: '0.5px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                  <TicketProgress
                    total={op.tickets_total ?? 10}
                    vendidos={op.tickets_vendidos ?? 0}
                    tipo={op.tipo}
                    size="sm"
                    showLabel
                  />
                  {/* Inline ticket count editor */}
                  <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {editingTickets === op.id ? (
                      <>
                        <input
                          type="number" min="1" max="9999"
                          defaultValue={op.tickets_total}
                          id={`tickets-input-${op.id}`}
                          className="bo-input"
                          style={{ width: '80px', padding: '5px 10px', fontSize: '12px' }}
                        />
                        <button
                          onClick={() => {
                            const el = document.getElementById(`tickets-input-${op.id}`) as HTMLInputElement
                            saveTickets(op, parseInt(el?.value || '10'))
                          }}
                          className="bo-btn bo-btn-success bo-btn-sm"
                        >Guardar</button>
                        <button onClick={() => setEditingTickets(null)} className="bo-btn bo-btn-neutral bo-btn-sm">
                          Cancelar
                        </button>
                      </>
                    ) : (
                      <button onClick={() => setEditingTickets(op.id)} className="bo-btn bo-btn-neutral bo-btn-sm">
                        ✏ {op.tickets_total} tickets totales
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── PDF Editor Modal ────────────────────────────────── */}
      {showEditor && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 1000, display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ background: 'var(--bg-1)', borderBottom: '0.5px solid var(--gold-border)', padding: '0.875rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
            <div>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-0)' }}>
                {editingOp ? 'Re-editar PDF publicado — ' : 'Editor de PDF — '}
              </span>
              <span style={{ fontSize: '0.82rem', color: editingOp ? 'var(--gold-200)' : 'var(--text-3)' }}>
                {editingOp ? editingOp.titulo : file?.name}
              </span>
              {editingOp && (
                <span style={{ marginLeft: '10px', fontSize: '9px', background: 'rgba(201,160,67,0.15)', color: 'var(--gold-200)', border: '0.5px solid rgba(201,160,67,0.4)', borderRadius: '4px', padding: '2px 7px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  Actualización
                </span>
              )}
            </div>
            <button onClick={() => { setShowEditor(false); setEditingOp(null) }} style={{ background: 'none', border: 'none', color: 'var(--text-2)', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>×</button>
          </div>

          {/* Body */}
          <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

            {/* PDF Visual Editor — izquierda */}
            <div style={{ flex: 1, background: '#111', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              {previewUrl ? (
                <>
                  <div style={{ padding: '0.75rem 1rem', borderBottom: '0.5px solid rgba(62,59,53,0.4)', display: 'flex', gap: '1rem', alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '10px', color: '#6dc86d', letterSpacing: '0.1em', textTransform: 'uppercase' }}>✅ Previsualización redactada</span>
                    <a href={previewUrl} download="redactado.pdf" style={{ fontSize: '10px', color: 'var(--gold-200)', textDecoration: 'none' }}>↓ Descargar</a>
                    <button onClick={() => { setPreviewUrl(null); setPreviewBlob(null) }} style={{ marginLeft: 'auto', fontSize: '10px', color: 'var(--gold-200)', background: 'none', border: '0.5px solid rgba(201,160,67,0.3)', padding: '3px 10px', borderRadius: '5px', cursor: 'pointer' }}>← Volver a editar</button>
                  </div>
                  <iframe src={previewUrl} style={{ flex: 1, border: 'none', width: '100%' }} title="PDF redactado" />
                </>
              ) : file ? (
                <PDFVisualEditor file={file} zones={zones} onZonesChange={setZones} currentMode={currentMode} />
              ) : null}
            </div>

            {/* Panel de control — derecha */}
            <div style={{ width: '300px', flexShrink: 0, background: 'var(--bg-1)', borderLeft: '0.5px solid var(--gold-border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
              <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem' }}>

                {/* Selector de modo */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.75rem' }}>¿Qué hago en la zona marcada?</div>

                  {/* Opción: Mi branding */}
                  <button
                    onClick={() => setCurrentMode('branding')}
                    style={{
                      width: '100%', marginBottom: '0.5rem', padding: '12px 14px',
                      borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                      border: `1.5px solid ${currentMode === 'branding' ? '#C9A043' : 'rgba(62,59,53,0.4)'}`,
                      background: currentMode === 'branding' ? 'rgba(201,160,67,0.1)' : 'var(--bg-2)',
                      transition: 'all 0.15s',
                      display: 'flex', alignItems: 'flex-start', gap: '10px',
                    }}
                  >
                    <span style={{ fontSize: '18px', lineHeight: 1, marginTop: '1px', flexShrink: 0 }}>✦</span>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: currentMode === 'branding' ? '#C9A043' : 'var(--text-2)', marginBottom: '2px' }}>Insertar mi branding</div>
                      <div style={{ fontSize: '9px', color: 'var(--text-3)', lineHeight: 1.4 }}>
                        Sustituye la zona por tu logo, datos de contacto y colores corporativos.
                      </div>
                    </div>
                    {currentMode === 'branding' && (
                      <span style={{ marginLeft: 'auto', fontSize: '14px', color: '#C9A043', flexShrink: 0 }}>●</span>
                    )}
                  </button>

                  {/* Opción: Borrar */}
                  <button
                    onClick={() => setCurrentMode('erase')}
                    style={{
                      width: '100%', padding: '12px 14px',
                      borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                      border: `1.5px solid ${currentMode === 'erase' ? '#ee0055' : 'rgba(62,59,53,0.4)'}`,
                      background: currentMode === 'erase' ? 'rgba(238,0,85,0.08)' : 'var(--bg-2)',
                      transition: 'all 0.15s',
                      display: 'flex', alignItems: 'flex-start', gap: '10px',
                    }}
                  >
                    <span style={{ fontSize: '18px', lineHeight: 1, marginTop: '1px', flexShrink: 0 }}>✕</span>
                    <div>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: currentMode === 'erase' ? '#ee0055' : 'var(--text-2)', marginBottom: '2px' }}>Borrar zona</div>
                      <div style={{ fontSize: '9px', color: 'var(--text-3)', lineHeight: 1.4 }}>
                        Pinta la zona de blanco. Ideal para tapar datos del proveedor o info confidencial.
                      </div>
                    </div>
                    {currentMode === 'erase' && (
                      <span style={{ marginLeft: 'auto', fontSize: '14px', color: '#ee0055', flexShrink: 0 }}>●</span>
                    )}
                  </button>

                  <p style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '10px', lineHeight: 1.5 }}>
                    Selecciona la herramienta y <strong style={{ color: 'var(--text-2)' }}>arrastra sobre el PDF</strong> para marcar la zona. Puedes usar ambas herramientas en el mismo documento.
                  </p>

                  {zones.length > 0 && (
                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>
                        {zones.length} zona{zones.length !== 1 ? 's' : ''} marcada{zones.length !== 1 ? 's' : ''}
                      </span>
                      <button onClick={() => setZones([])} style={{ fontSize: '10px', color: '#ee0055', background: 'none', border: '0.5px solid rgba(238,0,85,0.3)', padding: '3px 8px', borderRadius: '5px', cursor: 'pointer' }}>
                        Limpiar todo
                      </button>
                    </div>
                  )}
                </div>

                {/* Branding config */}
                <div style={{ marginBottom: '1.5rem' }}>
                  <div style={{ fontSize: '10px', letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '0.875rem' }}>Tu información de contacto</div>
                  {([
                    { key: 'nombre', label: 'Nombre empresa', placeholder: 'GrupoSkyLine' },
                    { key: 'telefono', label: 'Teléfono', placeholder: '+34 600 000 000' },
                    { key: 'email', label: 'Email', placeholder: 'info@gruposkyline.es' },
                    { key: 'web', label: 'Web', placeholder: 'gruposkyline.es' },
                  ] as const).map(f => (
                    <div key={f.key} style={{ marginBottom: '0.625rem' }}>
                      <label style={{ fontSize: '9px', color: 'var(--text-3)', display: 'block', marginBottom: '3px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{f.label}</label>
                      <input
                        value={branding[f.key]}
                        onChange={e => setBranding(b => ({ ...b, [f.key]: e.target.value }))}
                        placeholder={f.placeholder}
                        style={{ width: '100%', background: 'var(--bg-0)', border: '0.5px solid var(--gold-border)', color: 'var(--text-0)', padding: '7px 10px', borderRadius: '6px', fontSize: '12px', boxSizing: 'border-box' }}
                      />
                    </div>
                  ))}
                </div>

                {previewError && (
                  <p style={{ fontSize: '0.78rem', color: '#e05', marginBottom: '1rem', background: 'rgba(238,0,85,0.08)', border: '0.5px solid rgba(238,0,85,0.2)', borderRadius: '6px', padding: '8px 12px' }}>
                    ⚠ {previewError}
                  </p>
                )}
              </div>

              {/* Footer buttons */}
              <div style={{ padding: '1rem 1.25rem', borderTop: '0.5px solid var(--gold-border)', display: 'flex', flexDirection: 'column', gap: '0.625rem', flexShrink: 0 }}>
                <button
                  onClick={handlePreview}
                  disabled={previewing}
                  style={{ background: 'rgba(201,160,67,0.1)', color: 'var(--gold-200)', border: '0.5px solid rgba(201,160,67,0.4)', padding: '10px', borderRadius: 'var(--radius)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 600, opacity: previewing ? 0.6 : 1 }}
                >
                  {previewing ? '⏳ Procesando…' : '👁 Generar previsualización'}
                </button>

                {previewBlob && editingOp && (
                  <button
                    onClick={handleUpdateProcessed}
                    disabled={uploading}
                    style={{ background: 'var(--gold-200)', color: 'var(--bg-0)', border: 'none', padding: '10px', borderRadius: 'var(--radius)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 600, opacity: uploading ? 0.6 : 1 }}
                  >
                    {uploading ? 'Guardando…' : '✓ Guardar cambios en PDF'}
                  </button>
                )}

                {previewBlob && !editingOp && (
                  <button
                    onClick={handlePublishProcessed}
                    disabled={uploading || !form.titulo}
                    style={{ background: 'var(--gold-200)', color: 'var(--bg-0)', border: 'none', padding: '10px', borderRadius: 'var(--radius)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 600, opacity: (uploading || !form.titulo) ? 0.6 : 1 }}
                  >
                    {uploading ? 'Publicando…' : '✓ Confirmar y publicar'}
                  </button>
                )}

                {!form.titulo && !editingOp && (
                  <p style={{ fontSize: '10px', color: '#e05', margin: 0 }}>⚠ Rellena el título en el formulario antes de publicar</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
