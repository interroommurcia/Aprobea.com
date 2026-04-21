"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const TICKER = [
  "Ayuntamiento de Madrid", "Junta de Andalucía", "Diputación de Valencia",
  "Comunidad de Madrid", "Generalitat de Catalunya", "Ayuntamiento de Sevilla",
  "Diputación de Barcelona", "Junta de Castilla y León", "Región de Murcia",
  "Ayuntamiento de Zaragoza", "Gobierno de Canarias", "Diputación de Málaga",
];

export default function HeroSection() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.7], [1, 0]);

  return (
    <section ref={ref} className="relative min-h-screen flex flex-col overflow-hidden">
      {/* bg radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse 70% 50% at 50% -10%, rgba(29,158,117,0.22) 0%, transparent 70%)",
        }}
      />
      {/* grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(var(--green) 1px, transparent 1px), linear-gradient(90deg, var(--green) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <motion.div
        style={{ y, opacity }}
        className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-6 pt-28 pb-16"
      >
        {/* badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-medium mb-8"
          style={{
            background: "rgba(29,158,117,0.12)",
            border: "1px solid rgba(29,158,117,0.35)",
            color: "var(--green)",
          }}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ background: "var(--green)" }} />
            <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: "var(--green)" }} />
          </span>
          +2.400 convocatorias activas ahora mismo
        </motion.div>

        {/* headline */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold leading-[1.08] tracking-tight max-w-4xl"
        >
          Las oposiciones{" "}
          <span
            className="animate-gradient bg-clip-text text-transparent"
            style={{
              backgroundImage: "linear-gradient(90deg, #1D9E75, #5ee8bc, #1D9E75)",
            }}
          >
            locales y regionales
          </span>
          <br />que nadie te cuenta
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="mt-6 text-lg md:text-xl max-w-2xl leading-relaxed"
          style={{ color: "var(--muted)" }}
        >
          Alertas inmediatas del BOE y boletines autonómicos. Convocatorias de ayuntamientos,
          diputaciones y organismos locales en un solo lugar.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mt-10 flex flex-col sm:flex-row items-center gap-4"
        >
          <div className="relative">
            <input
              type="email"
              placeholder="tu@email.com"
              className="w-72 px-5 py-3.5 rounded-xl text-sm outline-none"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "var(--cream)",
              }}
            />
          </div>
          <button
            className="glow-btn px-7 py-3.5 rounded-xl text-sm font-semibold text-black whitespace-nowrap"
            style={{ background: "var(--green)" }}
          >
            Recibir alertas gratis →
          </button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-4 text-xs"
          style={{ color: "var(--muted)" }}
        >
          Sin tarjeta. Sin spam. Solo convocatorias reales.
        </motion.p>

        {/* stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="mt-16 flex flex-wrap justify-center gap-10"
        >
          {[
            { n: "8.500+", label: "Convocatorias indexadas" },
            { n: "517", label: "Organismos monitorizados" },
            { n: "< 2h", label: "Tiempo de alerta" },
          ].map(({ n, label }) => (
            <div key={label} className="text-center">
              <div className="text-3xl font-bold" style={{ color: "var(--green)" }}>{n}</div>
              <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>{label}</div>
            </div>
          ))}
        </motion.div>
      </motion.div>

      {/* ticker */}
      <div
        className="relative z-10 w-full overflow-hidden py-4"
        style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)" }}
      >
        <div className="animate-ticker flex gap-12 whitespace-nowrap w-max">
          {[...TICKER, ...TICKER].map((t, i) => (
            <span key={i} className="text-xs font-medium tracking-widest uppercase" style={{ color: "var(--muted)" }}>
              <span style={{ color: "var(--green)", marginRight: "6px" }}>✓</span>{t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
