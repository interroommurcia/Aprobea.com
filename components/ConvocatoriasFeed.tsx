"use client";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

type Convocatoria = {
  id: string;
  titulo: string;
  categoria: string | null;
  num_plazas: number | null;
  fecha_limite: string | null;
  boletin_referencia: string | null;
  url_boletin: string | null;
  organismo_nombre: string | null;
  created_at: string;
};

const FALLBACK: Convocatoria[] = [
  { id: "1", titulo: "Auxiliar Administrativo", categoria: "Administrativo", num_plazas: 24, fecha_limite: null, boletin_referencia: "BOE", url_boletin: "https://www.boe.es", organismo_nombre: "Ayto. Barcelona", created_at: new Date().toISOString() },
  { id: "2", titulo: "Técnico de Hacienda", categoria: "Técnico", num_plazas: 8, fecha_limite: null, boletin_referencia: "BOP Sevilla", url_boletin: "https://www.boe.es", organismo_nombre: "Diputación Sevilla", created_at: new Date().toISOString() },
  { id: "3", titulo: "Enfermero/a", categoria: "Sanidad", num_plazas: 112, fecha_limite: null, boletin_referencia: "DOCM", url_boletin: "https://www.boe.es", organismo_nombre: "Junta C-La Mancha", created_at: new Date().toISOString() },
  { id: "4", titulo: "Policía Local", categoria: "Policía Local", num_plazas: 35, fecha_limite: null, boletin_referencia: "BOA", url_boletin: "https://www.boe.es", organismo_nombre: "Ayto. Zaragoza", created_at: new Date().toISOString() },
  { id: "5", titulo: "Auxiliar Administrativo", categoria: "Administrativo", num_plazas: 180, fecha_limite: null, boletin_referencia: "BOCM", url_boletin: "https://www.boe.es", organismo_nombre: "Comunidad de Madrid", created_at: new Date().toISOString() },
  { id: "6", titulo: "Bombero Conductor", categoria: "Bomberos", num_plazas: 6, fecha_limite: null, boletin_referencia: "BOP Málaga", url_boetin: "https://www.boe.es", organismo_nombre: "Ayto. Málaga", created_at: new Date().toISOString() },
] as Convocatoria[];

function diasRestantes(fecha: string | null): string | null {
  if (!fecha) return null;
  const diff = Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000);
  if (diff < 0) return "Plazo cerrado";
  if (diff === 0) return "Último día";
  return `Plazo: ${diff}d`;
}

export default function ConvocatoriasFeed({ convocatorias }: { convocatorias: Convocatoria[] }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });
  const items = convocatorias.length > 0 ? convocatorias : FALLBACK;
  const esReal = convocatorias.length > 0;

  return (
    <section id="convocatorias" ref={ref} className="py-16 md:py-24 px-6" style={{ background: "var(--bg2)" }}>
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-12"
        >
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="text-xs font-semibold tracking-[0.2em] uppercase" style={{ color: "var(--green)" }}>
                Convocatorias recientes
              </div>
              {esReal && (
                <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                  style={{ background: "rgba(29,158,117,0.15)", color: "var(--green)" }}>
                  ● LIVE
                </span>
              )}
            </div>
            <h2 className="text-4xl font-bold">Lo que acaba de salir</h2>
            <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>
              Actualizado automáticamente desde BOE y boletines regionales
            </p>
          </div>
          <a
            href="/registro"
            className="text-sm px-5 py-2.5 rounded-xl glass transition-colors hover:border-green-500 shrink-0"
            style={{ color: "var(--green)", border: "1px solid rgba(29,158,117,0.3)" }}
          >
            Ver todas con alertas →
          </a>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((c, i) => {
            const plazo = diasRestantes(c.fecha_limite);
            const isNew = i < 2;
            const urgente = plazo && plazo.includes("d") && parseInt(plazo) <= 7;
            return (
              <motion.a
                key={c.id}
                href={c.url_boletin ?? "#"}
                target={c.url_boletin ? "_blank" : undefined}
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 30 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="glass rounded-2xl p-5 group cursor-pointer hover:-translate-y-1 transition-all duration-300 block"
                style={{ borderColor: isNew ? "rgba(29,158,117,0.4)" : urgente ? "rgba(239,100,68,0.35)" : undefined }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>
                      {c.boletin_referencia ?? "BOE"}
                    </div>
                    <div className="font-semibold text-sm">
                      {c.organismo_nombre ?? "Organismo público"}
                    </div>
                  </div>
                  {isNew && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: "rgba(29,158,117,0.15)", color: "var(--green)" }}>
                      NUEVO
                    </span>
                  )}
                  {urgente && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={{ background: "rgba(239,100,68,0.15)", color: "#ef6444" }}>
                      URGENTE
                    </span>
                  )}
                </div>
                <div className="text-base font-medium mb-4">{c.titulo}</div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {c.num_plazas != null && (
                      <span className="text-xs px-2.5 py-1 rounded-lg"
                        style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted)" }}>
                        {c.num_plazas} plazas
                      </span>
                    )}
                    {plazo && (
                      <span className="text-xs" style={{ color: urgente ? "#ef6444" : "var(--muted)" }}>
                        {plazo}
                      </span>
                    )}
                  </div>
                  <span className="text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: "var(--green)" }}>
                    →
                  </span>
                </div>
              </motion.a>
            );
          })}
        </div>

        {/* Ticker de boletines monitorizados */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={inView ? { opacity: 1 } : {}}
          transition={{ delay: 0.8 }}
          className="mt-10 overflow-hidden rounded-xl py-2.5 px-4"
          style={{ background: "rgba(29,158,117,0.06)", border: "1px solid rgba(29,158,117,0.15)" }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold shrink-0" style={{ color: "var(--green)" }}>
              Monitorizando:
            </span>
            <div className="overflow-hidden flex-1">
              <div className="animate-ticker flex gap-8 whitespace-nowrap text-xs" style={{ color: "var(--muted)" }}>
                {["BOE", "BOCM", "BOJA", "DOGC", "DOG (Galicia)", "BOA (Aragón)", "BORM (Murcia)", "DOCV (Valencia)", "BOPB", "BOP Madrid",
                  "BOE", "BOCM", "BOJA", "DOGC", "DOG (Galicia)", "BOA (Aragón)", "BORM (Murcia)", "DOCV (Valencia)", "BOPB", "BOP Madrid"].map((b, i) => (
                  <span key={i}>{b}</span>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
