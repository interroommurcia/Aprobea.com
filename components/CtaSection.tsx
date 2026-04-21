"use client";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

export default function CtaSection() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} className="py-16 md:py-32 px-6" style={{ background: "var(--bg2)" }}>
      <div className="max-w-3xl mx-auto text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.7 }}
          className="relative rounded-3xl p-6 sm:p-12 overflow-hidden"
          style={{ background: "var(--bg3)", border: "1px solid rgba(29,158,117,0.2)" }}
        >
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(29,158,117,0.15) 0%, transparent 70%)",
            }}
          />
          <div className="relative z-10">
            <div className="text-5xl mb-6">🏆</div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              La próxima convocatoria<br />no te pillará desprevenido
            </h2>
            <p className="mb-8 leading-relaxed" style={{ color: "var(--muted)" }}>
              Únete a los opositores que ya reciben alertas inmediatas de convocatorias locales y regionales.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <input
                type="email"
                placeholder="tu@email.com"
                className="w-full sm:w-64 px-5 py-3.5 rounded-xl text-sm outline-none"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "var(--cream)",
                }}
              />
              <button
                className="glow-btn w-full sm:w-auto px-7 py-3.5 rounded-xl text-sm font-semibold text-black"
                style={{ background: "var(--green)" }}
              >
                Empezar gratis →
              </button>
            </div>
            <p className="mt-4 text-xs" style={{ color: "var(--muted)" }}>
              Gratis para siempre · Sin tarjeta · Cancela cuando quieras
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
