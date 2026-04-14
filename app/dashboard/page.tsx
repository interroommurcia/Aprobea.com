'use client'

import React, { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useTheme } from '@/components/ThemeProvider'
import { t } from '@/lib/i18n'
import { downloadCSV, downloadExcel } from '@/lib/export'
import TicketProgress from '@/components/TicketProgress'
import MarketplaceCard from '@/components/MarketplaceCard'
import Calendario, { EventoCalendario } from '@/components/Calendario'

type Movimiento = { id: string; tipo: string; importe: number; fecha: string; descripcion: string }
type Participacion = {
  id: string; nombre_operacion: string; tipo: string; importe: number
  fecha_entrada: string; fecha_vencimiento: string; rentabilidad_anual: number
  rentabilidad_acum: number; estado: string; movimientos?: Movimiento[]
}
type Cliente = { id: string; nombre: string; apellidos: string; email: string; tipo_inversor: string; capital_inicial: number; estado: string }
type Notificacion = { id: string; titulo: string; mensaje: string; leida: boolean; created_at: string; tipo: string }
type Operacion = { id: string; titulo: string; descripcion: string; tipo: string; pdf_url: string | null; created_at: string; tickets_total: number; tickets_vendidos: number; importe_objetivo: number | null; tickets_por_participante: number }
type RentEntry = { id: string; titulo: string; descripcion: string; video_url: string | null; ubicacion: string | null; rentabilidad: string | null; precio_alquiler: number | null; precio_subarrendamiento: number | null; created_at: string }
type CodigoReferido = { id: string; codigo: string; comision_pct: number; usos: number; max_usos: number | null; activo: boolean }
type Referido = { id: string; created_at: string; comision_pct: number; comision_importe: number; comision_pagada: boolean; referred: { nombre: string; apellidos: string; email: string; created_at: string } | null }
type Conversacion = { id: string; operacion_nombre: string | null; referencia_catastral: string | null; tipo: string; ultimo_mensaje: string | null; ultimo_mensaje_at: string | null; no_leidos_cliente: number }
type MensajeChat = { id: string; created_at: string; remitente: 'admin' | 'cliente'; contenido: string | null; archivo_url: string | null; archivo_nombre: string | null; archivo_tipo: string | null; leido: boolean; requiere_firma: boolean; es_broadcast: boolean; nota_interna?: boolean }

// Tabs are computed from translations below
const TIPO_COLORS: Record<string, string> = { npl: '#b87333', crowdfunding: '#C9A043' }
const ESTADO_DOT: Record<string, string> = { activa: '#6dc86d', finalizada: '#888', pendiente: '#C9A043', cancelada: '#e05' }

function getEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`
  const vm = url.match(/vimeo\.com\/(\d+)/)
  if (vm) return `https://player.vimeo.com/video/${vm[1]}`
  return null
}

function buildChartData(parts: Participacion[], months: string[]) {
  const allMovs = parts.flatMap(p => p.movimientos || [])
  return Array.from({ length: 6 }, (_, i) => {
    const d = new Date()
    d.setMonth(d.getMonth() - (5 - i))
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = months[d.getMonth()]
    const bruta = allMovs
      .filter(m => m.fecha?.startsWith(key) && ['interes', 'dividendo'].includes(m.tipo))
      .reduce((s, m) => s + m.importe, 0)
    return { mes: label, rentabilidad: Math.round(bruta) }
  })
}

// Custom tooltip for chart
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: '#1a1610', border: '0.5px solid rgba(201,160,67,0.3)', borderRadius: '8px', padding: '10px 16px' }}>
      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</div>
      <div style={{ fontSize: '1.1rem', color: '#C9A043', fontWeight: 600 }}>{payload[0].value.toLocaleString('es-ES')}€</div>
    </div>
  )
}

