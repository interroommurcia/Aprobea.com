"use client";
import { useEffect, useState } from "react";
import Image from "next/image";

const LINKS = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#convocatorias", label: "Convocatorias" },
  { href: "#precios", label: "Precios" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <nav
      className="fixed top-0 inset-x-0 z-50 transition-all duration-500"
      style={{
        background: scrolled || open ? "rgba(11,12,11,0.95)" : "transparent",
        backdropFilter: scrolled || open ? "blur(20px)" : "none",
        borderBottom: scrolled || open ? "1px solid rgba(255,255,255,0.07)" : "none",
      }}
    >
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Image src="/logo.svg" alt="Aprobea" width={120} height={36} priority />

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-8 text-sm" style={{ color: "var(--muted)" }}>
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="hover:text-white transition-colors">{l.label}</a>
          ))}
        </div>

        {/* Desktop buttons */}
        <div className="hidden md:flex items-center gap-3">
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

        {/* Mobile: CTA + hamburger */}
        <div className="flex md:hidden items-center gap-3">
          <button
            className="glow-btn text-sm px-4 py-2 rounded-lg font-medium text-black"
            style={{ background: "var(--green)" }}
          >
            Empezar gratis
          </button>
          <button
            onClick={() => setOpen((o) => !o)}
            className="p-2 rounded-lg transition-colors"
            style={{ color: "var(--muted)" }}
            aria-label="Menú"
          >
            {open ? (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden px-6 pb-6 flex flex-col gap-4" style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="text-sm py-2 hover:text-white transition-colors"
              style={{ color: "var(--muted)" }}
            >
              {l.label}
            </a>
          ))}
          <button className="text-sm py-2 text-left transition-colors" style={{ color: "var(--muted)" }}>
            Entrar
          </button>
        </div>
      )}
    </nav>
  );
}
