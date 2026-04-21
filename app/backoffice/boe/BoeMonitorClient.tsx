"use client";
import { useState } from "react";

type Resultado = {
  procesadas: number;
  nuevas_convocatorias: number;
  error?: string;
};

export default function BoeMonitorClient() {
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);

  async function lanzar() {
    setLoading(true);
    setResultado(null);
    try {
      const res = await fetch("/api/backoffice/boe/trigger", { method: "POST" });
      const data = await res.json();
      setResultado(data);
    } catch {
      setResultado({ procesadas: 0, nuevas_convocatorias: 0, error: "Error de red" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-semibold">Monitor de boletines</h2>
          <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
            BOE · BOCM · BOJA · DOGC · DOG · BOA · BORM · DOCV · BOPB · BOP-MAD
          </p>
        </div>
        <button
          onClick={lanzar}
          disabled={loading}
          className="glow-btn px-5 py-2.5 rounded-xl text-sm font-semibold text-black transition-opacity"
          style={{ background: "var(--green)", opacity: loading ? 0.6 : 1 }}
        >
          {loading ? "Procesando…" : "▶ Lanzar ahora"}
        </button>
      </div>

      {loading && (
        <div className="rounded-xl p-4 text-sm" style={{ background: "rgba(255,255,255,0.04)", color: "var(--muted)" }}>
          Consultando boletines y clasificando con IA… puede tardar 20–40 s
        </div>
      )}

      {resultado && !resultado.error && (
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl p-4" style={{ background: "rgba(29,158,117,0.1)", border: "1px solid rgba(29,158,117,0.2)" }}>
            <div className="text-2xl font-bold" style={{ color: "var(--green)" }}>{resultado.procesadas}</div>
            <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>Publicaciones procesadas</div>
          </div>
          <div className="rounded-xl p-4" style={{ background: "rgba(29,158,117,0.1)", border: "1px solid rgba(29,158,117,0.2)" }}>
            <div className="text-2xl font-bold" style={{ color: "var(--green)" }}>{resultado.nuevas_convocatorias}</div>
            <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>Nuevas convocatorias</div>
          </div>
        </div>
      )}

      {resultado?.error && (
        <div className="rounded-xl p-4 text-sm text-red-400" style={{ background: "rgba(239,68,68,0.1)" }}>
          {resultado.error}
        </div>
      )}
    </div>
  );
}
