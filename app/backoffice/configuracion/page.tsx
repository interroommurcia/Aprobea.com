import { createClient } from "@/lib/supabase/server";

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const boletines = [
    { id:"BOE",     nombre:"BOE — Estatal",              url:"https://www.boe.es/rss/canal.php?s=empleo-publico" },
    { id:"BOCM",    nombre:"BOCM — Madrid",              url:"https://www.bocm.es/rss" },
    { id:"BOJA",    nombre:"BOJA — Andalucía",           url:"https://www.juntadeandalucia.es/boja/rss" },
    { id:"DOGC",    nombre:"DOGC — Cataluña",            url:"https://dogc.gencat.cat/ca/rss" },
    { id:"DOG",     nombre:"DOG — Galicia",              url:"https://www.xunta.gal/dog" },
    { id:"BOA",     nombre:"BOA — Aragón",               url:"https://www.boa.aragon.es" },
    { id:"BORM",    nombre:"BORM — Murcia",              url:"https://www.borm.es" },
    { id:"DOCV",    nombre:"DOCV — Comunitat Valenciana",url:"https://dogv.gva.es" },
    { id:"BOPB",    nombre:"BOPB — Barcelona",           url:"https://bop.diba.cat" },
    { id:"BOP-MAD", nombre:"BOP Madrid",                 url:"https://www.comunidad.madrid/boletin" },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Configuración</h1>
      <p className="text-sm mb-8" style={{ color:"var(--muted)" }}>
        Ajustes del sistema y del monitor BOE
      </p>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Admin info */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-semibold mb-4">Cuenta admin</h2>
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2"
              style={{ borderBottom:"1px solid rgba(255,255,255,0.05)" }}>
              <span className="text-sm" style={{ color:"var(--muted)" }}>Email</span>
              <span className="text-sm font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-sm" style={{ color:"var(--muted)" }}>Admin configurado</span>
              <span className="text-xs px-2.5 py-1 rounded-full font-bold"
                style={{ background:"rgba(29,158,117,0.15)", color:"var(--green)" }}>
                aprobe.com@gmail.com
              </span>
            </div>
          </div>
        </div>

        {/* Variables de entorno necesarias */}
        <div className="glass rounded-2xl p-6">
          <h2 className="font-semibold mb-4">Variables de entorno</h2>
          <div className="space-y-2">
            {[
              { key:"NEXT_PUBLIC_SUPABASE_URL",     req:true },
              { key:"NEXT_PUBLIC_SUPABASE_ANON_KEY",req:true },
              { key:"SUPABASE_SERVICE_ROLE_KEY",    req:true },
              { key:"ANTHROPIC_API_KEY",            req:true },
              { key:"CRON_SECRET",                  req:true },
              { key:"ADMIN_EMAILS",                 req:true },
              { key:"STRIPE_SECRET_KEY",            req:false },
              { key:"RESEND_API_KEY",               req:false },
              { key:"NEXT_PUBLIC_APP_URL",          req:false },
            ].map(v => (
              <div key={v.key} className="flex items-center justify-between py-1.5 text-xs">
                <span className="font-mono" style={{ color:"var(--cream)" }}>{v.key}</span>
                <span className="px-2 py-0.5 rounded"
                  style={{
                    background: v.req ? "rgba(239,100,68,0.1)" : "rgba(255,255,255,0.05)",
                    color:      v.req ? "#ef6444" : "var(--muted)",
                  }}>
                  {v.req ? "Requerida" : "Opcional"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Boletines monitorizados */}
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold">Boletines monitorizados</h2>
              <p className="text-xs mt-0.5" style={{ color:"var(--muted)" }}>
                El cron corre diariamente vía Vercel. Lanzar manualmente desde Monitor BOE.
              </p>
            </div>
            <a href="/backoffice/boe"
              className="text-sm px-4 py-2 rounded-xl font-medium glass transition-colors"
              style={{ color:"var(--green)" }}>
              Ir al Monitor →
            </a>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {boletines.map(b => (
              <div key={b.id} className="flex items-center gap-3 rounded-xl px-4 py-3"
                style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.05)" }}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background:"var(--green)" }} />
                <div className="min-w-0">
                  <div className="text-sm font-medium">{b.nombre}</div>
                  <div className="text-[10px] truncate font-mono mt-0.5" style={{ color:"var(--muted)" }}>
                    {b.url}
                  </div>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded ml-auto shrink-0"
                  style={{ background:"rgba(29,158,117,0.1)", color:"var(--green)" }}>
                  {b.id}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Cron config */}
        <div className="glass rounded-2xl p-6 lg:col-span-2">
          <h2 className="font-semibold mb-4">Cron / Automatización (vercel.json)</h2>
          <pre className="text-xs p-4 rounded-xl overflow-x-auto"
            style={{ background:"rgba(0,0,0,0.3)", color:"#a3e6c4", border:"1px solid rgba(255,255,255,0.06)" }}>
{`{
  "crons": [
    {
      "path": "/api/boe/monitor",
      "schedule": "0 7 * * *"
    },
    {
      "path": "/api/cron/churn",
      "schedule": "0 9 * * *"
    }
  ]
}`}
          </pre>
          <p className="text-xs mt-3" style={{ color:"var(--muted)" }}>
            El monitor BOE se lanza cada día a las 07:00 UTC. Requiere <code className="px-1 rounded"
              style={{ background:"rgba(255,255,255,0.06)" }}>CRON_SECRET</code> en las variables de entorno.
          </p>
        </div>
      </div>
    </div>
  );
}
