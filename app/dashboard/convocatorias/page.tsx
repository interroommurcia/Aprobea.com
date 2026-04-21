import { createClient } from "@/lib/supabase/server";

export default async function DashboardConvocatoriasPage() {
  const supabase = await createClient();

  const { data: convocatorias } = await supabase
    .from("convocatorias")
    .select("id, titulo, categoria, num_plazas, fecha_limite, boletin_referencia, url_boletin, organismo_nombre, enlace_bases, estado, created_at")
    .order("created_at", { ascending: false })
    .limit(60);

  const activas   = convocatorias?.filter(c => c.estado === "activa")   ?? [];
  const cerradas  = convocatorias?.filter(c => c.estado !== "activa")   ?? [];

  function diasRestantes(fecha: string | null): number | null {
    if (!fecha) return null;
    return Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000);
  }

  const CardConv = ({ c }: { c: typeof activas[0] }) => {
    const dias = diasRestantes(c.fecha_limite);
    const urgente = dias !== null && dias <= 14 && dias >= 0;
    return (
      <a href={c.url_boletin ?? "#"} target="_blank" rel="noopener noreferrer"
        className="glass rounded-2xl p-5 block hover:-translate-y-0.5 transition-all duration-200 group"
        style={{ borderColor: urgente ? "rgba(239,100,68,0.3)" : undefined }}>
        <div className="flex items-start justify-between mb-3">
          <div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded mr-2"
              style={{ background:"rgba(255,255,255,0.06)", color:"var(--muted)" }}>
              {c.boletin_referencia ?? "BOE"}
            </span>
            {urgente && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{ background:"rgba(239,100,68,0.15)", color:"#ef6444" }}>
                URGENTE
              </span>
            )}
          </div>
          {dias !== null && dias >= 0 && (
            <span className="text-xs font-semibold shrink-0"
              style={{ color: urgente ? "#ef6444" : "var(--muted)" }}>
              {dias}d restantes
            </span>
          )}
          {dias !== null && dias < 0 && (
            <span className="text-xs" style={{ color:"var(--muted)" }}>Cerrada</span>
          )}
        </div>
        <div className="font-semibold text-sm mb-1">{c.titulo}</div>
        <div className="text-xs mb-3" style={{ color:"var(--muted)" }}>
          {c.organismo_nombre ?? "Organismo público"}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {c.categoria && (
            <span className="text-[11px] px-2.5 py-1 rounded-lg"
              style={{ background:"rgba(255,255,255,0.05)", color:"var(--muted)" }}>
              {c.categoria}
            </span>
          )}
          {c.num_plazas != null && (
            <span className="text-[11px] px-2.5 py-1 rounded-lg"
              style={{ background:"rgba(29,158,117,0.08)", color:"var(--green)" }}>
              {c.num_plazas} plazas
            </span>
          )}
        </div>
        <div className="mt-3 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ color:"var(--green)" }}>
          Ver en {c.boletin_referencia ?? "BOE"} →
        </div>
      </a>
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Convocatorias</h1>
      <p className="text-sm mb-8" style={{ color:"var(--muted)" }}>
        Detectadas automáticamente de BOE y boletines regionales
      </p>

      {activas.length === 0 && cerradas.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center" style={{ color:"var(--muted)" }}>
          <div className="text-4xl mb-4">📡</div>
          <p>Aún no hay convocatorias registradas.</p>
          <p className="text-xs mt-2">El sistema las detecta automáticamente del BOE cada 24h.</p>
        </div>
      ) : (
        <>
          {activas.length > 0 && (
            <div className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="font-semibold">Activas</h2>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{ background:"rgba(29,158,117,0.15)", color:"var(--green)" }}>
                  {activas.length}
                </span>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activas.map(c => <CardConv key={c.id} c={c} />)}
              </div>
            </div>
          )}
          {cerradas.length > 0 && (
            <div>
              <h2 className="font-semibold mb-4 flex items-center gap-2">
                Cerradas / Resueltas
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background:"rgba(255,255,255,0.06)", color:"var(--muted)" }}>
                  {cerradas.length}
                </span>
              </h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {cerradas.slice(0, 12).map(c => <CardConv key={c.id} c={c} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
