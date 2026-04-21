import { createClient } from "@/lib/supabase/server";
import BoeMonitorClient from "./BoeMonitorClient";

export default async function BoePage() {
  const supabase = await createClient();

  const [
    { count: totalPublicaciones },
    { count: totalConvocatorias },
    { data: ultimas },
  ] = await Promise.all([
    supabase.from('boe_publicaciones').select('id', { count: 'exact', head: true }),
    supabase.from('boe_publicaciones').select('id', { count: 'exact', head: true }).eq('es_convocatoria', true),
    supabase.from('boe_publicaciones')
      .select('titulo, boletin, es_convocatoria, fecha_publicacion, url')
      .order('created_at', { ascending: false })
      .limit(20),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Monitor BOE</h1>
      <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
        Seguimiento automático de boletines oficiales
      </p>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="glass rounded-2xl p-5">
          <div className="text-3xl font-bold" style={{ color: "var(--green)" }}>{totalPublicaciones ?? 0}</div>
          <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>Publicaciones procesadas</div>
        </div>
        <div className="glass rounded-2xl p-5">
          <div className="text-3xl font-bold" style={{ color: "var(--green)" }}>{totalConvocatorias ?? 0}</div>
          <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>Convocatorias detectadas</div>
        </div>
      </div>

      <div className="mb-8">
        <BoeMonitorClient />
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="font-semibold mb-4">Últimas publicaciones</h2>
        {!ultimas || ultimas.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--muted)" }}>Sin publicaciones aún. Lanza el monitor.</p>
        ) : (
          <div className="space-y-2">
            {ultimas.map((p, i) => (
              <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-white/5 transition-colors"
              >
                <span className="text-xs font-mono px-2 py-0.5 rounded shrink-0"
                  style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted)" }}>
                  {p.boletin}
                </span>
                <span className="text-sm flex-1 truncate">{p.titulo}</span>
                {p.es_convocatoria && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{ background: "rgba(29,158,117,0.15)", color: "var(--green)" }}>
                    CONV
                  </span>
                )}
                <span className="text-xs shrink-0" style={{ color: "var(--muted)" }}>
                  {new Date(p.fecha_publicacion).toLocaleDateString('es-ES')}
                </span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
