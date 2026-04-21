"use client";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const CARDS = [
  {
    org: "Ayto. Barcelona",
    tipo: "Administrativo",
    plazas: 24,
    fecha: "Plazo: 15 mayo",
    boletin: "BOPB",
    new: true,
  },
  {
    org: "Diputación Sevilla",
    tipo: "Técnico de Hacienda",
    plazas: 8,
    fecha: "Plazo: 20 mayo",
    boletin: "BOP Sevilla",
    new: true,
  },
  {
    org: "Junta Castilla-La Mancha",
    tipo: "Enfermero/a",
    plazas: 112,
    fecha: "Plazo: 2 junio",
    boletin: "DOCM",
    new: false,
  },
  {
    org: "Ayto. Zaragoza",
    tipo: "Policía Local",
    plazas: 35,
    fecha: "Plazo: 10 junio",
    boletin: "BOA",
    new: false,
  },
  {
    org: "Comunidad de Madrid",
    tipo: "Auxiliar Administrativo",
    plazas: 180,
    fecha: "Plazo: 25 mayo",
    boletin: "BOCM",
    new: false,
  },
  {
    org: "Ayto. Málaga",
    tipo: "Bombero Conductor",
    plazas: 6,
    fecha: "Plazo: 30 mayo",
    boletin: "BOP Málaga",
    new: false,
  },
];

export default function ConvocatoriasFeed() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

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
            <div className="text-xs font-semibold tracking-[0.2em] uppercase mb-3" style={{ color: "var(--green)" }}>
              Convocatorias recientes
            </div>
            <h2 className="text-4xl font-bold">Lo que acaba de salir</h2>
          </div>
          <button
            className="text-sm px-5 py-2.5 rounded-xl glass transition-colors hover:border-green-500"
            style={{ color: "var(--green)", border: "1px solid rgba(29,158,117,0.3)" }}
          >
            Ver todas →
          </button>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {CARDS.map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="glass rounded-2xl p-5 group cursor-pointer hover:-translate-y-1 transition-all duration-300"
              style={{ borderColor: c.new ? "rgba(29,158,117,0.4)" : undefined }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-xs font-medium mb-1" style={{ color: "var(--muted)" }}>{c.boletin}</div>
                  <div className="font-semibold text-sm">{c.org}</div>
                </div>
                {c.new && (
                  <span
                    className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(29,158,117,0.15)", color: "var(--green)" }}
                  >
                    NUEVO
                  </span>
                )}
              </div>
              <div className="text-base font-medium mb-4">{c.tipo}</div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs px-2.5 py-1 rounded-lg"
                    style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted)" }}
                  >
                    {c.plazas} plazas
                  </span>
                  <span className="text-xs" style={{ color: "var(--muted)" }}>{c.fecha}</span>
                </div>
                <span
                  className="text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ color: "var(--green)" }}
                >
                  →
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
