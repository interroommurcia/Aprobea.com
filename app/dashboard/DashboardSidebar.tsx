"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const NAV = [
  { href: "/dashboard", label: "🏠 Inicio", exact: true },
  { href: "/dashboard/convocatorias", label: "📋 Mis convocatorias" },
  { href: "/dashboard/test", label: "📝 Hacer test" },
  { href: "/dashboard/temas", label: "📚 Temario" },
  { href: "/dashboard/progreso", label: "📊 Mi progreso" },
  { href: "/dashboard/alertas", label: "🔔 Alertas BOE" },
  { href: "/dashboard/configuracion", label: "⚙️ Configuración" },
];

const PLAN_LABEL: Record<string, string> = { free: "Free", pro: "Pro", academia: "Academia" };
const PLAN_COLOR: Record<string, string> = { free: "var(--muted)", pro: "var(--green)", academia: "#818cf8" };

export default function DashboardSidebar({ nombre, plan }: { nombre: string; plan: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const NavContent = () => (
    <>
      <div className="px-4 pb-5 mb-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/" className="flex items-baseline gap-1 mb-3">
          <span className="text-lg font-bold">Apro</span>
          <span className="text-lg font-bold" style={{ color: "var(--green)" }}>bea</span>
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: "rgba(29,158,117,0.2)", color: "var(--green)" }}>
            {(nombre[0] ?? "?").toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{nombre}</div>
            <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded"
              style={{ background: "rgba(29,158,117,0.1)", color: PLAN_COLOR[plan] ?? "var(--muted)" }}>
              {PLAN_LABEL[plan] ?? plan}
            </span>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto">
        {NAV.map(item => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 text-sm mx-2 px-3 py-2.5 rounded-lg transition-colors"
              style={{
                color: active ? "var(--green)" : "rgba(255,255,255,0.55)",
                background: active ? "rgba(29,158,117,0.1)" : "transparent",
                fontWeight: active ? 600 : 400,
                borderLeft: active ? "2px solid var(--green)" : "2px solid transparent",
              }}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 pt-4 space-y-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        {plan === "free" && (
          <Link href="/dashboard/upgrade"
            className="block text-center text-xs font-semibold px-3 py-2.5 rounded-xl mb-3 transition-colors"
            style={{ background: "rgba(29,158,117,0.15)", color: "var(--green)", border: "1px solid rgba(29,158,117,0.25)" }}>
            ✨ Mejorar a Pro
          </Link>
        )}
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
      {/* Desktop */}
      <aside className="w-56 shrink-0 flex-col py-5 hidden md:flex"
        style={{ borderRight: "1px solid rgba(255,255,255,0.06)", minHeight: "100vh", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <NavContent />
      </aside>

      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3"
        style={{ background: "var(--bg)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/" className="font-bold text-lg">
          Apro<span style={{ color: "var(--green)" }}>bea</span>
        </Link>
        <button onClick={() => setOpen(v => !v)} className="text-xl p-1" style={{ color: "var(--muted)" }}>
          {open ? "✕" : "☰"}
        </button>
      </div>

      {open && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setOpen(false)}
          style={{ background: "rgba(0,0,0,0.6)" }}>
          <aside className="absolute left-0 top-0 bottom-0 w-64 flex flex-col py-5"
            style={{ background: "var(--bg2)", borderRight: "1px solid rgba(255,255,255,0.06)" }}
            onClick={e => e.stopPropagation()}>
            <NavContent />
          </aside>
        </div>
      )}
    </>
  );
}
