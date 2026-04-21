"use client";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const PLANS = [
  {
    name: "Gratuito",
    price: "0€",
    period: "/mes",
    desc: "Para empezar a explorar",
    features: [
      "Alertas de convocatorias (1 categoría)",
      "BOE nacional",
      "Resumen básico",
      "Email semanal",
    ],
    cta: "Empezar gratis",
    highlight: false,
  },
  {
    name: "Pro",
    price: "9€",
    period: "/mes",
    desc: "Para opositores en serio",
    features: [
      "Alertas ilimitadas",
      "BOE + 17 boletines autonómicos",
      "500+ boletines provinciales",
      "Email inmediato (< 2h)",
      "Dashboard personal",
      "Calendario de exámenes",
    ],
    cta: "Empezar Pro",
    highlight: true,
  },
  {
    name: "Academia",
    price: "39€",
    period: "/mes",
    desc: "Para academias y gestorías",
    features: [
      "Todo lo de Pro",
      "Hasta 50 alumnos",
      "Panel de gestión grupal",
      "API de datos",
      "Soporte prioritario",
    ],
    cta: "Contactar",
    highlight: false,
  },
];

export default function PricingSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="precios" ref={ref} className="py-32 px-6">
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <div className="text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: "var(--green)" }}>
            Precios
          </div>
          <h2 className="text-4xl md:text-5xl font-bold">Simple y sin sorpresas</h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 items-center">
          {PLANS.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="rounded-2xl p-7 relative"
              style={{
                background: p.highlight ? "var(--green)" : "rgba(255,255,255,0.04)",
                border: p.highlight ? "none" : "1px solid var(--border)",
                transform: p.highlight ? "scale(1.04)" : "scale(1)",
                boxShadow: p.highlight ? "0 0 60px rgba(29,158,117,0.3)" : "none",
              }}
            >
              {p.highlight && (
                <div
                  className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold px-3 py-1 rounded-full text-black"
                  style={{ background: "var(--cream)" }}
                >
                  MÁS POPULAR
                </div>
              )}
              <div
                className="text-sm font-semibold mb-1"
                style={{ color: p.highlight ? "rgba(0,0,0,0.6)" : "var(--muted)" }}
              >
                {p.name}
              </div>
              <div
                className="flex items-baseline gap-1 mb-1"
                style={{ color: p.highlight ? "#000" : "var(--cream)" }}
              >
                <span className="text-4xl font-bold">{p.price}</span>
                <span className="text-sm" style={{ color: p.highlight ? "rgba(0,0,0,0.5)" : "var(--muted)" }}>{p.period}</span>
              </div>
              <div className="text-sm mb-6" style={{ color: p.highlight ? "rgba(0,0,0,0.6)" : "var(--muted)" }}>
                {p.desc}
              </div>
              <ul className="space-y-2.5 mb-8">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm" style={{ color: p.highlight ? "rgba(0,0,0,0.8)" : "var(--cream)" }}>
                    <span className="mt-0.5 shrink-0" style={{ color: p.highlight ? "#000" : "var(--green)" }}>✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className="glow-btn w-full py-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: p.highlight ? "#000" : "rgba(29,158,117,0.15)",
                  color: p.highlight ? "#fff" : "var(--green)",
                  border: p.highlight ? "none" : "1px solid rgba(29,158,117,0.3)",
                }}
              >
                {p.cta}
              </button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
