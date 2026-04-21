"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <nav
      className="fixed top-0 inset-x-0 z-50 transition-all duration-500"
      style={{
        background: scrolled ? "rgba(11,12,11,0.85)" : "transparent",
        backdropFilter: scrolled ? "blur(20px)" : "none",
        borderBottom: scrolled ? "1px solid rgba(255,255,255,0.07)" : "none",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Image src="/logo.svg" alt="Aprobea" width={140} height={40} priority />
        <div className="hidden md:flex items-center gap-8 text-sm" style={{ color: "var(--muted)" }}>
          <a href="#como-funciona" className="hover:text-white transition-colors">Cómo funciona</a>
          <a href="#convocatorias" className="hover:text-white transition-colors">Convocatorias</a>
          <a href="#precios" className="hover:text-white transition-colors">Precios</a>
        </div>
        <div className="flex items-center gap-3">
          <button className="text-sm px-4 py-2 rounded-lg transition-colors" style={{ color: "var(--muted)" }}>
            Entrar
          </button>
          <button
            className="glow-btn text-sm px-5 py-2 rounded-lg font-medium text-black"
            style={{ background: "var(--green)" }}
          >
            Empezar gratis
          </button>
        </div>
      </div>
    </nav>
  );
}
