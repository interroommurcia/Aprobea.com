'use client'

import { useEffect, useRef, useState } from 'react'
import NPLCube3D from '@/components/NPLCube3D'
import VideoShowcase from '@/components/VideoShowcase'

export default function Home() {
  const [lang, setLangState] = useState<'es' | 'en'>('es')
  const [openModal, setOpenModal] = useState<'npl' | 'crowdfunding' | null>(null)
  const [nplDone, setNplDone] = useState(false)
  const [cfDone, setCfDone] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Landing always dark — restore user preference on leave
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'dark')
    return () => {
      const saved = localStorage.getItem('sl_theme')
      if (saved) document.documentElement.setAttribute('data-theme', saved)
      else document.documentElement.removeAttribute('data-theme')
    }
  }, [])

  // Body overflow + reset form on modal close
  useEffect(() => {
    document.body.style.overflow = openModal ? 'hidden' : ''
    if (!openModal) {
      setNplDone(false)
      setCfDone(false)
    }
    return () => { document.body.style.overflow = '' }
  }, [openModal])

  // Language DOM update (mirrors original script)
  useEffect(() => {
    document.querySelectorAll(`[data-${lang}]`).forEach(el => {
      const val = el.getAttribute(`data-${lang}`)
      if (!val) return
      const tag = (el as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'OPTION') {
        (el as HTMLInputElement).placeholder = val
      } else {
        el.innerHTML = val
      }
    })
    document.documentElement.lang = lang
  }, [lang])

  // Canvas particles
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    type P = { x: number; y: number; r: number; a: number; s: number; o: number }
    const particles: P[] = []
    let rafId: number

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.5 + 0.3,
        a: Math.random() * Math.PI * 2,
        s: Math.random() * 0.3 + 0.05,
        o: Math.random() * 0.5 + 0.1,
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      particles.forEach(p => {
        p.x += Math.cos(p.a) * p.s
        p.y += Math.sin(p.a) * p.s
        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(201,160,67,${p.o})`
        ctx.fill()
      })
      rafId = requestAnimationFrame(draw)
    }
    draw()

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible') }),
      { threshold: 0.12 }
    )
    document.querySelectorAll('.reveal').forEach(el => observer.observe(el))
    return () => observer.disconnect()
  }, [])

  // Nav background on scroll
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handler)
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const close = () => setOpenModal(null)

  const successBox = (onClose: () => void, title: string) => (
    <div style={{ textAlign: 'center', padding: '3rem 0' }}>
      <div style={{
        width: '64px', height: '64px', border: '1px solid var(--gold-200)',
        borderRadius: '50%', display: 'flex', alignItems: 'center',
        justifyContent: 'center', margin: '0 auto 1.5rem', fontSize: '24px',
        color: 'var(--gold-100)'
      }}>✓</div>
      <h3 className="serif" style={{ fontSize: '1.8rem', fontWeight: 400, color: 'var(--text-0)', marginBottom: '0.75rem' }}>
        {title}
      </h3>
      <p style={{ color: 'var(--text-2)', fontSize: '0.88rem', maxWidth: '300px', margin: '0 auto', lineHeight: 1.7 }}>
        {lang === 'es'
          ? 'Un asesor de GrupoSkyLine se pondrá en contacto en menos de 24 horas.'
          : 'A GrupoSkyLine advisor will contact you within 24 hours.'}
      </p>
      <button onClick={onClose} style={{
        marginTop: '2.5rem', padding: '12px 32px', background: 'var(--gold-200)',
        color: 'var(--bg-0)', border: 'none', borderRadius: 'var(--radius)',
        fontFamily: "'Outfit',sans-serif", fontSize: '11px', letterSpacing: '0.12em',
        textTransform: 'uppercase', cursor: 'pointer', fontWeight: 500
      }}>
        {lang === 'es' ? 'Cerrar' : 'Close'}
      </button>
    </div>
  )

  return (
    <>
      {/* NAV */}
      <nav className="site-nav" style={{ background: scrolled ? 'rgba(6,7,9,0.98)' : 'rgba(6,7,9,0.85)' }}>
        <a className="nav-logo" href="#">
          <img src="/logo.png" alt="Grupo SkyLine Investment" style={{ height: '44px', width: 'auto', display: 'block' }} />
        </a>
        <div className="nav-right">
          <div className="lang-toggle">
            <button className={`lang-btn${lang === 'es' ? ' active' : ''}`} onClick={() => setLangState('es')}>ES</button>
            <button className={`lang-btn${lang === 'en' ? ' active' : ''}`} onClick={() => setLangState('en')}>EN</button>
          </div>
          <a href="#registro" className="btn-nav" data-es="Acceder" data-en="Access">Acceder</a>
        </div>
      </nav>

      {/* HERO */}
      <section id="hero">
        <canvas id="hero-canvas" ref={canvasRef} />
        <div className="hero-inner">
          <div className="hero-tag" data-es="Capital Privado · Real Estate · Fintech" data-en="Private Capital · Real Estate · Fintech">
            Capital Privado · Real Estate · Fintech
          </div>
          <h1 className="hero-h1">
            <span
              data-es="Donde el capital<br>se convierte en<br><em>estrategia real.</em>"
              data-en="Where capital<br>becomes<br><em>real strategy.</em>"
            >
              Donde el capital<br />se convierte en<br /><em>estrategia real.</em>
            </span>
          </h1>
          <p className="hero-sub"
            data-es="GrupoSkyLine conecta inversores de alto perfil con oportunidades NPL y crowdfunding inmobiliario de primer nivel en España."
            data-en="GrupoSkyLine connects high-profile investors with NPL opportunities and prime real estate crowdfunding across Spain."
          >
            GrupoSkyLine conecta inversores de alto perfil con oportunidades NPL y crowdfunding inmobiliario de primer nivel en España.
          </p>
          <div className="hero-ctas">
            <button className="btn-primary" onClick={() => setOpenModal('npl')} data-es="Invertir en NPL" data-en="Invest in NPL">
              Invertir en NPL
            </button>
            <button
              className="btn-outline"
              onClick={() => document.getElementById('ecosistema')?.scrollIntoView({ behavior: 'smooth' })}
              data-es="Explorar el ecosistema"
              data-en="Explore the ecosystem"
            >
              Explorar el ecosistema
            </button>
          </div>
        </div>

        {/* SKYLINE — líneas finas arquitectónicas */}
        <svg className="skyline-svg" viewBox="0 0 1440 220" preserveAspectRatio="xMidYMax slice" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#C9A043" stopOpacity="0.9"/>
              <stop offset="75%"  stopColor="#C9A043" stopOpacity="0.4"/>
              <stop offset="100%" stopColor="#C9A043" stopOpacity="0"/>
            </linearGradient>
            <linearGradient id="lineGradFade" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor="#C9A043" stopOpacity="0.45"/>
              <stop offset="100%" stopColor="#C9A043" stopOpacity="0"/>
            </linearGradient>
            <linearGradient id="maskH" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%"   stopColor="white" stopOpacity="0"/>
              <stop offset="6%"   stopColor="white" stopOpacity="1"/>
              <stop offset="94%"  stopColor="white" stopOpacity="1"/>
              <stop offset="100%" stopColor="white" stopOpacity="0"/>
            </linearGradient>
            <mask id="mh"><rect width="1440" height="220" fill="url(#maskH)"/></mask>
          </defs>

          <g mask="url(#mh)" fill="none" strokeLinecap="square" strokeLinejoin="miter">

            {/* ── CAPA FONDO: edificios secundarios, trazo muy fino y tenue ── */}
            <g stroke="url(#lineGradFade)" strokeWidth="0.6">
              {/* Bloque bajo izq */}
              <polyline points="30,220 30,178 50,178 50,165 70,165 70,178 90,178 90,220"/>
              {/* Bloque medio izq */}
              <polyline points="155,220 155,172 170,172 170,158 185,158 185,145 200,145 200,158 215,158 215,172 230,172 230,220"/>
              {/* Par de torres centro-izq */}
              <polyline points="460,220 460,168 475,168 475,152 490,152 490,135 505,135 505,152 520,152 520,168 535,168 535,220"/>
              <polyline points="555,220 555,175 568,175 568,160 581,160 581,148 594,148 594,160 607,160 607,175 620,175 620,220"/>
              {/* Bloque centro */}
              <polyline points="830,220 830,172 845,172 845,158 860,158 860,143 875,143 875,158 890,158 890,172 905,172 905,220"/>
              {/* Par derecha */}
              <polyline points="1160,220 1160,170 1175,170 1175,155 1190,155 1190,140 1205,140 1205,155 1220,155 1220,170 1235,170 1235,220"/>
              <polyline points="1330,220 1330,180 1345,180 1345,165 1360,165 1360,180 1375,180 1375,220"/>
            </g>

            {/* ── CAPA FRENTE: rascacielos principales, trazo nítido ── */}
            <g stroke="url(#lineGrad)" strokeWidth="0.9">

              {/* TORRE 1 — izquierda, con remates escalonados */}
              <polyline points="
                88,220 88,190 96,190 96,178 102,178 102,160
                108,160 108,138 112,138 112,118 116,118 116,100
                118,100 118,82 120,82 120,68 121,68 121,52
                122,52 122,38 122.5,38 122.5,28 123,28 123,16
                123.5,16 123.5,6 124,6
                124.5,6 124.5,16 125,16 125,28 125.5,28 125.5,38
                126,38 126,52 127,52 127,68 128,68 128,82
                130,82 130,100 132,100 132,118 136,118 136,138
                140,138 140,160 146,160 146,178 152,178 152,190 160,190 160,220
              "/>
              {/* Líneas de planta torre 1 */}
              <line x1="108" y1="160" x2="140" y2="160"/>
              <line x1="112" y1="138" x2="136" y2="138"/>
              <line x1="116" y1="118" x2="132" y2="118"/>
              <line x1="118" y1="100" x2="130" y2="100"/>

              {/* TORRE 2 — centro-izquierda, facetada */}
              <polyline points="
                310,220 310,195 320,195 320,180 326,180 326,162
                332,162 332,142 337,142 337,118 341,118
                341,95 344,95 344,75 346,75 346,55
                348,55 348,38 349,38 349,22 350,22 350,8
                350.5,8 350.5,0
                351,0 351,8 351.5,8 351.5,22 352,22 352,38
                354,38 354,55 356,55 356,75 358,75 358,95
                361,95 361,118 365,118 365,142 370,142 370,162
                376,162 376,180 382,180 382,195 392,195 392,220
              "/>
              <line x1="332" y1="162" x2="370" y2="162"/>
              <line x1="337" y1="142" x2="365" y2="142"/>
              <line x1="341" y1="118" x2="361" y2="118"/>
              <line x1="344" y1="95"  x2="358" y2="95"/>

              {/* TORRE 3 — central, la más alta */}
              <polyline points="
                670,220 670,192 682,192 682,175 690,175 690,155
                698,155 698,132 704,132 704,110 708,110
                708,88 711,88 711,68 713,68 713,48
                715,48 715,30 716,30 716,14 717,14 717,4
                717.5,4 717.5,0
                718,0 718,4 718.5,4 718.5,14 719,14 719,30
                720,30 720,48 722,48 722,68 724,68 724,88
                727,88 727,110 731,110 731,132 737,132 737,155
                745,155 745,175 753,175 753,192 765,192 765,220
              "/>
              <line x1="698" y1="155" x2="737" y2="155"/>
              <line x1="704" y1="132" x2="731" y2="132"/>
              <line x1="708" y1="110" x2="727" y2="110"/>
              <line x1="711" y1="88"  x2="724" y2="88"/>
              <line x1="713" y1="68"  x2="722" y2="68"/>

              {/* TORRE 4 — centro-derecha */}
              <polyline points="
                958,220 958,195 968,195 968,178 974,178 974,158
                980,158 980,136 985,136 985,112 989,112
                989,90 992,90 992,70 994,70 994,50
                996,50 996,34 997,34 997,18 998,18 998,6
                998.5,6 998.5,0
                999,0 999,6 999.5,6 999.5,18 1000,18 1000,34
                1002,34 1002,50 1004,50 1004,70 1006,70 1006,90
                1009,90 1009,112 1013,112 1013,136 1018,136 1018,158
                1024,158 1024,178 1030,178 1030,195 1040,195 1040,220
              "/>
              <line x1="980" y1="158" x2="1018" y2="158"/>
              <line x1="985" y1="136" x2="1013" y2="136"/>
              <line x1="989" y1="112" x2="1009" y2="112"/>
              <line x1="992" y1="90"  x2="1006" y2="90"/>

              {/* TORRE 5 — derecha */}
              <polyline points="
                1260,220 1260,195 1270,195 1270,180 1276,180 1276,162
                1282,162 1282,142 1286,142 1286,120 1289,120
                1289,98 1292,98 1292,78 1294,78 1294,60
                1296,60 1296,42 1297,42 1297,26 1298,26 1298,12
                1298.5,12 1298.5,4
                1299,4 1299,12 1299.5,12 1299.5,26 1300,26 1300,42
                1302,42 1302,60 1304,60 1304,78 1306,78 1306,98
                1309,98 1309,120 1312,120 1312,142 1316,142 1316,162
                1322,162 1322,180 1328,180 1328,195 1338,195 1338,220
              "/>
              <line x1="1282" y1="162" x2="1316" y2="162"/>
              <line x1="1286" y1="142" x2="1312" y2="142"/>
              <line x1="1289" y1="120" x2="1309" y2="120"/>
              <line x1="1292" y1="98"  x2="1306" y2="98"/>
            </g>

            {/* Línea base */}
            <line x1="0" y1="219.5" x2="1440" y2="219.5" stroke="#C9A043" strokeWidth="0.4" strokeOpacity="0.25"/>
          </g>
        </svg>

        <div className="scroll-hint">
          <div className="scroll-line" />
          <span data-es="Descubrir" data-en="Discover">Descubrir</span>
        </div>
      </section>

      {/* STATS */}
      <section id="stats">
        <div className="stats-grid">
          <div className="stat-item reveal">
            <div className="stat-number">+200<span className="stat-unit serif">M</span></div>
            <div className="stat-label" data-es="Euros en cartera NPL gestionados" data-en="Euro NPL portfolio managed">Euros en cartera NPL gestionados</div>
          </div>
          <div className="stat-item reveal">
            <div className="stat-number">98<span className="stat-unit serif">%</span></div>
            <div className="stat-label" data-es="Satisfacción de inversores" data-en="Investor satisfaction">Satisfacción de inversores</div>
          </div>
          <div className="stat-item reveal">
            <div className="stat-number">+500</div>
            <div className="stat-label" data-es="Activos gestionados en España" data-en="Assets managed in Spain">Activos gestionados en España</div>
          </div>
          <div className="stat-item reveal">
            <div className="stat-number">15<span className="stat-unit serif">%</span></div>
            <div className="stat-label" data-es="Rentabilidad media anual" data-en="Average annual return">Rentabilidad media anual</div>
          </div>
        </div>
      </section>

      {/* VIDEO SHOWCASE */}
      <VideoShowcase lang={lang} />

      {/* SERVICIOS */}
      <section id="servicios">
        <div className="section-tag" data-es="Servicios de inversión" data-en="Investment services">Servicios de inversión</div>
        <h2 className="section-h2 serif reveal" data-es="Capital inteligente<br>para <em>resultados reales.</em>" data-en="Smart capital<br>for <em>real results.</em>">
          Capital inteligente<br />para <em>resultados reales.</em>
        </h2>
        <p className="section-intro reveal"
          data-es="Gestionamos carteras de activos NPL y operaciones de crowdfunding inmobiliario para inversores privados e institucionales."
          data-en="We manage NPL asset portfolios and real estate crowdfunding operations for private and institutional investors."
        >
          Gestionamos carteras de activos NPL y operaciones de crowdfunding inmobiliario para inversores privados e institucionales.
        </p>
        <div className="services-grid reveal">
          <div className="service-card">
            <div className="service-icon">
              <svg viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <div className="service-title serif" data-es="Inversión en NPL" data-en="NPL Investment">Inversión en NPL</div>
            <p className="service-desc"
              data-es="Acceso a carteras de deuda non-performing con alta rentabilidad. Seleccionamos, analizamos y gestionamos activos con criterio institucional para maximizar el retorno de su capital."
              data-en="Access to high-yield non-performing debt portfolios. We select, analyze and manage assets with institutional criteria to maximize your capital return."
            >
              Acceso a carteras de deuda non-performing con alta rentabilidad. Seleccionamos, analizamos y gestionamos activos con criterio institucional para maximizar el retorno de su capital.
            </p>
            <div className="service-tags">
              <span className="tag">Due Diligence</span>
              <span className="tag" data-es="Gestión activa" data-en="Active mgmt">Gestión activa</span>
              <span className="tag" data-es="Alto rendimiento" data-en="High yield">Alto rendimiento</span>
            </div>
          </div>
          <div className="service-card">
            <div className="service-icon">
              <svg viewBox="0 0 24 24">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <path d="M3 9h18" />
                <path d="M9 21V9" />
              </svg>
            </div>
            <div className="service-title serif" data-es="Crowdfunding Inmobiliario" data-en="Real Estate Crowdfunding">Crowdfunding Inmobiliario</div>
            <p className="service-desc"
              data-es="Desde 1.000€ participa en operaciones inmobiliarias seleccionadas con retornos atractivos. Democratizamos el acceso a la inversión de alto nivel sin grandes barreras de capital."
              data-en="From €1,000 participate in curated real estate deals with attractive returns. We democratize access to premium investment without high capital barriers."
            >
              Desde 1.000€ participa en operaciones inmobiliarias seleccionadas con retornos atractivos. Democratizamos el acceso a la inversión de alto nivel sin grandes barreras de capital.
            </p>
            <div className="service-tags">
              <span className="tag" data-es="Desde 1.000€" data-en="From €1,000">Desde 1.000€</span>
              <span className="tag" data-es="Operaciones seleccionadas" data-en="Curated deals">Operaciones seleccionadas</span>
              <span className="tag" data-es="Alta rentabilidad" data-en="High yield">Alta rentabilidad</span>
            </div>
          </div>
        </div>
      </section>

      {/* CUBO NPL 3D */}
      <NPLCube3D lang={lang} />

      {/* ECOSISTEMA */}
      <section id="ecosistema">
        <div className="section-tag" data-es="Ecosistema GrupoSkyLine" data-en="GrupoSkyLine Ecosystem">Ecosistema GrupoSkyLine</div>
        <h2 className="section-h2 serif reveal" data-es="Un universo de<br>oportunidades <em>conectadas.</em>" data-en="A universe of<br><em>connected</em> opportunities.">
          Un universo de<br />oportunidades <em>conectadas.</em>
        </h2>
        <p className="section-intro reveal"
          data-es="Más allá de la gran inversión, creamos valor en nichos estratégicos donde la demanda supera a la oferta."
          data-en="Beyond large-scale investment, we create value in strategic niches where demand outstrips supply."
        >
          Más allá de la gran inversión, creamos valor en nichos estratégicos donde la demanda supera a la oferta.
        </p>
        <div className="eco-grid">
          <div className="eco-card reveal">
            <span className="eco-badge" data-es="Estudiantes · Murcia" data-en="Students · Murcia">Estudiantes · Murcia</span>
            <h3 className="eco-title serif" data-es="Habitaciones en Murcia" data-en="Rooms in Murcia">Habitaciones en Murcia</h3>
            <p className="eco-desc"
              data-es="Captamos habitaciones y pisos cerca de las universidades murcianas. Si eres estudiante, te conectamos con la vivienda ideal. Si eres propietario, llenamos tu inmueble."
              data-en="We source rooms and flats near Murcia's universities. Students get the ideal room. Landlords get reliable tenants."
            >
              Captamos habitaciones y pisos cerca de las universidades murcianas. Si eres estudiante, te conectamos con la vivienda ideal. Si eres propietario, llenamos tu inmueble.
            </p>
            <a href="#" className="eco-link" data-es="Ver habitaciones disponibles →" data-en="View available rooms →">Ver habitaciones disponibles →</a>
          </div>
          <div className="eco-card reveal">
            <span className="eco-badge" data-es="Propietarios · Gestión" data-en="Owners · Management">Propietarios · Gestión</span>
            <h3 className="eco-title serif" data-es="Gestión & Rent to Rent" data-en="Management & Rent to Rent">Gestión &amp; Rent to Rent</h3>
            <p className="eco-desc"
              data-es="Gestiona tu patrimonio sin fricciones. Administramos tu propiedad de principio a fin, o estructuramos esquemas rent-to-rent para maximizar la rentabilidad sin esfuerzo."
              data-en="Manage your real estate without friction. We handle your property end-to-end, or structure rent-to-rent arrangements to maximize returns effortlessly."
            >
              Gestiona tu patrimonio sin fricciones. Administramos tu propiedad de principio a fin, o estructuramos esquemas rent-to-rent para maximizar la rentabilidad sin esfuerzo.
            </p>
            <a href="#" className="eco-link" data-es="Ceder tu piso →" data-en="Hand over your property →">Ceder tu piso →</a>
          </div>
          <div className="eco-card reveal" style={{ cursor: 'pointer' }} onClick={() => setOpenModal('crowdfunding')}>
            <span className="eco-badge" data-es="Inversores · Crowdfunding" data-en="Investors · Crowdfunding">Inversores · Crowdfunding</span>
            <h3 className="eco-title serif" data-es="Crowdfunding Inmobiliario" data-en="Real Estate Crowdfunding">Crowdfunding Inmobiliario</h3>
            <p className="eco-desc"
              data-es="Desde 1.000€. Participa en operaciones inmobiliarias seleccionadas con retornos atractivos, sin necesidad de grandes capitales. Democratizamos la inversión de alto nivel."
              data-en="From €1,000. Participate in curated real estate deals with attractive returns, no large capital required. We democratize premium investing."
            >
              Desde 1.000€. Participa en operaciones inmobiliarias seleccionadas con retornos atractivos, sin necesidad de grandes capitales. Democratizamos la inversión de alto nivel.
            </p>
            <a className="eco-link" data-es="Unirme como inversor →" data-en="Join as investor →">Unirme como inversor →</a>
          </div>
        </div>
      </section>

      {/* PROCESO */}
      <section id="proceso">
        <div className="section-tag" data-es="Cómo trabajamos" data-en="How we work">Cómo trabajamos</div>
        <h2 className="section-h2 serif reveal" data-es="Proceso claro.<br><em>Resultados medibles.</em>" data-en="Clear process.<br><em>Measurable results.</em>">
          Proceso claro.<br /><em>Resultados medibles.</em>
        </h2>
        <div className="proceso-steps reveal" style={{ marginTop: '4rem' }}>
          <div className="proceso-step">
            <div className="paso-num serif">01</div>
            <div className="paso-title" data-es="Registro & Perfil" data-en="Register & Profile">Registro &amp; Perfil</div>
            <p className="paso-desc" data-es="Crea tu cuenta y completa tu perfil inversor. Validamos tu identidad con total seguridad." data-en="Create your account and complete your investor profile. We verify your identity securely.">
              Crea tu cuenta y completa tu perfil inversor. Validamos tu identidad con total seguridad.
            </p>
            <div className="paso-connector" />
          </div>
          <div className="proceso-step">
            <div className="paso-num serif">02</div>
            <div className="paso-title" data-es="Análisis & Match" data-en="Analysis & Match">Análisis &amp; Match</div>
            <p className="paso-desc" data-es="Analizamos tu capital, perfil de riesgo y objetivos para presentarte las oportunidades más adecuadas." data-en="We analyze your capital, risk profile and objectives to present the most suitable opportunities.">
              Analizamos tu capital, perfil de riesgo y objetivos para presentarte las oportunidades más adecuadas.
            </p>
            <div className="paso-connector" />
          </div>
          <div className="proceso-step">
            <div className="paso-num serif">03</div>
            <div className="paso-title" data-es="Acceso & Documentación" data-en="Access & Documentation">Acceso &amp; Documentación</div>
            <p className="paso-desc" data-es="Desde tu backoffice privado gestionas contratos, documentación y seguimiento en tiempo real." data-en="From your private backoffice you manage contracts, documentation and real-time tracking.">
              Desde tu backoffice privado gestionas contratos, documentación y seguimiento en tiempo real.
            </p>
            <div className="paso-connector" />
          </div>
          <div className="proceso-step">
            <div className="paso-num serif">04</div>
            <div className="paso-title" data-es="Rendimiento & Reporte" data-en="Performance & Report">Rendimiento &amp; Reporte</div>
            <p className="paso-desc" data-es="Recibe reportes periódicos, accede a tu gestor dedicado y escala tu inversión cuando quieras." data-en="Receive periodic reports, connect with your dedicated manager and scale when you're ready.">
              Recibe reportes periódicos, accede a tu gestor dedicado y escala tu inversión cuando quieras.
            </p>
          </div>
        </div>
      </section>

      {/* REGISTRO */}
      <section id="registro">
        <div className="section-tag" data-es="Acceso a la plataforma" data-en="Platform access">Acceso a la plataforma</div>
        <h2 className="section-h2 serif reveal" data-es="Tu backoffice<br>privado te <em>espera.</em>" data-en="Your private<br>backoffice <em>awaits.</em>">
          Tu backoffice<br />privado te <em>espera.</em>
        </h2>
        <p className="section-intro reveal"
          data-es="Gestión documental, chat con tu equipo, seguimiento de inversiones y mucho más desde un único panel privado."
          data-en="Document management, team chat, investment tracking and much more from a single private panel."
        >
          Gestión documental, chat con tu equipo, seguimiento de inversiones y mucho más desde un único panel privado.
        </p>
        <div className="register-grid">
          <div className="register-card featured reveal">
            <span className="reg-badge" data-es="Inversor NPL · Premium" data-en="NPL · Premium Investor">Inversor NPL · Premium</span>
            <h3 className="reg-title serif" data-es="Cuenta Inversor Premium" data-en="Premium Investor Account">Cuenta Inversor Premium</h3>
            <p className="reg-desc"
              data-es="Para inversores con capital desde 50.000€ buscando exposición a activos NPL y carteras de deuda de alto rendimiento."
              data-en="For investors with capital from €50,000 seeking exposure to NPL assets and high-yield debt portfolios."
            >
              Para inversores con capital desde 50.000€ buscando exposición a activos NPL y carteras de deuda de alto rendimiento.
            </p>
            <ul className="reg-features">
              <li data-es="Acceso a cartera NPL exclusiva" data-en="Access to exclusive NPL portfolio">Acceso a cartera NPL exclusiva</li>
              <li data-es="Gestor personal dedicado" data-en="Dedicated personal manager">Gestor personal dedicado</li>
              <li data-es="Chat directo con el equipo" data-en="Direct team chat">Chat directo con el equipo</li>
              <li data-es="Subida y firma de documentos" data-en="Document upload & signing">Subida y firma de documentos</li>
              <li data-es="Reportes de rendimiento en tiempo real" data-en="Real-time performance reports">Reportes de rendimiento en tiempo real</li>
              <li data-es="Due diligence compartida" data-en="Shared due diligence">Due diligence compartida</li>
            </ul>
            <button className="btn-register btn-register-gold" onClick={() => setOpenModal('npl')} data-es="Crear cuenta Inversor" data-en="Create Investor Account">
              Crear cuenta Inversor
            </button>
          </div>
          <div className="register-card reveal">
            <span className="reg-badge" data-es="Crowdfunding · Desde 1.000€" data-en="Crowdfunding · From €1,000">Crowdfunding · Desde 1.000€</span>
            <h3 className="reg-title serif" data-es="Cuenta Crowdfunding" data-en="Crowdfunding Account">Cuenta Crowdfunding</h3>
            <p className="reg-desc"
              data-es="Invierte en inmuebles seleccionados desde cualquier capital. Diversifica sin barreras de entrada."
              data-en="Invest in curated properties from any capital. Diversify without entry barriers."
            >
              Invierte en inmuebles seleccionados desde cualquier capital. Diversifica sin barreras de entrada.
            </p>
            <ul className="reg-features">
              <li data-es="Acceso a proyectos de crowdfunding" data-en="Access to crowdfunding projects">Acceso a proyectos de crowdfunding</li>
              <li data-es="Panel de seguimiento de proyectos" data-en="Project tracking dashboard">Panel de seguimiento de proyectos</li>
              <li data-es="Historial de inversiones" data-en="Investment history">Historial de inversiones</li>
              <li data-es="Documentación digital integrada" data-en="Integrated digital documentation">Documentación digital integrada</li>
              <li data-es="Notificaciones de nuevas oportunidades" data-en="New opportunity notifications">Notificaciones de nuevas oportunidades</li>
            </ul>
            <button className="btn-register btn-register-outline" onClick={() => setOpenModal('crowdfunding')} data-es="Crear cuenta Crowdfunding" data-en="Create Crowdfunding Account">
              Crear cuenta Crowdfunding
            </button>
          </div>
        </div>
      </section>

      {/* PLATAFORMA PRIVADA */}
      <section id="plataforma" style={{ padding: '8rem 2rem', background: 'linear-gradient(180deg,#060709 0%,#07090d 100%)', overflow: 'hidden' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

          {/* Cabecera */}
          <div style={{ textAlign: 'center', marginBottom: '5rem' }}>
            <div className="section-tag reveal" style={{ display: 'inline-block' }}
              data-es="Software privado · Solo inversores" data-en="Private software · Investors only">
              Software privado · Solo inversores
            </div>
            <h2 className="section-h2 serif reveal"
              data-es="Tu cartera.<br><em>A tiempo real.</em>"
              data-en="Your portfolio.<br><em>In real time.</em>"
              style={{ marginBottom: '1rem' }}>
              Tu cartera.<br /><em>A tiempo real.</em>
            </h2>
            <p className="section-intro reveal"
              data-es="El backoffice privado de GrupoSkyLine te da acceso completo a tus operaciones, documentos, rentabilidades y comunicaciones — desde cualquier dispositivo."
              data-en="GrupoSkyLine's private backoffice gives you full access to your operations, documents, returns and communications — from any device."
              style={{ maxWidth: '540px', margin: '0 auto' }}>
              El backoffice privado de GrupoSkyLine te da acceso completo a tus operaciones, documentos, rentabilidades y comunicaciones — desde cualquier dispositivo.
            </p>
          </div>

          {/* Mockup del dashboard */}
          <div className="reveal" style={{ position: 'relative', marginBottom: '5rem' }}>

            {/* Glow detrás del mockup */}
            <div style={{
              position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
              width: '70%', height: '60%', pointerEvents: 'none',
              background: 'radial-gradient(ellipse,rgba(201,160,67,0.08) 0%,transparent 70%)',
              filter: 'blur(40px)',
            }} />

            {/* Marco del browser */}
            <div style={{
              maxWidth: '900px', margin: '0 auto', position: 'relative',
              borderRadius: '14px', overflow: 'hidden',
              border: '1px solid rgba(201,160,67,0.2)',
              boxShadow: '0 40px 120px rgba(0,0,0,0.7), 0 0 0 1px rgba(201,160,67,0.08)',
            }}>
              {/* Barra superior del browser */}
              <div style={{
                background: '#0d0f13', padding: '10px 16px',
                display: 'flex', alignItems: 'center', gap: '10px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
              }}>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['#e05252','#e0a752','#52c152'].map(c => (
                    <div key={c} style={{ width: '10px', height: '10px', borderRadius: '50%', background: c, opacity: 0.7 }} />
                  ))}
                </div>
                <div style={{
                  flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '5px',
                  padding: '4px 12px', fontSize: '10px', color: 'rgba(255,255,255,0.3)',
                  fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  <svg width="9" height="9" viewBox="0 0 12 12" fill="none"><path d="M6 1a5 5 0 1 1 0 10A5 5 0 0 1 6 1z" stroke="currentColor" strokeWidth="1.2"/><path d="M6 4v4M4 6h4" stroke="currentColor" strokeWidth="1.2"/></svg>
                  app.gruposkyline.org/dashboard
                </div>
                <div style={{ width: '36px' }} />
              </div>

              {/* Interfaz del dashboard */}
              <div style={{ background: '#0a0c10', display: 'flex', height: '480px' }}>

                {/* Sidebar */}
                <div style={{
                  width: '200px', flexShrink: 0, background: '#07090c',
                  borderRight: '1px solid rgba(255,255,255,0.05)',
                  padding: '20px 0', display: 'flex', flexDirection: 'column',
                }}>
                  {/* Logo en sidebar */}
                  <div style={{ padding: '0 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '12px' }}>
                    <img src="/logo.png" alt="GrupoSkyLine" style={{ height: '28px', width: 'auto' }} />
                  </div>
                  {[
                    { icon: '⊞', label: 'Dashboard', active: true },
                    { icon: '◈', label: 'Marketplace', active: false },
                    { icon: '◎', label: 'Mi cartera', active: false },
                    { icon: '▣', label: 'Documentos', active: false },
                    { icon: '◉', label: 'Configuración', active: false },
                  ].map(item => (
                    <div key={item.label} style={{
                      padding: '9px 20px', display: 'flex', alignItems: 'center', gap: '10px',
                      background: item.active ? 'rgba(201,160,67,0.08)' : 'transparent',
                      borderLeft: item.active ? '2px solid #C9A043' : '2px solid transparent',
                      marginBottom: '2px',
                    }}>
                      <span style={{ fontSize: '12px', color: item.active ? '#C9A043' : 'rgba(255,255,255,0.3)' }}>{item.icon}</span>
                      <span style={{ fontSize: '11px', color: item.active ? '#C9A043' : 'rgba(255,255,255,0.35)', fontWeight: item.active ? 600 : 400 }}>{item.label}</span>
                    </div>
                  ))}
                  <div style={{ marginTop: 'auto', padding: '16px 20px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg,#C9A043,#8B6E2D)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: '#060709', fontWeight: 700 }}>MR</div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.7)', fontWeight: 600 }}>Manuel R.</div>
                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.25)' }}>Inversor NPL</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contenido principal */}
                <div style={{ flex: 1, padding: '22px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>

                  {/* KPIs */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                    {[
                      { label: 'Capital invertido', value: '150.000€', delta: '+12.3%', color: '#C9A043' },
                      { label: 'Rendimiento acumulado', value: '23.450€', delta: '+15.6%', color: '#4db87a' },
                      { label: 'Operaciones activas', value: '4', delta: '2 nuevas', color: '#4d9fd4' },
                    ].map(kpi => (
                      <div key={kpi.label} style={{
                        background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
                        borderRadius: '10px', padding: '14px',
                      }}>
                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>{kpi.label}</div>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: kpi.color, fontFamily: "'Outfit',sans-serif" }}>{kpi.value}</div>
                        <div style={{ fontSize: '9px', color: '#4db87a', marginTop: '3px' }}>▲ {kpi.delta}</div>
                      </div>
                    ))}
                  </div>

                  {/* Operaciones recientes */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ fontSize: '9px', color: 'rgba(201,160,67,0.7)', letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: '12px' }}>Mis operaciones</div>
                    {[
                      { name: 'Cartera NPL Murcia 2025', tipo: 'NPL', estado: 'Activa', rent: '+18.2%', color: '#b87333' },
                      { name: 'Piso Cartagena — Crowdfunding', tipo: 'CF', estado: 'Activa', rent: '+12.4%', color: '#C9A043' },
                      { name: 'Cartera NPL Valencia IV', tipo: 'NPL', estado: 'Pendiente', rent: '—', color: '#b87333' },
                    ].map(op => (
                      <div key={op.name} style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)',
                      }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: op.color, flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.75)', fontWeight: 500 }}>{op.name}</div>
                          <div style={{ fontSize: '8.5px', color: 'rgba(255,255,255,0.25)', marginTop: '2px' }}>{op.tipo}</div>
                        </div>
                        <div style={{
                          fontSize: '8px', padding: '2px 8px', borderRadius: '10px',
                          background: op.estado === 'Activa' ? 'rgba(77,184,122,0.1)' : 'rgba(201,160,67,0.1)',
                          color: op.estado === 'Activa' ? '#4db87a' : '#C9A043',
                          border: `1px solid ${op.estado === 'Activa' ? 'rgba(77,184,122,0.2)' : 'rgba(201,160,67,0.2)'}`,
                        }}>{op.estado}</div>
                        <div style={{ fontSize: '10px', color: op.rent !== '—' ? '#4db87a' : 'rgba(255,255,255,0.2)', fontWeight: 600, minWidth: '40px', textAlign: 'right' }}>{op.rent}</div>
                      </div>
                    ))}
                  </div>

                  {/* Marketplace preview */}
                  <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <div style={{ fontSize: '9px', color: 'rgba(201,160,67,0.7)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>Nuevas oportunidades</div>
                      <div style={{ fontSize: '8px', color: '#C9A043', opacity: 0.6 }}>Ver marketplace →</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      {[
                        { name: 'NPL Almería — 2025', tickets: '3/10', rent: '22%', tipo: 'NPL' },
                        { name: 'Crowdfunding Elche', tickets: '7/12', rent: '14%', tipo: 'CF' },
                      ].map(op => (
                        <div key={op.name} style={{
                          background: 'rgba(255,255,255,0.025)', borderRadius: '8px', padding: '10px',
                          border: '1px solid rgba(255,255,255,0.05)',
                        }}>
                          <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginBottom: '4px' }}>{op.name}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '8px', color: 'rgba(255,255,255,0.25)' }}>{op.tickets} tickets</span>
                            <span style={{ fontSize: '9px', color: '#4db87a', fontWeight: 700 }}>+{op.rent}</span>
                          </div>
                          {/* Barra de progreso mini */}
                          <div style={{ marginTop: '6px', height: '3px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px' }}>
                            <div style={{
                              height: '100%', borderRadius: '2px',
                              width: `${(parseInt(op.tickets)/parseInt(op.tickets.split('/')[1]))*100}%`,
                              background: op.tipo === 'NPL' ? '#b87333' : '#C9A043',
                            }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* Features del software */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '1.5rem', marginBottom: '4rem' }} className="platform-features-grid">
            {[
              { icon: '◈', title: lang === 'es' ? 'Marketplace privado' : 'Private marketplace', desc: lang === 'es' ? 'Operaciones NPL y crowdfunding seleccionadas. Solo para inversores registrados.' : 'Curated NPL and crowdfunding deals. Registered investors only.' },
              { icon: '◎', title: lang === 'es' ? 'Cartera en tiempo real' : 'Real-time portfolio', desc: lang === 'es' ? 'Sigue la evolución de tu inversión, tickets y rentabilidad al día.' : 'Track your investment performance, tickets and returns daily.' },
              { icon: '▣', title: lang === 'es' ? 'Documentos y PDFs' : 'Documents & PDFs', desc: lang === 'es' ? 'Accede a los informes redactados y firmados de cada operación.' : 'Access signed and redacted reports for each operation.' },
              { icon: '◉', title: lang === 'es' ? 'Acceso seguro' : 'Secure access', desc: lang === 'es' ? 'Plataforma privada con autenticación y verificación de inversor.' : 'Private platform with authentication and investor verification.' },
            ].map(f => (
              <div key={f.title} className="reveal" style={{
                background: 'rgba(255,255,255,0.02)',
                border: '1px solid rgba(201,160,67,0.1)',
                borderRadius: '14px', padding: '1.5rem',
              }}>
                <div style={{ fontSize: '22px', color: '#C9A043', marginBottom: '0.875rem', opacity: 0.8 }}>{f.icon}</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-0)', marginBottom: '0.5rem' }}>{f.title}</div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-3)', lineHeight: 1.65 }}>{f.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          <div className="reveal" style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn-primary" onClick={() => setOpenModal('npl')}
                data-es="Solicitar acceso" data-en="Request access">
                Solicitar acceso
              </button>
              <button className="btn-outline" onClick={() => setOpenModal('crowdfunding')}
                data-es="Explorar crowdfunding" data-en="Explore crowdfunding">
                Explorar crowdfunding
              </button>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-3)', marginTop: '1.25rem', letterSpacing: '0.05em' }}
              data-es="Acceso bajo revisión · Solo inversores acreditados" data-en="Access under review · Accredited investors only">
              Acceso bajo revisión · Solo inversores acreditados
            </p>
          </div>

        </div>

        <style>{`
          @media (max-width: 900px) {
            .platform-features-grid { grid-template-columns: 1fr 1fr !important; }
          }
          @media (max-width: 600px) {
            .platform-features-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </section>

      {/* FOOTER */}
      <footer>
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="nav-logo" style={{ marginBottom: '1rem' }}>
              <img src="/logo.png" alt="Grupo SkyLine Investment" style={{ height: '52px', width: 'auto', display: 'block' }} />
            </div>
            <p data-es="Capital privado, real estate y fintech. Conectamos inversores con oportunidades de alto rendimiento en España y Europa." data-en="Private capital, real estate and fintech. Connecting investors with high-yield opportunities across Spain and Europe.">
              Capital privado, real estate y fintech. Conectamos inversores con oportunidades de alto rendimiento en España y Europa.
            </p>
          </div>
          <div className="footer-col">
            <h4 data-es="Inversión" data-en="Investment">Inversión</h4>
            <a href="#" data-es="NPL & Deuda" data-en="NPL & Debt">NPL &amp; Deuda</a>
            <a href="#" data-es="Crowdfunding Inmobiliario" data-en="Real Estate Crowdfunding">Crowdfunding Inmobiliario</a>
            <a href="#" data-es="Crowdfunding" data-en="Crowdfunding">Crowdfunding</a>
            <a href="#" data-es="Due Diligence" data-en="Due Diligence">Due Diligence</a>
          </div>
          <div className="footer-col">
            <h4 data-es="Inmobiliario" data-en="Real Estate">Inmobiliario</h4>
            <a href="#" data-es="Habitaciones Murcia" data-en="Murcia Rooms">Habitaciones Murcia</a>
            <a href="#" data-es="Gestión de Pisos" data-en="Property Management">Gestión de Pisos</a>
            <a href="#" data-es="Rent to Rent" data-en="Rent to Rent">Rent to Rent</a>
            <a href="#" data-es="Para Propietarios" data-en="For Owners">Para Propietarios</a>
          </div>
          <div className="footer-col">
            <h4 data-es="Plataforma" data-en="Platform">Plataforma</h4>
            <a href="#" onClick={e => { e.preventDefault(); setOpenModal('npl') }} data-es="Acceder al backoffice" data-en="Access backoffice">Acceder al backoffice</a>
            <a href="#" data-es="Sobre nosotros" data-en="About us">Sobre nosotros</a>
            <a href="#" data-es="Privacidad" data-en="Privacy">Privacidad</a>
            <a href="#" data-es="Términos" data-en="Terms">Términos</a>
          </div>
        </div>
        <div className="footer-bottom">
          <span data-es="© 2025 GrupoSkyLine. Todos los derechos reservados." data-en="© 2025 GrupoSkyLine. All rights reserved.">© 2025 GrupoSkyLine. Todos los derechos reservados.</span>
          <span data-es="gruposkyline.org · Madrid, España" data-en="gruposkyline.org · Madrid, Spain">gruposkyline.org · Madrid, España</span>
        </div>
      </footer>

      {/* MODAL NPL */}
      <div
        className={`modal-overlay${openModal === 'npl' ? ' active' : ''}`}
        onClick={e => { if (e.target === e.currentTarget) close() }}
      >
        <div className="modal">
          <button className="modal-close" onClick={close}>×</button>
          <div className="reg-badge" style={{ marginBottom: '1.5rem' }} data-es="Inversor NPL · Premium" data-en="NPL · Premium Investor">
            Inversor NPL · Premium
          </div>
          <h2 className="modal-title serif" data-es="Cuenta Premium" data-en="Premium Account">Cuenta Premium</h2>
          <p className="modal-sub" data-es="Acceso completo a oportunidades NPL, carteras de deuda y backoffice privado." data-en="Full access to NPL opportunities, debt portfolios and private backoffice.">
            Acceso completo a oportunidades NPL, carteras de deuda y backoffice privado.
          </p>
          <div className="form-steps">
            <div className={`form-step${nplDone ? ' done' : ' active'}`} />
            <div className={`form-step${nplDone ? ' done active' : ''}`} />
            <div className={`form-step${nplDone ? ' done active' : ''}`} />
          </div>
          {nplDone ? successBox(close, lang === 'es' ? 'Solicitud enviada' : 'Request sent') : (
            <form onSubmit={e => { e.preventDefault(); setNplDone(true) }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" data-es="Nombre" data-en="First name">Nombre</label>
                  <input type="text" className="form-input" placeholder="Enrique" required />
                </div>
                <div className="form-group">
                  <label className="form-label" data-es="Apellidos" data-en="Last name">Apellidos</label>
                  <input type="text" className="form-input" placeholder="García Martínez" required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" data-es="Email profesional" data-en="Professional email">Email profesional</label>
                <input type="email" className="form-input" placeholder="contacto@empresa.com" required />
              </div>
              <div className="form-group">
                <label className="form-label" data-es="Teléfono" data-en="Phone">Teléfono</label>
                <input type="tel" className="form-input" placeholder="+34 600 000 000" required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" data-es="Capital disponible" data-en="Available capital">Capital disponible</label>
                  <select className="form-input">
                    <option data-es="50.000€ — 150.000€" data-en="€50K — €150K">50.000€ — 150.000€</option>
                    <option data-es="150.000€ — 500.000€" data-en="€150K — €500K">150.000€ — 500.000€</option>
                    <option data-es="500.000€ — 1M€" data-en="€500K — €1M">500.000€ — 1M€</option>
                    <option data-es="+1.000.000€" data-en="+€1M">+1.000.000€</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" data-es="Perfil de riesgo" data-en="Risk profile">Perfil de riesgo</label>
                  <select className="form-input">
                    <option data-es="Conservador" data-en="Conservative">Conservador</option>
                    <option data-es="Moderado" data-en="Moderate">Moderado</option>
                    <option data-es="Agresivo" data-en="Aggressive">Agresivo</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" data-es="¿Cómo nos conociste?" data-en="How did you find us?">¿Cómo nos conociste?</label>
                <select className="form-input">
                  <option data-es="Referido / Recomendación" data-en="Referral">Referido / Recomendación</option>
                  <option data-es="LinkedIn" data-en="LinkedIn">LinkedIn</option>
                  <option data-es="Google" data-en="Google">Google</option>
                  <option data-es="Evento" data-en="Event">Evento</option>
                  <option data-es="Otro" data-en="Other">Otro</option>
                </select>
              </div>
              <button type="submit" className="form-submit" data-es="Solicitar acceso Premium →" data-en="Request Premium access →">
                Solicitar acceso Premium →
              </button>
              <p className="form-disclaimer" data-es="Un asesor de GrupoSkyLine se pondrá en contacto en menos de 24h. Sus datos están protegidos." data-en="A GrupoSkyLine advisor will contact you within 24h. Your data is protected.">
                Un asesor de GrupoSkyLine se pondrá en contacto en menos de 24h. Sus datos están protegidos.
              </p>
            </form>
          )}
        </div>
      </div>

      {/* MODAL CROWDFUNDING */}
      <div
        className={`modal-overlay${openModal === 'crowdfunding' ? ' active' : ''}`}
        onClick={e => { if (e.target === e.currentTarget) close() }}
      >
        <div className="modal">
          <button className="modal-close" onClick={close}>×</button>
          <div className="reg-badge" style={{ marginBottom: '1.5rem' }} data-es="Crowdfunding Inmobiliario" data-en="Real Estate Crowdfunding">
            Crowdfunding Inmobiliario
          </div>
          <h2 className="modal-title serif" data-es="Cuenta Crowdfunding" data-en="Crowdfunding Account">Cuenta Crowdfunding</h2>
          <p className="modal-sub" data-es="Empieza a invertir desde 1.000€. Acceso inmediato a proyectos seleccionados." data-en="Start investing from €1,000. Immediate access to curated projects.">
            Empieza a invertir desde 1.000€. Acceso inmediato a proyectos seleccionados.
          </p>
          <div className="form-steps">
            <div className={`form-step${cfDone ? ' done' : ' active'}`} />
            <div className={`form-step${cfDone ? ' done active' : ''}`} />
          </div>
          {cfDone ? successBox(close, lang === 'es' ? 'Cuenta creada' : 'Account created') : (
            <form onSubmit={e => { e.preventDefault(); setCfDone(true) }}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label" data-es="Nombre" data-en="First name">Nombre</label>
                  <input type="text" className="form-input" placeholder="María" required />
                </div>
                <div className="form-group">
                  <label className="form-label" data-es="Apellidos" data-en="Last name">Apellidos</label>
                  <input type="text" className="form-input" placeholder="López" required />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" data-es="Email" data-en="Email">Email</label>
                <input type="email" className="form-input" placeholder="maria@email.com" required />
              </div>
              <div className="form-group">
                <label className="form-label" data-es="Teléfono" data-en="Phone">Teléfono</label>
                <input type="tel" className="form-input" placeholder="+34 600 000 000" />
              </div>
              <div className="form-group">
                <label className="form-label" data-es="Capital inicial estimado" data-en="Initial capital estimate">Capital inicial estimado</label>
                <select className="form-input">
                  <option data-es="1.000€ — 5.000€" data-en="€1K — €5K">1.000€ — 5.000€</option>
                  <option data-es="5.000€ — 15.000€" data-en="€5K — €15K">5.000€ — 15.000€</option>
                  <option data-es="15.000€ — 50.000€" data-en="€15K — €50K">15.000€ — 50.000€</option>
                  <option data-es="+50.000€ (ver cuenta Premium)" data-en="+€50K (see Premium account)">+50.000€ (ver cuenta Premium)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" data-es="Objetivo de inversión" data-en="Investment goal">Objetivo de inversión</label>
                <select className="form-input">
                  <option data-es="Rentabilidad pasiva" data-en="Passive income">Rentabilidad pasiva</option>
                  <option data-es="Diversificación" data-en="Diversification">Diversificación</option>
                  <option data-es="Ahorro a largo plazo" data-en="Long-term savings">Ahorro a largo plazo</option>
                  <option data-es="Primera inversión inmobiliaria" data-en="First real estate investment">Primera inversión inmobiliaria</option>
                </select>
              </div>
              <button type="submit" className="form-submit" data-es="Crear mi cuenta →" data-en="Create my account →">
                Crear mi cuenta →
              </button>
              <p className="form-disclaimer" data-es="Acceso a tu panel en menos de 24h. Tus datos están cifrados y protegidos." data-en="Dashboard access within 24h. Your data is encrypted and protected.">
                Acceso a tu panel en menos de 24h. Tus datos están cifrados y protegidos.
              </p>
            </form>
          )}
        </div>
      </div>
    </>
  )
}
