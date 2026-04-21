import { createClient } from "@/lib/supabase/server";
import ConvocatoriasClient from "./ConvocatoriasClient";

export default async function ConvocatoriasPage() {
  const supabase = await createClient();

  const { data: convocatorias } = await supabase
    .from("convocatorias")
    .select("id, titulo, categoria, num_plazas, fecha_limite, boletin_referencia, url_boletin, organismo_nombre, enlace_bases, estado, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const counts = {
    activas: convocatorias?.filter(c => c.estado === "activa").length ?? 0,
    cerradas: convocatorias?.filter(c => c.estado === "cerrada").length ?? 0,
    total: convocatorias?.length ?? 0,
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Convocatorias</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Detectadas por el monitor BOE · {counts.activas} activas · {counts.total} total
          </p>
        </div>
        <a
          href="/backoffice/boe"
          className="glow-btn px-4 py-2.5 rounded-xl text-sm font-semibold text-black"
          style={{ background: "var(--green)" }}
        >
          ▶ Lanzar monitor
        </a>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total convocatorias", value: counts.total, color: "var(--green)" },
          { label: "Activas", value: counts.activas, color: "var(--green)" },
          { label: "Cerradas / resueltas", value: counts.cerradas, color: "var(--muted)" },
        ].map(k => (
          <div key={k.label} className="glass rounded-2xl p-5">
            <div className="text-3xl font-bold" style={{ color: k.color }}>{k.value}</div>
            <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>{k.label}</div>
          </div>
        ))}
      </div>

      <ConvocatoriasClient convocatorias={convocatorias ?? []} />
    </div>
  );
}