// Property icon placeholder
function PropertyIcon({ tipo }: { tipo: string }) {
  return (
    <div style={{ width: '52px', height: '52px', borderRadius: '10px', background: 'rgba(201,160,67,0.08)', border: '0.5px solid rgba(201,160,67,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={TIPO_COLORS[tipo] ?? '#C9A043'} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9,22 9,12 15,12 15,22"/>
      </svg>
    </div>
  )
}

export default function DashboardPage() {
  const { lang } = useTheme()
  const i18n = t(lang)
  const TABS = [i18n.dashboard, i18n.myInvestments, i18n.marketplace, i18n.transactions, i18n.messages, i18n.referrals, 'Calendario', 'Asistente IA', i18n.profile]
  const [tab, setTab] = useState(i18n.dashboard)
  const [eventos, setEventos] = useState<EventoCalendario[]>([])
  const [chatToken2, setChatToken2] = useState('')
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [parts, setParts] = useState<Participacion[]>([])
  const [notifs, setNotifs] = useState<Notificacion[]>([])
  const [ops, setOps] = useState<Operacion[]>([])
  const [rentEntries, setRentEntries] = useState<RentEntry[]>([])
  const [codigoRef, setCodigoRef] = useState<CodigoReferido | null>(null)
  const [referidos, setReferidos] = useState<Referido[]>([])
  const [showNotifs, setShowNotifs] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showCalWidget, setShowCalWidget] = useState(false)
  // Chat IA
  type IaMsg = { role: 'user' | 'assistant'; content: string; modo?: 'gratuito'; cita?: { tipo: string; fecha?: string; hora?: string } }
  const [iaMsgs, setIaMsgs] = useState<IaMsg[]>([])
  const [iaInput, setIaInput] = useState('')
  const [iaLoading, setIaLoading] = useState(false)
  const [iaStream, setIaStream] = useState('')
  const [iaUso, setIaUso] = useState<{ gasto: number; limite: number; periodo: string; modoGratuito: boolean } | null>(null)
  const iaChatEndRef = useRef<HTMLDivElement>(null)
  const [expandedPart, setExpandedPart] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  // Chat state
  const [convs, setConvs] = useState<Conversacion[]>([])
  const [selectedConv, setSelectedConv] = useState<Conversacion | null>(null)
  const [chatMsgs, setChatMsgs] = useState<MensajeChat[]>([])
  const [chatTexto, setChatTexto] = useState('')
  const [chatArchivo, setChatArchivo] = useState<File | null>(null)
  const [chatEnviando, setChatEnviando] = useState(false)
  const [chatToken, setChatToken] = useState('')
  const [renovando, setRenovando] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const chatFileRef = useRef<HTMLInputElement>(null)
  const bellRef = useRef<HTMLDivElement>(null)
  const profileRef = useRef<HTMLDivElement>(null)
  const calWidgetRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push('/login'); return }
      supabase.from('clientes').select('*').eq('user_id', user.id).single().then(({ data: c }) => {
        if (!c) { setLoading(false); return }
        setCliente(c)
        supabase.auth.getSession().then(({ data: { session } }) => {
          const token = session?.access_token || ''
          Promise.all([
            supabase.from('participaciones').select('*, movimientos(*)').eq('cliente_id', c.id),
            supabase.from('notificaciones').select('*').eq('cliente_id', c.id).order('created_at', { ascending: false }),
            fetch('/api/operaciones').then(r => r.json()),
            fetch('/api/rent-to-rent').then(r => r.json()),
            fetch('/api/referidos', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
          ]).then(([{ data: ps }, { data: ns }, opData, rentData, refData]) => {
            setParts(Array.isArray(ps) ? ps : [])
            setNotifs(Array.isArray(ns) ? ns : [])
            setOps(Array.isArray(opData) ? opData : [])
            setRentEntries(Array.isArray(rentData) ? rentData : [])
            if (refData && !refData.error) {
              setCodigoRef(refData.codigo || null)
              setReferidos(Array.isArray(refData.referidos) ? refData.referidos : [])
            }
            setChatToken(token)
            setChatToken2(token)
            loadIaUso(token)
            // Load conversations
            fetch('/api/chat', { headers: { Authorization: `Bearer ${token}` } })
              .then(r => r.ok ? r.json() : [])
              .then(d => setConvs(Array.isArray(d) ? d : []))
            // Load calendario + auto-eventos de vencimientos
            fetch('/api/calendario', { headers: { Authorization: `Bearer ${token}` } })
              .then(r => r.ok ? r.json() : [])
              .then((evs: EventoCalendario[]) => {
                // Añadir eventos automáticos de vencimientos desde participaciones
                const autoEvs: EventoCalendario[] = (Array.isArray(ps) ? ps as any[] : [])
                  .filter((p: any) => p.fecha_vencimiento)
                  .map((p: any) => ({
                    id: `auto-venc-${p.id}`,
                    titulo: `Vencimiento: ${p.nombre_operacion}`,
                    descripcion: `Importe: ${p.importe.toLocaleString('es-ES')}€ · Rentabilidad: ${p.rentabilidad_anual}%`,
                    fecha: p.fecha_vencimiento.slice(0, 10),
                    tipo: 'vencimiento' as const,
                  }))
                setEventos([...(Array.isArray(evs) ? evs : []), ...autoEvs])
              })
            setLoading(false)
          })
        })
      })
    })
  }, [router])

  // Load messages when a conversation is selected + realtime subscription
  useEffect(() => {
    if (!selectedConv || !chatToken) return
    setChatMsgs([])
    fetch(`/api/chat/mensajes?conversacion_id=${selectedConv.id}`, { headers: { Authorization: `Bearer ${chatToken}` } })
      .then(r => r.ok ? r.json() : [])
      .then(d => { setChatMsgs(Array.isArray(d) ? d : []) })

    // Realtime: new messages in this conversation
    const channel = supabase.channel(`chat-${selectedConv.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `conversacion_id=eq.${selectedConv.id}` }, (payload) => {
        const m = payload.new as MensajeChat
        if (!m.nota_interna) setChatMsgs(prev => prev.some(x => x.id === m.id) ? prev : [...prev, m])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedConv?.id, chatToken])

  // Scroll to bottom on new messages
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatMsgs])
  useEffect(() => { iaChatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [iaMsgs, iaStream])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) setShowNotifs(false)
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setShowProfile(false)
      if (calWidgetRef.current && !calWidgetRef.current.contains(e.target as Node)) setShowCalWidget(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function markAllRead() {
    const unread = notifs.filter(n => !n.leida).map(n => n.id)
    if (!unread.length) return
    await supabase.from('notificaciones').update({ leida: true }).in('id', unread)
    setNotifs(prev => prev.map(n => ({ ...n, leida: true })))
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  async function loadIaUso(token: string) {
    const r = await fetch('/api/ia/uso', { headers: { Authorization: `Bearer ${token}` } })
    if (r.ok) setIaUso(await r.json())
  }

  async function sendIa(text: string) {
    if (!text.trim() || iaLoading) return
    const newMsgs: IaMsg[] = [...iaMsgs, { role: 'user', content: text }]
    setIaMsgs(newMsgs)
    setIaInput('')
    setIaLoading(true)
    setIaStream('')

    const res = await fetch('/api/ia/chat-cliente', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chatToken2}` },
      body: JSON.stringify({ messages: newMsgs.map(m => ({ role: m.role, content: m.content })) }),
    })

    const reader = res.body?.getReader()
    const decoder = new TextDecoder()
    let full = ''
    let esGratuito = false
    let citaCreada: { tipo: string; fecha?: string; hora?: string } | undefined

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        for (const line of decoder.decode(value).split('\n')) {
          if (line.startsWith('data: ') && line !== 'data: [DONE]') {
            try {
              const parsed = JSON.parse(line.slice(6))
              if (parsed.error) { full = `⚠️ ${parsed.error}`; setIaStream(full) }
              if (parsed.text) { full += parsed.text; setIaStream(s => s + parsed.text) }
              if (parsed.modo === 'gratuito') esGratuito = true
              if (parsed.cita_creada) citaCreada = { tipo: parsed.tipo, fecha: parsed.fecha, hora: parsed.hora }
            } catch {}
          }
        }
      }
    }

    setIaMsgs(m => [...m, { role: 'assistant', content: full || '⚠️ Sin respuesta. Comprueba la configuración de la IA.', modo: esGratuito ? 'gratuito' : undefined, cita: citaCreada }])
    setIaStream('')
    setIaLoading(false)
    // Refrescar uso tras cada mensaje
    if (chatToken2) loadIaUso(chatToken2)
  }

  const totalPortafolio = parts.filter(p => p.estado !== 'cancelada').reduce((s, p) => s + p.importe, 0)
  const rentabilidadPromedio = parts.length > 0
    ? (parts.reduce((s, p) => s + p.rentabilidad_anual, 0) / parts.length).toFixed(1)
    : '0.0'
  const partsActivas = parts.filter(p => p.estado === 'activa')
  const proximosCobros = parts
    .filter(p => p.estado === 'activa' && p.fecha_vencimiento)
    .filter(p => {
      const diff = new Date(p.fecha_vencimiento).getTime() - Date.now()
      return diff > 0 && diff < 90 * 86400000
    })
    .reduce((s, p) => s + (p.importe * p.rentabilidad_anual / 100 / 4), 0)

  const unreadCount = notifs.filter(n => !n.leida).length
  const chartData = buildChartData(parts, i18n.months)
  const initials = cliente ? `${cliente.nombre[0]}${cliente.apellidos[0]}`.toUpperCase() : 'SL'

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--text-2)' }}>Cargando…</p>
    </div>
  )

  if (!cliente) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--text-2)', marginBottom: '1rem' }}>No se encontró tu perfil de cliente.</p>
        <button onClick={handleLogout} style={{ background: 'transparent', border: '0.5px solid var(--gold-border)', color: 'var(--gold-200)', padding: '8px 20px', borderRadius: 'var(--radius)', cursor: 'pointer', fontSize: '0.82rem' }}>Cerrar sesión</button>
      </div>
    </div>
  )

  // ─── Acceso pausado: perfil existe pero membresía inactiva ───
  const tieneAcceso = (cliente as any).membresia_crowdfunding_activa || (cliente as any).membresia_gratis || (cliente as any).suscripcion_activa
  if (!tieneAcceso && cliente.tipo_inversor === 'crowdfunding') {
    const handleRenovar = async () => {
      setRenovando(true)
      const res = await fetch('/api/stripe/membresia', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: (cliente as any).user_id, email: cliente.email, nombre: `${cliente.nombre} ${cliente.apellidos}` }),
      })
      const { url } = await res.json()
      if (url) window.location.href = url
      else setRenovando(false)
    }
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg-0)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ maxWidth: '460px', width: '100%', textAlign: 'center' }}>
          {/* Icono */}
          <div style={{ width: '72px', height: '72px', borderRadius: '50%', border: '0.5px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem', fontSize: '28px' }}>⏸</div>

          <div style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--gold-200)', marginBottom: '1rem' }}>Membresía Crowdfunding</div>
          <h2 style={{ fontFamily: 'var(--font-cormorant), serif', fontSize: '2rem', fontWeight: 300, color: 'var(--text-0)', marginBottom: '1rem' }}>
            Acceso temporalmente pausado
          </h2>
          <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '2rem' }}>
            Tu membresía anual ha vencido o el último pago no se procesó correctamente. Tu perfil y datos están intactos — reactiva tu acceso en cualquier momento.
          </p>

          {/* Pricing reminder */}
          <div style={{ background: 'rgba(201,160,67,0.06)', border: '0.5px solid var(--gold-border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem', marginBottom: '1.75rem' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: '0.5rem' }}>Membresía anual · Consigna de documento y capital</div>
            <div style={{ fontSize: '2rem', fontFamily: 'var(--font-cormorant), serif', fontWeight: 300, color: 'var(--gold-100)' }}>60€ <span style={{ fontSize: '0.9rem', color: 'var(--text-2)' }}>+ IVA / año</span></div>
          </div>

          <button
            onClick={handleRenovar}
            disabled={renovando}
            style={{ width: '100%', padding: '14px', background: 'var(--gold-200)', color: 'var(--bg-0)', border: 'none', borderRadius: 'var(--radius)', fontFamily: 'var(--font-outfit), sans-serif', fontSize: '12px', letterSpacing: '0.12em', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 600, marginBottom: '0.75rem', opacity: renovando ? 0.7 : 1 }}
          >
            {renovando ? 'Redirigiendo…' : 'Reactivar membresía →'}
          </button>

          <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: '1.5rem' }}>
            ¿Tienes algún problema? Escríbenos a <a href="mailto:hola@gruposkyline.org" style={{ color: 'var(--gold-200)' }}>hola@gruposkyline.org</a>
          </p>

          <button onClick={handleLogout} style={{ background: 'transparent', border: 'none', color: 'var(--text-3)', fontSize: '0.78rem', cursor: 'pointer', textDecoration: 'underline' }}>
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  // ─── Tab: Dashboard ───────────────────────────────────────
  const tabDashboard = (
    <>
      {/* Greeting */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 600, color: 'var(--text-0)', margin: 0 }}>
            {lang === 'es' ? `Hola ${cliente.nombre}, ` : `Hello ${cliente.nombre}, `}{i18n.goodDay}
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', marginTop: '6px' }}>
            {i18n.portfolioSummary}
          </p>
        </div>
        {codigoRef && (
          <div style={{ background: 'rgba(201,160,67,0.08)', border: '0.5px solid rgba(201,160,67,0.3)', borderRadius: '8px', padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{i18n.referralCode}</span>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--gold-200)', letterSpacing: '0.05em' }}>#{codigoRef.codigo}</span>
            <button onClick={() => navigator.clipboard.writeText(codigoRef.codigo)} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '11px', padding: '0 4px' }} title="Copiar">⎘</button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="rsp-grid-4" style={{ marginBottom: '2rem' }}>
        {[
          { label: i18n.totalPortfolio, value: `${totalPortafolio.toLocaleString('es-ES')}€`, highlight: true },
          { label: i18n.avgReturn, value: `${rentabilidadPromedio}%` },
          { label: i18n.activeInvestments, value: String(partsActivas.length) },
          { label: i18n.upcomingPayments, value: `${Math.round(proximosCobros).toLocaleString('es-ES')}€` },
        ].map((k, idx) => (
          <div key={k.label} style={{
            background: k.highlight ? 'linear-gradient(135deg, rgba(201,160,67,0.12) 0%, rgba(201,160,67,0.04) 100%)' : 'var(--bg-2)',
            border: `0.5px solid ${k.highlight ? 'rgba(201,160,67,0.35)' : 'var(--gold-border)'}`,
            borderRadius: '14px', padding: '1.5rem 1.75rem',
          }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-3)', marginBottom: '0.6rem', letterSpacing: '0.03em' }}>{k.label}</div>
            <div style={{ fontSize: idx === 0 ? '1.8rem' : '1.6rem', fontWeight: 700, color: 'var(--gold-100)', lineHeight: 1 }}>{k.value}</div>
          </div>
        ))}
      </div>

      {/* Chart + Investments */}
      <div className="rsp-grid-2" style={{ marginBottom: '2rem' }}>
        {/* Chart */}
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', padding: '1.75rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-0)' }}>{i18n.grossReturn}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '2px' }}>{i18n.chartSub}</div>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.1em', textTransform: 'uppercase', border: '0.5px solid var(--gold-border)', padding: '4px 10px', borderRadius: '6px' }}>{i18n.months6}</div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C9A043" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#C9A043" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
              <XAxis dataKey="mes" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false}/>
              <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => v > 999 ? `${(v/1000).toFixed(0)}K` : String(v)}/>
              <Tooltip content={<ChartTooltip />}/>
              <Area type="monotone" dataKey="rentabilidad" stroke="#C9A043" strokeWidth={2.5} fill="url(#goldGrad)" dot={false} activeDot={{ r: 5, fill: '#C9A043', stroke: '#1a1610', strokeWidth: 2 }}/>
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Investments */}
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', padding: '1.75rem', display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-0)' }}>{i18n.activeInvestmentsTitle}</div>
            <button onClick={() => setTab(i18n.myInvestments)} style={{ background: 'none', border: 'none', color: 'var(--gold-200)', fontSize: '11px', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{i18n.viewAll}</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1 }}>
            {partsActivas.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p style={{ color: 'var(--text-3)', fontSize: '0.82rem', textAlign: 'center' }}>{i18n.noActiveInvestments}</p>
              </div>
            ) : partsActivas.slice(0, 3).map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1rem', background: 'var(--bg-3)', borderRadius: '10px', border: '0.5px solid var(--gold-border)' }}>
                <PropertyIcon tipo={p.tipo}/>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.nombre_operacion}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '2px' }}>
                    <span style={{ color: TIPO_COLORS[p.tipo] ?? 'var(--gold-200)' }}>{p.tipo.toUpperCase()}</span>
                    {' · '}Rentabilidad {p.rentabilidad_anual}% anual
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--gold-100)', marginTop: '4px' }}>{p.importe.toLocaleString('es-ES')}€</div>
                </div>
                <button
                  onClick={() => { setExpandedPart(p.id); setTab('Mis Inversiones') }}
                  style={{ background: 'var(--gold-200)', color: '#1a1506', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '11px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', letterSpacing: '0.04em' }}
                >
                  {i18n.viewDetails}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Operaciones + Rent to Rent previews */}
      {ops.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--text-0)' }}>{i18n.studiedOperations}</div>
            <button onClick={() => setTab(i18n.marketplace)} style={{ background: 'none', border: 'none', color: 'var(--gold-200)', fontSize: '11px', cursor: 'pointer', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{i18n.viewAll}</button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
            {ops.slice(0, 3).map(op => (
              <div key={op.id} style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '12px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <span style={{ padding: '3px 8px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.12em', color: TIPO_COLORS[op.tipo] ?? 'var(--gold-200)', border: `0.5px solid ${TIPO_COLORS[op.tipo] ?? 'var(--gold-border)'}`, borderRadius: '5px', width: 'fit-content' }}>{op.tipo}</span>
                <div style={{ fontWeight: 600, color: 'var(--text-0)', fontSize: '0.88rem', lineHeight: 1.4 }}>{op.titulo}</div>
                {op.descripcion && <div style={{ fontSize: '0.75rem', color: 'var(--text-2)', lineHeight: 1.6 }}>{op.descripcion.slice(0, 80)}{op.descripcion.length > 80 ? '…' : ''}</div>}
                {op.pdf_url && (
                  <a href={op.pdf_url} target="_blank" rel="noopener noreferrer" style={{ marginTop: 'auto', display: 'inline-flex', alignItems: 'center', gap: '5px', textDecoration: 'none', color: 'var(--gold-200)', fontSize: '10px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/></svg>
                    {i18n.viewReport}
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )

  // ─── Tab: Mis Inversiones ─────────────────────────────────
  const tabInversiones = (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-0)', margin: 0 }}>{i18n.myParticipations}</h2>
        <p style={{ color: 'var(--text-3)', fontSize: '0.8rem', marginTop: '4px' }}>{i18n.participationsTotal(parts.length)}</p>
      </div>
      <div className="export-bar" style={{ marginBottom: '1rem' }}>
        <button className="btn-export" onClick={() => downloadCSV(parts.map(p => ({ Operación: p.nombre_operacion, Tipo: p.tipo, Capital: p.importe, 'Rentabilidad %': p.rentabilidad_anual, Estado: p.estado, 'Fecha entrada': p.fecha_entrada, 'Fecha vencimiento': p.fecha_vencimiento ?? '' })), 'participaciones')}>{i18n.exportCSV}</button>
        <button className="btn-export-excel" onClick={() => downloadExcel(parts.map(p => ({ Operación: p.nombre_operacion, Tipo: p.tipo, Capital: p.importe, 'Rentabilidad %': p.rentabilidad_anual, Estado: p.estado, 'Fecha entrada': p.fecha_entrada, 'Fecha vencimiento': p.fecha_vencimiento ?? '' })), 'participaciones')}>{i18n.exportExcel}</button>
      </div>
      {parts.length === 0 ? (
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-3)', fontSize: '0.88rem' }}>{i18n.noParticipations}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {parts.map(p => (
            <div key={p.id} style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', overflow: 'hidden' }}>
              <div
                style={{ padding: '1.25rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', cursor: 'pointer' }}
                onClick={() => setExpandedPart(expandedPart === p.id ? null : p.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <PropertyIcon tipo={p.tipo}/>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-0)', fontSize: '0.95rem' }}>{p.nombre_operacion}</span>
                      <span style={{ padding: '2px 7px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.1em', color: TIPO_COLORS[p.tipo] ?? 'var(--gold-200)', border: `0.5px solid ${TIPO_COLORS[p.tipo] ?? 'var(--gold-border)'}`, borderRadius: '5px' }}>{p.tipo}</span>
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '4px' }}>
                      {p.fecha_entrada}{p.fecha_vencimiento ? ` → ${p.fecha_vencimiento}` : ''}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--gold-100)' }}>{p.importe.toLocaleString('es-ES')}€</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{i18n.capital}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gold-200)' }}>{p.rentabilidad_anual}%</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{i18n.annual}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#6dc86d' }}>{(p.rentabilidad_acum ?? 0).toLocaleString('es-ES')}€</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>{i18n.cumulative}</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: ESTADO_DOT[p.estado] ?? '#888', display: 'inline-block' }}/>
                    <span style={{ fontSize: '10px', color: ESTADO_DOT[p.estado] ?? 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{p.estado}</span>
                  </div>
                  <span style={{ color: 'var(--text-3)', fontSize: '12px', transform: expandedPart === p.id ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                </div>
              </div>
              {expandedPart === p.id && p.movimientos && p.movimientos.length > 0 && (
                <div className="table-scroll" style={{ borderTop: '0.5px solid var(--gold-border)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: 'rgba(0,0,0,0.2)' }}>
                        {[i18n.date, i18n.type, i18n.amount, i18n.description].map(h => (
                          <th key={h} style={{ padding: '0.6rem 1.5rem', textAlign: 'left', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 400 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {p.movimientos.map(m => (
                        <tr key={m.id} style={{ borderBottom: '0.5px solid rgba(62,59,53,0.2)' }}>
                          <td style={{ padding: '0.65rem 1.5rem', fontSize: '0.78rem', color: 'var(--text-2)' }}>{m.fecha}</td>
                          <td style={{ padding: '0.65rem 1.5rem' }}>
                            <span style={{ padding: '2px 7px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', borderRadius: '5px', background: m.tipo === 'entrada' ? 'rgba(100,200,100,0.1)' : ['interes','dividendo'].includes(m.tipo) ? 'rgba(201,160,67,0.1)' : 'rgba(255,80,80,0.1)', color: m.tipo === 'entrada' ? '#6dc86d' : ['interes','dividendo'].includes(m.tipo) ? 'var(--gold-200)' : '#e05' }}>{m.tipo}</span>
                          </td>
                          <td style={{ padding: '0.65rem 1.5rem', fontSize: '0.88rem', fontWeight: 600, color: ['salida','comision'].includes(m.tipo) ? '#e05' : m.tipo === 'entrada' ? 'var(--text-0)' : '#6dc86d' }}>
                            {['salida','comision'].includes(m.tipo) ? '-' : '+'}{m.importe.toLocaleString('es-ES')}€
                          </td>
                          <td style={{ padding: '0.65rem 1.5rem', fontSize: '0.78rem', color: 'var(--text-2)' }}>{m.descripcion || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )

  // ─── Tab: Marketplace (Operaciones) ───────────────────────
  const tabMarketplace = (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-0)', margin: 0 }}>{i18n.studiedOperations}</h2>
        <p style={{ color: 'var(--text-3)', fontSize: '0.8rem', marginTop: '4px' }}>Operaciones analizadas y seleccionadas por el equipo de GrupoSkyLine.</p>
      </div>
      {ops.length === 0 ? (
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-3)', fontSize: '0.88rem' }}>No hay operaciones publicadas aún.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
          {ops.map(op => (
            <MarketplaceCard
              key={op.id}
              op={op as any}
              onVerPDF={op.pdf_url ? () => window.open(op.pdf_url!, '_blank') : undefined}
              userEmail={cliente?.email}
              userId={(cliente as any)?.user_id}
            />
          ))}
        </div>
      )}
      {/* Rent to Rent */}
      {rentEntries.length > 0 && (
        <>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 600, color: 'var(--text-0)', margin: '2.5rem 0 1rem' }}>Rent to Rent</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {rentEntries.map(e => (
              <div key={e.id} style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', overflow: 'hidden' }}>
                {e.video_url && getEmbedUrl(e.video_url) && (
                  <div style={{ aspectRatio: '16/9', background: '#000' }}>
                    <iframe src={getEmbedUrl(e.video_url)!} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen/>
                  </div>
                )}
                <div style={{ padding: '1.5rem 2rem' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-0)', marginBottom: '0.5rem' }}>{e.titulo}</h3>
                  {e.descripcion && <p style={{ fontSize: '0.82rem', color: 'var(--text-2)', lineHeight: 1.6, marginBottom: '1rem' }}>{e.descripcion}</p>}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem' }}>
                    {e.ubicacion && <div><div style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '2px' }}>Ubicación</div><div style={{ fontSize: '0.85rem', color: 'var(--text-1)' }}>{e.ubicacion}</div></div>}
                    {e.rentabilidad && <div><div style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '2px' }}>Rentabilidad</div><div style={{ fontSize: '0.85rem', color: '#6dc86d', fontWeight: 600 }}>{e.rentabilidad}</div></div>}
                    {e.precio_alquiler && <div><div style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '2px' }}>Alquiler</div><div style={{ fontSize: '0.85rem', color: 'var(--text-1)' }}>{e.precio_alquiler.toLocaleString('es-ES')}€/mes</div></div>}
                    {e.precio_subarrendamiento && <div><div style={{ fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '2px' }}>Subarrendamiento</div><div style={{ fontSize: '0.85rem', color: 'var(--gold-200)', fontWeight: 600 }}>{e.precio_subarrendamiento.toLocaleString('es-ES')}€/mes</div></div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )

  // ─── Tab: Transacciones ───────────────────────────────────
  const allMovimientos = parts.flatMap(p =>
    (p.movimientos || []).map(m => ({ ...m, operacion: p.nombre_operacion, tipo_inv: p.tipo }))
  ).sort((a, b) => b.fecha.localeCompare(a.fecha))

  const tabTransacciones = (
    <div>
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-0)', margin: 0 }}>{i18n.transactionHistory}</h2>
        <p style={{ color: 'var(--text-3)', fontSize: '0.8rem', marginTop: '4px' }}>{i18n.transactionsTotal(allMovimientos.length)}</p>
      </div>
      <div className="export-bar" style={{ marginBottom: '1rem' }}>
        <button className="btn-export" onClick={() => downloadCSV(allMovimientos.map(m => ({ Fecha: m.fecha, Operación: m.operacion, Tipo: m.tipo, Importe: m.importe, Descripción: m.descripcion ?? '' })), 'transacciones')}>{i18n.exportCSV}</button>
        <button className="btn-export-excel" onClick={() => downloadExcel(allMovimientos.map(m => ({ Fecha: m.fecha, Operación: m.operacion, Tipo: m.tipo, Importe: m.importe, Descripción: m.descripcion ?? '' })), 'transacciones')}>{i18n.exportExcel}</button>
      </div>
      {allMovimientos.length === 0 ? (
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', padding: '3rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-3)', fontSize: '0.88rem' }}>{i18n.noTransactions}</p>
        </div>
      ) : (
        <div className="table-scroll" style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.25)' }}>
                {[i18n.date, i18n.operation, i18n.type, i18n.amount, i18n.description].map(h => (
                  <th key={h} style={{ padding: '0.875rem 1.5rem', textAlign: 'left', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 400 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allMovimientos.map(m => (
                <tr key={m.id} style={{ borderBottom: '0.5px solid rgba(62,59,53,0.2)' }}>
                  <td style={{ padding: '0.875rem 1.5rem', fontSize: '0.78rem', color: 'var(--text-2)', whiteSpace: 'nowrap' }}>{m.fecha}</td>
                  <td style={{ padding: '0.875rem 1.5rem' }}>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-0)', fontWeight: 500 }}>{m.operacion}</div>
                    <div style={{ fontSize: '10px', color: TIPO_COLORS[m.tipo_inv] ?? 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: '2px' }}>{m.tipo_inv}</div>
                  </td>
                  <td style={{ padding: '0.875rem 1.5rem' }}>
                    <span style={{ padding: '2px 7px', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.08em', borderRadius: '5px', background: m.tipo === 'entrada' ? 'rgba(100,200,100,0.1)' : ['interes','dividendo'].includes(m.tipo) ? 'rgba(201,160,67,0.1)' : 'rgba(255,80,80,0.1)', color: m.tipo === 'entrada' ? '#6dc86d' : ['interes','dividendo'].includes(m.tipo) ? 'var(--gold-200)' : '#e05' }}>{m.tipo}</span>
                  </td>
                  <td style={{ padding: '0.875rem 1.5rem', fontSize: '0.9rem', fontWeight: 700, color: ['salida','comision'].includes(m.tipo) ? '#e05' : m.tipo === 'entrada' ? 'var(--text-0)' : '#6dc86d' }}>
                    {['salida','comision'].includes(m.tipo) ? '−' : '+'}{m.importe.toLocaleString('es-ES')}€
                  </td>
                  <td style={{ padding: '0.875rem 1.5rem', fontSize: '0.78rem', color: 'var(--text-2)' }}>{m.descripcion || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )

  // ─── Tab: Referidos ───────────────────────────────────────
  const tabReferidos = (
    <div>
      {!codigoRef ? (
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', padding: '3rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔗</div>
          <p style={{ color: 'var(--text-1)', fontWeight: 600, marginBottom: '0.5rem' }}>{i18n.referralProgram}</p>
          <p style={{ color: 'var(--text-3)', fontSize: '0.82rem' }}>{i18n.noReferralCode}</p>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-0)', margin: 0 }}>{i18n.inviteAndEarn}</h2>
            <p style={{ color: 'var(--text-3)', fontSize: '0.8rem', marginTop: '4px' }}>{i18n.inviteSubtitle}</p>
          </div>
          <div className="rsp-grid-2" style={{ marginBottom: '1.5rem' }}>
            <div style={{ background: 'linear-gradient(135deg, rgba(201,160,67,0.1) 0%, rgba(201,160,67,0.03) 100%)', border: '0.5px solid rgba(201,160,67,0.35)', borderRadius: '14px', padding: '1.75rem' }}>
              <div style={{ fontSize: '10px', letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '0.75rem' }}>{i18n.yourCode}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--gold-100)', letterSpacing: '0.08em' }}>{codigoRef.codigo}</span>
                <button onClick={() => navigator.clipboard.writeText(codigoRef.codigo)} style={{ background: 'rgba(201,160,67,0.1)', border: '0.5px solid rgba(201,160,67,0.3)', color: 'var(--gold-200)', padding: '5px 12px', borderRadius: '7px', cursor: 'pointer', fontSize: '10px', letterSpacing: '0.08em' }}>{i18n.copy}</button>
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', lineHeight: 1.6 }}>
                {i18n.referralShareDesc}
              </div>
            </div>
            <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', padding: '1.75rem', display: 'flex', gap: '2.5rem', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--gold-100)' }}>{codigoRef.usos}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '4px' }}>{i18n.referralsTotalLabel}{codigoRef.max_usos ? ` / ${codigoRef.max_usos} máx.` : ''}</div>
              </div>
              <div>
                <div style={{ fontSize: '2rem', fontWeight: 700, color: '#6dc86d' }}>
                  {referidos.reduce((s, r) => s + (r.comision_importe ?? 0), 0).toLocaleString('es-ES')}€
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-3)', marginTop: '4px' }}>{i18n.commissionsGenerated}</div>
              </div>
            </div>
          </div>
          {referidos.length > 0 && (
            <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.25)' }}>
                    {[i18n.referredInvestor, i18n.date, i18n.commPct, i18n.commAmount, i18n.status].map(h => (
                      <th key={h} style={{ padding: '0.75rem 1.5rem', textAlign: 'left', fontSize: '9px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', fontWeight: 400 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {referidos.map(r => (
                    <tr key={r.id} style={{ borderBottom: '0.5px solid rgba(62,59,53,0.2)' }}>
                      <td style={{ padding: '0.875rem 1.5rem' }}>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-0)', fontWeight: 600 }}>{r.referred ? `${r.referred.nombre} ${r.referred.apellidos}` : '—'}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-3)', marginTop: '2px' }}>{r.referred?.email}</div>
                      </td>
                      <td style={{ padding: '0.875rem 1.5rem', fontSize: '0.78rem', color: 'var(--text-2)' }}>{r.referred ? new Date(r.referred.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</td>
                      <td style={{ padding: '0.875rem 1.5rem', fontSize: '0.88rem', color: 'var(--gold-200)', fontWeight: 600 }}>{r.comision_pct}%</td>
                      <td style={{ padding: '0.875rem 1.5rem', fontSize: '0.88rem', fontWeight: 600, color: r.comision_importe > 0 ? '#6dc86d' : 'var(--text-3)' }}>{r.comision_importe > 0 ? `${r.comision_importe.toLocaleString('es-ES')}€` : '—'}</td>
                      <td style={{ padding: '0.875rem 1.5rem' }}>
                        <span style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '5px', textTransform: 'uppercase', letterSpacing: '0.08em', background: r.comision_pagada ? 'rgba(100,200,100,0.1)' : 'rgba(201,160,67,0.08)', color: r.comision_pagada ? '#6dc86d' : 'var(--gold-200)', border: `0.5px solid ${r.comision_pagada ? '#6dc86d44' : 'rgba(201,160,67,0.25)'}` }}>{r.comision_pagada ? i18n.paid : i18n.pending}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )

  // ─── Tab: Perfil ──────────────────────────────────────────
  const tabPerfil = (
    <div style={{ maxWidth: '560px' }}>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 600, color: 'var(--text-0)', marginBottom: '1.5rem' }}>{i18n.myProfile}</h2>
      <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {[
          { label: i18n.name, value: `${cliente.nombre} ${cliente.apellidos}` },
          { label: i18n.email, value: cliente.email },
          { label: i18n.investorType, value: cliente.tipo_inversor.toUpperCase() },
          { label: i18n.accountStatus, value: cliente.estado.toUpperCase() },
          { label: i18n.initialCapital, value: `${cliente.capital_inicial.toLocaleString('es-ES')}€` },
        ].map(f => (
          <div key={f.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1rem', borderBottom: '0.5px solid var(--gold-border)' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-3)' }}>{f.label}</span>
            <span style={{ fontSize: '0.88rem', color: 'var(--text-0)', fontWeight: 500 }}>{f.value}</span>
          </div>
        ))}
      </div>
      <Link href="/dashboard/configuracion" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', marginTop: '1rem', textDecoration: 'none', color: 'var(--gold-200)', fontSize: '0.82rem', border: '0.5px solid var(--gold-border)', padding: '10px 18px', borderRadius: '8px' }}>
        {i18n.accountPrefs}
      </Link>
    </div>
  )

  // ─── Chat send ────────────────────────────────────────────
  async function handleChatSend(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedConv || (!chatTexto.trim() && !chatArchivo) || !chatToken) return
    setChatEnviando(true)
    let body: FormData | string
    if (chatArchivo) {
      const fd = new FormData()
      fd.append('conversacion_id', selectedConv.id)
      if (chatTexto.trim()) fd.append('contenido', chatTexto.trim())
      fd.append('archivo', chatArchivo)
      body = fd
    } else {
      body = JSON.stringify({ conversacion_id: selectedConv.id, contenido: chatTexto.trim() })
    }
    const res = await fetch('/api/chat/mensajes', {
      method: 'POST',
      headers: chatArchivo ? { Authorization: `Bearer ${chatToken}` } : { 'Content-Type': 'application/json', Authorization: `Bearer ${chatToken}` },
      body,
    })
    if (res.ok) {
      const msg = await res.json()
      setChatMsgs(prev => [...prev, msg])
      setChatTexto(''); setChatArchivo(null)
      setConvs(prev => prev.map(c => c.id === selectedConv.id ? { ...c, ultimo_mensaje: msg.contenido || msg.archivo_nombre, ultimo_mensaje_at: msg.created_at } : c))
    }
    setChatEnviando(false)
  }

  // ─── Tab: Mensajes ────────────────────────────────────────
  const unreadMsgs = convs.reduce((s, c) => s + (c.no_leidos_cliente || 0), 0)

  const tabMensajes = (
    <div className="chat-layout" style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}>
      {/* Conversation list */}
      <div style={{ width: '280px', flexShrink: 0, background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1rem', borderBottom: '0.5px solid var(--gold-border)', flexShrink: 0 }}>
          <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-0)' }}>{i18n.myConversations}</div>
          <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px' }}>{i18n.chatWithAdvisor}</div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {convs.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '12px' }}>
              {i18n.noConversations}
            </div>
          ) : convs.map(c => (
            <div key={c.id} onClick={() => { setSelectedConv(c); setConvs(prev => prev.map(x => x.id === c.id ? { ...x, no_leidos_cliente: 0 } : x)) }}
              style={{ padding: '0.875rem 1rem', cursor: 'pointer', borderBottom: '0.5px solid rgba(62,59,53,0.2)', background: selectedConv?.id === c.id ? 'rgba(201,160,67,0.07)' : 'transparent', borderLeft: selectedConv?.id === c.id ? '2px solid var(--gold-200)' : '2px solid transparent' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                  {c.operacion_nombre || 'GrupoSkyLine'}
                </div>
                {c.no_leidos_cliente > 0 && (
                  <span style={{ background: 'var(--gold-200)', color: '#1a1506', borderRadius: '10px', fontSize: '9px', fontWeight: 700, padding: '1px 6px', flexShrink: 0 }}>{c.no_leidos_cliente}</span>
                )}
              </div>
              {c.referencia_catastral && (
                <div style={{ fontSize: '10px', color: 'var(--gold-200)', marginTop: '2px' }}>🏛 {c.referencia_catastral}</div>
              )}
              <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {c.ultimo_mensaje || 'Sin mensajes aún'}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chat window */}
      {!selectedConv ? (
        <div style={{ flex: 1, background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{ fontSize: '2.5rem' }}>💬</div>
          <p style={{ color: 'var(--text-3)', fontSize: '0.85rem' }}>{i18n.selectConversation}</p>
        </div>
      ) : (
        <div style={{ flex: 1, background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid var(--gold-border)', background: 'var(--bg-1)', flexShrink: 0 }}>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-0)' }}>{selectedConv.operacion_nombre || 'GrupoSkyLine'}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '2px', display: 'flex', gap: '8px' }}>
              <span>{i18n.privateChatWith}</span>
              {selectedConv.referencia_catastral && <span style={{ color: 'var(--gold-200)' }}>🏛 {selectedConv.referencia_catastral}</span>}
            </div>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {chatMsgs.length === 0 ? (
              <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: '12px', marginTop: '2rem' }}>{i18n.noMessages}</div>
            ) : chatMsgs.map(m => {
              const isMe = m.remitente === 'cliente'
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '68%' }}>
                    {m.es_broadcast && <div style={{ fontSize: '9px', color: 'var(--gold-200)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '3px' }}>📢 {i18n.broadcastLabel}</div>}
                    {m.requiere_firma && <div style={{ fontSize: '9px', color: '#ef4444', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '3px' }}>✍️ {i18n.requiresReview}</div>}
                    <div style={{ padding: '10px 14px', borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: isMe ? 'linear-gradient(135deg, rgba(201,160,67,0.18), rgba(201,160,67,0.08))' : 'var(--bg-3)', border: `0.5px solid ${isMe ? 'rgba(201,160,67,0.25)' : 'var(--gold-border)'}` }}>
                      {m.contenido && <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-0)', lineHeight: 1.55, whiteSpace: 'pre-wrap' }}>{m.contenido}</p>}
                      {m.archivo_url && m.archivo_nombre && (
                        <a href={m.archivo_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', marginTop: m.contenido ? '8px' : '0', background: 'rgba(0,0,0,0.15)', border: '0.5px solid rgba(201,160,67,0.2)', borderRadius: '8px', padding: '7px 11px', textDecoration: 'none', color: 'var(--gold-200)', fontSize: '12px' }}>
                          <span>{m.archivo_tipo === 'imagen' ? '🖼️' : '📄'}</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>{m.archivo_nombre}</span>
                          <span style={{ color: 'var(--text-3)', fontSize: '10px' }}>↓</span>
                        </a>
                      )}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '3px', textAlign: isMe ? 'right' : 'left' }}>
                      {new Date(m.created_at).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                      {isMe && <span style={{ marginLeft: '6px', color: m.leido ? '#6dc86d' : 'var(--text-3)' }}>{m.leido ? '✓✓' : '✓'}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <form onSubmit={handleChatSend} style={{ padding: '0.875rem 1.25rem', borderTop: '0.5px solid var(--gold-border)', background: 'var(--bg-1)', flexShrink: 0 }}>
            {chatArchivo && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--bg-3)', border: '0.5px solid var(--gold-border)', borderRadius: '8px', padding: '5px 10px', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--gold-200)', flex: 1 }}>📎 {chatArchivo.name}</span>
                <button type="button" onClick={() => setChatArchivo(null)} style={{ background: 'none', border: 'none', color: '#e05', cursor: 'pointer', fontSize: '12px' }}>✕</button>
              </div>
            )}
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <button type="button" onClick={() => chatFileRef.current?.click()} style={{ background: 'var(--bg-3)', border: '0.5px solid var(--gold-border)', color: 'var(--text-2)', borderRadius: '10px', padding: '9px 11px', cursor: 'pointer', fontSize: '15px', flexShrink: 0 }} title="Adjuntar archivo">📎</button>
              <input ref={chatFileRef} type="file" style={{ display: 'none' }} onChange={e => setChatArchivo(e.target.files?.[0] || null)} />
              <input
                value={chatTexto}
                onChange={e => setChatTexto(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleChatSend(e as any) } }}
                placeholder={i18n.writePlaceholder}
                style={{ flex: 1, background: 'var(--bg-3)', border: '0.5px solid var(--gold-border)', borderRadius: '10px', padding: '9px 14px', color: 'var(--text-0)', fontSize: '0.85rem', outline: 'none' }}
              />
              <button type="submit" disabled={chatEnviando || (!chatTexto.trim() && !chatArchivo)} style={{ background: chatEnviando || (!chatTexto.trim() && !chatArchivo) ? 'var(--bg-3)' : 'var(--gold-200)', border: 'none', color: chatEnviando || (!chatTexto.trim() && !chatArchivo) ? 'var(--text-3)' : '#1a1506', borderRadius: '10px', padding: '9px 15px', cursor: 'pointer', fontSize: '15px', flexShrink: 0, transition: 'all 0.15s' }}>
                {chatEnviando ? '…' : '→'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )

  const tabCalendario = (
    <div style={{ padding: '2rem 0' }}>
      <Calendario
        eventos={eventos}
        onAddEvento={async (ev) => {
          const res = await fetch('/api/calendario', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chatToken2}` },
            body: JSON.stringify(ev),
          })
          const nuevo = await res.json()
          if (nuevo.id) setEventos(prev => [...prev, nuevo])
        }}
        onDeleteEvento={async (id) => {
          await fetch('/api/calendario', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${chatToken2}` },
            body: JSON.stringify({ id }),
          })
          setEventos(prev => prev.filter(e => e.id !== id))
        }}
        clienteId={cliente.id}
      />
    </div>
  )

  // ── TAB ASISTENTE IA ─────────────────────────────────────────────
  const SUGERENCIAS_IA = ['¿Cuál es el mínimo de inversión?', '¿Cómo funciona el crowdfunding?', '¿Qué documentos necesito?', '¿Cuánto cuesta la membresía?']
  const TIPO_COLOR_IA: Record<string, string> = { npl: '#b87333', crowdfunding: '#C9A043', hipotecario: '#7c6fd4' }

  const tabAsistenteIA = (
    <div style={{ padding: '2rem 0', maxWidth: '760px' }}>
      {/* Header + medidor de uso */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 className="serif" style={{ fontSize: '1.6rem', fontWeight: 300, color: 'var(--text-0)', marginBottom: '0.5rem' }}>Asistente IA</h2>
        <p style={{ fontSize: '0.82rem', color: 'var(--text-3)' }}>Responde tus preguntas sobre inversiones, documentación y operaciones.</p>
      </div>

      {/* Medidor de uso */}
      {iaUso && (
        <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', padding: '1rem 1.25rem', marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                Uso IA · {iaUso.periodo === 'dia' ? 'Hoy' : 'Esta semana'}
              </span>
              <span style={{ fontSize: '11px', color: iaUso.modoGratuito ? '#e05656' : '#6dc86d', fontWeight: 600 }}>
                {iaUso.modoGratuito ? '⚡ Modo básico activo' : '✦ Premium activo'}
              </span>
            </div>
            <div style={{ height: '5px', background: 'var(--bg-3)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: '3px', transition: 'width 0.5s',
                width: `${Math.min((iaUso.gasto / iaUso.limite) * 100, 100)}%`,
                background: iaUso.modoGratuito
                  ? 'linear-gradient(90deg,#e05656,#c04040)'
                  : 'linear-gradient(90deg,#C9A043,#a07828)',
              }} />
            </div>
            <div style={{ marginTop: '5px', fontSize: '10px', color: 'var(--text-3)' }}>
              {(iaUso.gasto * 100).toFixed(3)} ¢ de {(iaUso.limite * 100).toFixed(0)} ¢ usados
              {' · '}{iaUso.modoGratuito
                ? 'Se reinicia ' + (iaUso.periodo === 'dia' ? 'mañana' : 'el próximo lunes')
                : 'Respuestas con IA avanzada'}
            </div>
          </div>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(201,160,67,0.08)', border: '0.5px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>✦</div>
        </div>
      )}

      {/* Ventana de chat */}
      <div style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Mensajes */}
        <div style={{ minHeight: '360px', maxHeight: '480px', overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>

          {/* Bienvenida */}
          {iaMsgs.length === 0 && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ maxWidth: '80%', padding: '0.75rem 1rem', borderRadius: '14px 14px 14px 2px', fontSize: '13px', lineHeight: 1.7, background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', color: 'var(--text-1)' }}>
                  Hola, soy tu asistente de GrupoSkyLine. ¿En qué puedo ayudarte hoy?
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {SUGERENCIAS_IA.map(s => (
                  <button key={s} onClick={() => sendIa(s)}
                    style={{ fontSize: '11px', padding: '5px 12px', borderRadius: '20px', border: '0.5px solid rgba(201,160,67,0.3)', background: 'rgba(201,160,67,0.06)', color: '#C9A043', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,160,67,0.14)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'rgba(201,160,67,0.06)')}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {iaMsgs.map((m, i) => (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '80%', padding: '0.75rem 1rem', fontSize: '13px', lineHeight: 1.7,
                borderRadius: m.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                background: m.role === 'user' ? 'linear-gradient(135deg,#C9A043,#a07828)' : 'var(--bg-1)',
                color: m.role === 'user' ? '#0a0a0a' : 'var(--text-1)',
                border: m.role === 'assistant' ? '0.5px solid var(--gold-border)' : 'none',
                fontWeight: m.role === 'user' ? 500 : 400,
              }}>
                {m.content}
              </div>
              {m.modo === 'gratuito' && (
                <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '3px' }}>⚡ Modo básico</div>
              )}
              {m.cita && (
                <div style={{ marginTop: '8px', background: 'rgba(109,200,109,0.08)', border: '0.5px solid rgba(109,200,109,0.3)', borderRadius: '10px', padding: '10px 14px', fontSize: '12px', color: '#6dc86d', maxWidth: '80%' }}>
                  <div style={{ fontWeight: 600, marginBottom: '3px' }}>✓ Solicitud de llamada enviada</div>
                  <div style={{ color: 'var(--text-2)', fontSize: '11px' }}>
                    {m.cita.fecha ? `📅 ${new Date(m.cita.fecha + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}` : ''}
                    {m.cita.hora ? ` · ${m.cita.hora}` : ''}
                    {!m.cita.fecha ? 'Recibirás una notificación cuando el equipo confirme la cita.' : ' · Te notificaremos la confirmación.'}
                  </div>
                </div>
              )}
            </div>
          ))}

          {iaLoading && iaStream && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ maxWidth: '80%', padding: '0.75rem 1rem', borderRadius: '14px 14px 14px 2px', fontSize: '13px', lineHeight: 1.7, background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', color: 'var(--text-1)' }}>
                {iaStream}<span style={{ opacity: 0.4 }}>▌</span>
              </div>
            </div>
          )}

          {iaLoading && !iaStream && (
            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <div style={{ padding: '0.75rem 1rem', borderRadius: '14px', background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)' }}>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#C9A043', opacity: 0.6, animation: `dot 1.2s ${i * 0.2}s infinite`, display: 'inline-block' }} />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={iaChatEndRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={e => { e.preventDefault(); sendIa(iaInput) }}
          style={{ padding: '0.85rem', borderTop: '0.5px solid var(--gold-border)', display: 'flex', gap: '0.5rem' }}
        >
          <input
            value={iaInput}
            onChange={e => setIaInput(e.target.value)}
            disabled={iaLoading}
            placeholder="Escribe tu pregunta…"
            style={{ flex: 1, background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', borderRadius: '10px', padding: '10px 14px', fontSize: '13px', color: 'var(--text-0)', outline: 'none', fontFamily: 'inherit' }}
          />
          <button
            type="submit"
            disabled={iaLoading || !iaInput.trim()}
            style={{ background: 'linear-gradient(135deg,#C9A043,#a07828)', border: 'none', color: '#0a0a0a', width: '40px', height: '40px', borderRadius: '10px', cursor: 'pointer', fontSize: '16px', fontWeight: 700, opacity: (iaLoading || !iaInput.trim()) ? 0.4 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >→</button>
        </form>
        <div style={{ padding: '0.4rem', textAlign: 'center', fontSize: '10px', color: 'rgba(255,255,255,0.15)' }}>
          GrupoSkyLine IA · Powered by Claude
        </div>
      </div>
    </div>
  )

  const TAB_CONTENT: Record<string, React.ReactNode> = {
    'Dashboard': tabDashboard,
    'Mis Inversiones': tabInversiones,
    'Marketplace': tabMarketplace,
    'Transacciones': tabTransacciones,
    'Mensajes': tabMensajes,
    'Referidos': tabReferidos,
    'Calendario': tabCalendario,
    'Asistente IA': tabAsistenteIA,
    'Perfil': tabPerfil,
  }

  // ─── Layout ───────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0)' }}>
      {/* Top nav */}
      <nav style={{ borderBottom: '0.5px solid var(--gold-border)', background: 'var(--bg-0)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '60px' }}>
          {/* Tabs */}
          <div style={{ display: 'flex', alignItems: 'center', height: '100%', gap: '0.25rem' }}>
            {TABS.map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '0 1rem', height: '100%', position: 'relative',
                  fontSize: '0.82rem', letterSpacing: '0.02em',
                  color: tab === t ? 'var(--text-0)' : 'var(--text-3)',
                  fontWeight: tab === t ? 600 : 400,
                  borderBottom: tab === t ? '2px solid var(--gold-200)' : '2px solid transparent',
                  transition: 'all 0.15s',
                }}
              >
                {t}
                {t === 'Mensajes' && unreadMsgs > 0 && (
                  <span style={{ position: 'absolute', top: '12px', right: '6px', background: 'var(--gold-200)', color: '#1a1506', borderRadius: '8px', fontSize: '8px', fontWeight: 700, padding: '1px 5px' }}>{unreadMsgs}</span>
                )}
              </button>
            ))}
          </div>

          {/* Right actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {/* Bell */}
            <div ref={bellRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowNotifs(v => !v); if (!showNotifs) markAllRead() }}
                style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={unreadCount > 0 ? 'var(--gold-200)' : 'var(--text-2)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
                {unreadCount > 0 && <span style={{ position: 'absolute', top: '6px', right: '6px', width: '7px', height: '7px', background: 'var(--gold-200)', borderRadius: '50%' }}/>}
              </button>
              {showNotifs && (
                <div style={{ position: 'absolute', right: 0, top: '48px', width: '340px', background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', borderRadius: '12px', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', zIndex: 200 }}>
                  <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid var(--gold-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.78rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-2)' }}>Notificaciones</span>
                    {unreadCount > 0 && <span style={{ fontSize: '10px', color: 'var(--gold-200)' }}>{unreadCount} nuevas</span>}
                  </div>
                  {notifs.length === 0 ? (
                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.82rem' }}>Sin notificaciones</div>
                  ) : (
                    <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
                      {notifs.map(n => (
                        <div key={n.id} style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid rgba(62,59,53,0.3)', background: n.leida ? 'transparent' : 'rgba(201,160,67,0.04)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                            <div style={{ fontSize: '0.82rem', fontWeight: 500, color: n.leida ? 'var(--text-2)' : 'var(--text-0)' }}>{n.titulo}</div>
                            {!n.leida && <span style={{ width: '6px', height: '6px', background: 'var(--gold-200)', borderRadius: '50%', flexShrink: 0, marginTop: '5px' }}/>}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '4px', lineHeight: 1.5 }}>{n.mensaje}</div>
                          <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '6px' }}>{new Date(n.created_at).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── CALENDARIO WIDGET ── */}
            <div ref={calWidgetRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowCalWidget(v => !v); setShowProfile(false); setShowNotifs(false) }}
                title="Próximos eventos"
                style={{ background: 'var(--bg-2)', border: '0.5px solid var(--gold-border)', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', transition: 'border-color 0.2s' }}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={showCalWidget ? 'var(--gold-200)' : 'var(--text-2)'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                {(() => {
                  const hoy = new Date().toISOString().slice(0, 10)
                  const en7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
                  const cnt = eventos.filter(ev => ev.fecha >= hoy && ev.fecha <= en7).length
                  return cnt > 0 ? <span style={{ position: 'absolute', top: '5px', right: '5px', width: '8px', height: '8px', background: '#C9A043', borderRadius: '50%', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0a0a0a', fontWeight: 700 }} /> : null
                })()}
              </button>

              {showCalWidget && (() => {
                const hoy = new Date().toISOString().slice(0, 10)
                const en7 = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
                const proximos = eventos.filter(ev => ev.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha)).slice(0, 5)
                const TIPO_COLOR: Record<string, string> = { manual: '#C9A043', operacion: '#7c6fd4', vencimiento: '#e05656', pago: '#6dc86d', recordatorio: '#4da6d4' }
                return (
                  <div style={{ position: 'absolute', right: 0, top: '48px', width: '300px', background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', borderRadius: '16px', boxShadow: '0 20px 60px rgba(0,0,0,0.55)', zIndex: 200, overflow: 'hidden' }}>
                    {/* Header */}
                    <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid var(--gold-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '11px', letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '2px' }}>Próximos eventos</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-0)' }}>
                          {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
                        </div>
                      </div>
                      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(201,160,67,0.08)', border: '0.5px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--gold-200)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
                        </svg>
                      </div>
                    </div>

                    {/* Eventos */}
                    <div style={{ padding: '0.5rem 0' }}>
                      {proximos.length === 0 ? (
                        <div style={{ padding: '1.5rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '12px' }}>Sin eventos próximos</div>
                      ) : proximos.map(ev => {
                        const fecha = new Date(ev.fecha + 'T00:00:00')
                        const esHoy = ev.fecha === hoy
                        const diff = Math.round((fecha.getTime() - new Date().setHours(0,0,0,0)) / 86400000)
                        return (
                          <div key={ev.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0.6rem 1.25rem', borderBottom: '0.5px solid rgba(201,160,67,0.06)' }}>
                            <div style={{ width: '3px', height: '36px', borderRadius: '2px', background: TIPO_COLOR[ev.tipo] ?? '#C9A043', flexShrink: 0 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--text-0)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.titulo}</div>
                              <div style={{ fontSize: '10px', color: esHoy ? '#C9A043' : 'var(--text-3)', marginTop: '1px' }}>
                                {esHoy ? 'Hoy' : diff === 1 ? 'Mañana' : `En ${diff} días`} · {fecha.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Footer — ir al calendario */}
                    <button
                      onClick={() => { setTab('Calendario'); setShowCalWidget(false) }}
                      style={{ width: '100%', padding: '0.85rem', background: 'rgba(201,160,67,0.05)', border: 'none', borderTop: '0.5px solid var(--gold-border)', color: 'var(--gold-200)', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                    >
                      Ver calendario completo →
                    </button>
                  </div>
                )
              })()}
            </div>

            {/* ── AVATAR DROPDOWN ── */}
            <div ref={profileRef} style={{ position: 'relative' }}>
              <button
                onClick={() => { setShowProfile(v => !v); setShowNotifs(false); setShowCalWidget(false) }}
                style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(201,160,67,0.3) 0%, rgba(201,160,67,0.1) 100%)', border: showProfile ? '0.5px solid rgba(201,160,67,0.8)' : '0.5px solid rgba(201,160,67,0.4)', color: 'var(--gold-100)', fontSize: '12px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: '0.04em', transition: 'border-color 0.2s' }}
              >
                {initials}
              </button>

              {showProfile && (
                <div style={{ position: 'absolute', right: 0, top: '48px', width: '200px', background: 'var(--bg-1)', border: '0.5px solid var(--gold-border)', borderRadius: '14px', boxShadow: '0 20px 60px rgba(0,0,0,0.55)', zIndex: 200, overflow: 'hidden' }}>
                  {/* User info */}
                  <div style={{ padding: '1rem 1.25rem', borderBottom: '0.5px solid var(--gold-border)' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(201,160,67,0.3), rgba(201,160,67,0.1))', border: '0.5px solid rgba(201,160,67,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gold-100)', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>{initials}</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-0)' }}>{cliente?.nombre} {cliente?.apellidos}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-3)', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{cliente?.email}</div>
                  </div>
                  {/* Options */}
                  <div style={{ padding: '0.4rem 0' }}>
                    <button
                      onClick={() => { setTab(i18n.profile); setShowProfile(false) }}
                      style={{ width: '100%', padding: '0.65rem 1.25rem', background: 'none', border: 'none', color: 'var(--text-1)', fontSize: '13px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(201,160,67,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                      Mi perfil
                    </button>
                    <div style={{ margin: '0.3rem 1rem', height: '0.5px', background: 'var(--gold-border)' }} />
                    <button
                      onClick={() => { setShowProfile(false); handleLogout() }}
                      style={{ width: '100%', padding: '0.65rem 1.25rem', background: 'none', border: 'none', color: '#e05656', fontSize: '13px', cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(224,86,86,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
                      Cerrar sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '2.5rem 2rem' }}>
        {TAB_CONTENT[tab]}
      </div>

      {/* Contact footer */}
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 2rem 3rem' }}>
        <div style={{ padding: '1.5rem 2rem', border: '0.5px solid var(--gold-border)', borderRadius: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '0.88rem', color: 'var(--text-1)', fontWeight: 600, marginBottom: '3px' }}>¿Tienes alguna consulta?</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-3)' }}>Tu asesor personal de GrupoSkyLine está disponible para atenderte.</div>
          </div>
          <a href="mailto:info@gruposkyline.es" style={{ textDecoration: 'none', padding: '10px 24px', border: '0.5px solid var(--gold-border-strong)', color: 'var(--gold-200)', borderRadius: '8px', fontSize: '11px', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Contactar →</a>
        </div>
      </div>
    </div>
  )
}
