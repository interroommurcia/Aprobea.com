"use client";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

const STEPS = [
  {
    n: "01",
    title: "Elige tus categorías",
    desc: "Administración local, sanidad, educación, policía, bomberos… Selecciona las plazas que te interesan y tu comunidad autónoma.",
    icon: "⚙️",
  },
  {
    n: "02",
    title: "Monitorizamos el BOE y boletines",
    desc: "Escaneamos diariamente el BOE, 17 BOCA autonómicos y más de 500 boletines provinciales y municipales.",
    icon: "🔍",
  },
  {
    n: "03",
    title: "Alerta inmediata",
    desc: "En menos de 2 horas desde la publicación oficial, recibes la convocatoria con resumen, plazas, fecha límite y enlace oficial.",
    icon: "🔔",
  },
  {
    n: "04",
    title: "Gestiona tu preparación",
    desc: "Dashboard personal con tus convocatorias guardadas, fechas de examen en calendario y recursos de temario.",
    icon: "📋",
  },
];

export default function HowItWorks() {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="como-funciona" ref={ref} className="py-32 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-20"
        >
          <div className="text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: "var(--green)" }}>
            Cómo funciona
          </div>
          <h2 className="text-4xl md:text-5xl font-bold">
            De la publicación oficial<br />a tu bandeja de entrada
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-4 gap-6">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.n}
              initial={{ opacity: 0, y: 40 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.12 }}
              className="glass rounded-2xl p-6 relative group hover:-translate-y-1 transition-transform duration-300"
            >
              <div
                className="text-xs font-bold mb-6 opacity-40 tracking-widest"
                style={{ color: "var(--green)" }}
              >
                {step.n}
              </div>
              <div className="text-3xl mb-4">{step.icon}</div>
              <h3 className="font-semibold text-base mb-2">{step.title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--muted)" }}>{step.desc}</p>
              {/* connector */}
              {i < STEPS.length - 1 && (
                <div
                  className="hidden md:block absolute -right-3 top-1/2 -translate-y-1/2 text-lg opacity-20 z-10"
                  style={{ color: "var(--green)" }}
                >
                  →
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
