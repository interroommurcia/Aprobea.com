"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/backoffice", label: "📊 Resumen", exact: true },
  { href: "/backoffice/boe", label: "📡 Monitor BOE" },
  { href: "/backoffice/convocatorias", label: "📋 Convocatorias" },
  { href: "/backoffice/temas", label: "📚 Temas / PDFs" },
  { divider: "Usuarios" },
  { href: "/backoffice/usuarios", label: "👥 Usuarios" },
  { href: "/backoffice/tickets", label: "🎫 Tickets soporte" },
  { href: "/backoffice/emails", label: "📧 Emails / Cola" },
  { divider: "Contenido" },
  { href: "/backoffice/rrss-blog", label: "✍️ RRSS / Blog", exact: true },
  { href: "/backoffice/rrss-blog/articulos", label: "📝 Artículos", sub: true },
  { href: "/backoffice/rrss-blog/rrss", label: "📲 RRSS Posts", sub: true },
  { divider: "Sistema" },
  { href: "/backoffice/configuracion", label: "⚙️ Configuración" },
];

export default function BackofficeSidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function isActive(item: any) {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href);
  }

  const SidebarContent = () => (
    <>
      <div className="px-4 pb-5 mb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <a href="/" className="flex items-baseline gap-1">
          <span className="text-xl font-bold tracking-tight">Apro</span>
          <span className="text-xl font-bold tracking-tight" style={{ color: "var(--green)" }}>bea</span>
        </a>
        <span className="block text-[10px] mt-0.5 uppercase tracking-widest" style={{ color: "var(--muted)" }}>
          Admin · Backoffice
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto pb-4">
        {NAV.map((item, i) => {
          if ("divider" in item) {
            return (
              <div key={i} className="px-4 pt-5 pb-1.5 text-[10px] uppercase tracking-widest font-semibold"
                style={{ color: "rgba(255,255,255,0.25)" }}>
                {item.divider}
              </div>
            );
          }
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 text-sm transition-colors rounded-lg mx-2 px-3 py-2"
              style={{
                paddingLeft: item.sub ? "2rem" : undefined,
                color: active ? "var(--green)" : "rgba(255,255,255,0.55)",
                background: active ? "rgba(29,158,117,0.1)" : "transparent",
                fontWeight: active ? 600 : 400,
                borderLeft: active ? "2px solid var(--green)" : "2px solid transparent",
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 pt-4 space-y-2" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="text-[11px] truncate" style={{ color: "var(--muted)" }}>{userEmail}</div>
        <a href="/api/auth/signout"
          className="block text-sm px-3 py-2 rounded-lg transition-colors hover:bg-white/5"
          style={{ color: "var(--muted)" }}>
          ↩ Cerrar sesión
        </a>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="w-56 shrink-0 flex-col py-5 hidden md:flex glass"
        style={{ borderRight: "1px solid rgba(255,255,255,0.06)", minHeight: "100vh", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <SidebarContent />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3"
        style={{ background: "var(--bg)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <a href="/" className="flex items-baseline gap-1 font-bold text-lg">
          Apro<span style={{ color: "var(--green)" }}>bea</span>
        </a>
        <button onClick={() => setOpen(v => !v)} className="text-xl p-1" style={{ color: "var(--muted)" }}>
          {open ? "✕" : "☰"}
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setOpen(false)}
          style={{ background: "rgba(0,0,0,0.6)" }}>
          <aside
            className="absolute left-0 top-0 bottom-0 w-64 flex flex-col py-5"
            style={{ background: "var(--bg2)", borderRight: "1px solid rgba(255,255,255,0.06)" }}
            onClick={e => e.stopPropagation()}
          >
            <SidebarContent />
          </aside>
        </div>
      )}
    </>
  );
}
