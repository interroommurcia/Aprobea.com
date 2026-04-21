"use client";
import { useState } from "react";

type Ticket = {
  id: string;
  categoria: string | null;
  mensaje_original: string;
  resumen_ia: string | null;
  estado: string;
  prioridad: string;
  resolucion: string | null;
  created_at: string;
  usuario: string;
};

const ESTADOS = ["todos", "pendiente", "en_revision", "resuelto", "cerrado"];
const PRIORIDADES = ["todos", "alta", "media", "baja"];

export default function TicketsClient({ tickets }: { tickets: Ticket[] }) {
  const [filtroEstado, setFiltroEstado] = useState("pendiente");
  const [filtroPrioridad, setFiltroPrioridad] = useState("todos");
  const [expandido, setExpandido] = useState<string | null>(null);
  const [resolucion, setResolucion] = useState("");
  const [guardando, setGuardando] = useState(false);

  const filtered = tickets.filter(t => {
    const matchE = filtroEstado === "todos" || t.estado === filtroEstado;
    const matchP = filtroPrioridad === "todos" || t.prioridad === filtroPrioridad;
    return matchE && matchP;
  });

  async function resolver(id: string) {
    if (!resolucion.trim()) return;
    setGuardando(true);
    await fetch(`/api/backoffice/tickets/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: "resuelto", resolucion }),
    });
    setGuardando(false);
    setExpandido(null);
    setResolucion("");
    window.location.reload();
  }

  const prioColor = (p: string) => ({ alta: "#ef6444", media: "#fbbf24", baja: "var(--muted)" })[p] ?? "var(--muted)";
  const estadoColor = (e: string) => ({ pendiente: "#ef6444", en_revision: "#fbbf24", resuelto: "var(--green)", cerrado: "var(--muted)" })[e] ?? "var(--muted)";

  return (
    <div>
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-1">
          {ESTADOS.map(e => (
            <button key={e} onClick={() => setFiltroEstado(e)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors"
              style={{
                background: filtroEstado === e ? "rgba(29,158,117,0.2)" : "rgba(255,255,255,0.04)",
                color: filtroEstado === e ? "var(--green)" : "var(--muted)",
                border: filtroEstado === e ? "1px solid rgba(29,158,117,0.3)" : "1px solid transparent",
              }}>
              {e}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {PRIORIDADES.map(p => (
            <button key={p} onClick={() => setFiltroPrioridad(p)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors"
              style={{
                background: filtroPrioridad === p ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.04)",
                color: filtroPrioridad === p ? "var(--cream)" : "var(--muted)",
              }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center" style={{ color: "var(--muted)" }}>
            {tickets.length === 0 ? "Sin tickets todavía. El chatbot creará tickets cuando los usuarios escalen." : "Sin resultados con este filtro."}
          </div>
        ) : filtered.map(t => (
          <div key={t.id} className="glass rounded-2xl overflow-hidden">
            <div
              className="flex items-start gap-4 p-5 cursor-pointer hover:bg-white/[0.02] transition-colors"
              onClick={() => setExpandido(expandido === t.id ? null : t.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded"
                    style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted)" }}>
                    {t.categoria ?? "GENERAL"}
                  </span>
                  <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded"
                    style={{ color: prioColor(t.prioridad) }}>
                    ● {t.prioridad}
                  </span>
                </div>
                <div className="font-medium text-sm mb-1">{t.usuario}</div>
                {t.resumen_ia ? (
                  <div className="text-xs" style={{ color: "var(--muted)" }}>{t.resumen_ia}</div>
                ) : (
                  <div className="text-xs truncate" style={{ color: "var(--muted)" }}>{t.mensaje_original}</div>
                )}
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className="text-[11px] font-bold px-2.5 py-1 rounded-full capitalize"
                  style={{ background: "rgba(255,255,255,0.06)", color: estadoColor(t.estado) }}>
                  {t.estado.replace("_", " ")}
                </span>
                <span className="text-xs" style={{ color: "var(--muted)" }}>
                  {new Date(t.created_at).toLocaleDateString("es-ES")}
                </span>
              </div>
            </div>

            {expandido === t.id && (
              <div className="px-5 pb-5 pt-0" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="mt-4 mb-3 text-sm p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)" }}>
                  <div className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--muted)" }}>
                    Mensaje original
                  </div>
                  {t.mensaje_original}
                </div>
                {t.estado !== "resuelto" && t.estado !== "cerrado" && (
                  <div className="space-y-3">
                    <textarea
                      value={resolucion}
                      onChange={e => setResolucion(e.target.value)}
                      placeholder="Escribe la resolución del ticket..."
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--cream)" }}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => resolver(t.id)}
                        disabled={guardando || !resolucion.trim()}
                        className="glow-btn px-4 py-2 rounded-lg text-sm font-semibold text-black"
                        style={{ background: "var(--green)", opacity: guardando || !resolucion.trim() ? 0.5 : 1 }}>
                        {guardando ? "Guardando…" : "✓ Marcar resuelto"}
                      </button>
                      <button onClick={() => setExpandido(null)}
                        className="px-4 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
                        style={{ color: "var(--muted)" }}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
                {t.resolucion && (
                  <div className="mt-3 text-sm p-4 rounded-xl" style={{ background: "rgba(29,158,117,0.08)", border: "1px solid rgba(29,158,117,0.15)" }}>
                    <div className="text-xs font-semibold mb-1" style={{ color: "var(--green)" }}>Resolución</div>
                    {t.resolucion}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
