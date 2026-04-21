"use client";
import { useState } from "react";

type Conv = {
  id: string;
  titulo: string;
  categoria: string | null;
  num_plazas: number | null;
  fecha_limite: string | null;
  boletin_referencia: string | null;
  url_boletin: string | null;
  organismo_nombre: string | null;
  enlace_bases: string | null;
  estado: string;
  created_at: string;
};

const ESTADOS = ["todos", "activa", "cerrada", "en_curso", "resuelta"];

export default function ConvocatoriasClient({ convocatorias }: { convocatorias: Conv[] }) {
  const [filtro, setFiltro] = useState("todos");
  const [busqueda, setBusqueda] = useState("");

  const filtered = convocatorias.filter(c => {
    const matchEstado = filtro === "todos" || c.estado === filtro;
    const q = busqueda.toLowerCase();
    const matchBusq = !q ||
      c.titulo.toLowerCase().includes(q) ||
      (c.organismo_nombre ?? "").toLowerCase().includes(q) ||
      (c.categoria ?? "").toLowerCase().includes(q) ||
      (c.boletin_referencia ?? "").toLowerCase().includes(q);
    return matchEstado && matchBusq;
  });

  function estadoColor(estado: string) {
    const map: Record<string, string> = {
      activa: "rgba(29,158,117,0.15)",
      cerrada: "rgba(255,255,255,0.06)",
      en_curso: "rgba(251,191,36,0.15)",
      resuelta: "rgba(99,102,241,0.15)",
    };
    return map[estado] ?? "rgba(255,255,255,0.06)";
  }
  function estadoText(estado: string) {
    const map: Record<string, string> = {
      activa: "var(--green)",
      cerrada: "var(--muted)",
      en_curso: "#fbbf24",
      resuelta: "#818cf8",
    };
    return map[estado] ?? "var(--muted)";
  }

  return (
    <div className="glass rounded-2xl overflow-hidden">
      {/* Filtros */}
      <div className="flex flex-wrap gap-3 p-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <input
          type="text"
          placeholder="Buscar convocatoria, organismo, boletin..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="flex-1 min-w-48 px-4 py-2 rounded-xl text-sm outline-none"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--cream)" }}
        />
        <div className="flex gap-1">
          {ESTADOS.map(e => (
            <button key={e} onClick={() => setFiltro(e)}
              className="px-3 py-2 rounded-lg text-xs font-medium capitalize transition-colors"
              style={{
                background: filtro === e ? "rgba(29,158,117,0.2)" : "rgba(255,255,255,0.04)",
                color: filtro === e ? "var(--green)" : "var(--muted)",
                border: filtro === e ? "1px solid rgba(29,158,117,0.3)" : "1px solid transparent",
              }}>
              {e}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center" style={{ color: "var(--muted)" }}>
          {convocatorias.length === 0
            ? "Sin convocatorias. Lanza el Monitor BOE para detectarlas automáticamente."
            : "Sin resultados con este filtro."}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                {["Organismo", "Convocatoria", "Categoría", "Plazas", "Boletín", "Plazo", "Estado", ""].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                    style={{ color: "var(--muted)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id}
                  style={{ borderBottom: i < filtered.length - 1 ? "1px solid rgba(255,255,255,0.04)" : undefined }}
                  className="hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-medium" style={{ maxWidth: "150px" }}>
                    <div className="truncate text-sm">{c.organismo_nombre ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3" style={{ maxWidth: "220px" }}>
                    <div className="font-medium text-sm truncate">{c.titulo}</div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded-lg"
                      style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted)" }}>
                      {c.categoria ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm" style={{ color: "var(--muted)" }}>
                    {c.num_plazas ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs font-mono px-2 py-1 rounded"
                      style={{ background: "rgba(255,255,255,0.05)", color: "var(--muted)" }}>
                      {c.boletin_referencia ?? "BOE"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: "var(--muted)" }}>
                    {c.fecha_limite ? new Date(c.fecha_limite).toLocaleDateString("es-ES") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full capitalize"
                      style={{ background: estadoColor(c.estado), color: estadoText(c.estado) }}>
                      {c.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {c.url_boletin && (
                        <a href={c.url_boletin} target="_blank" rel="noopener noreferrer"
                          className="text-xs px-2.5 py-1.5 rounded-lg transition-colors hover:bg-white/10"
                          style={{ color: "var(--green)", border: "1px solid rgba(29,158,117,0.2)" }}>
                          BOE →
                        </a>
                      )}
                      {c.enlace_bases && (
                        <a href={c.enlace_bases} target="_blank" rel="noopener noreferrer"
                          className="text-xs px-2.5 py-1.5 rounded-lg transition-colors hover:bg-white/10"
                          style={{ color: "var(--muted)", border: "1px solid rgba(255,255,255,0.1)" }}>
                          Bases
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
