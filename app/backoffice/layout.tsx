import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg)" }}>
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col py-6 px-4 glass border-r"
        style={{ borderColor: "var(--border)" }}>
        <a href="/" className="mb-8 px-2">
          <span className="text-lg font-bold">Apro<span style={{ color: "var(--green)" }}>bea</span></span>
          <span className="block text-xs mt-0.5" style={{ color: "var(--muted)" }}>Backoffice</span>
        </a>
        <nav className="space-y-1 flex-1">
          {[
            { href: "/backoffice", label: "📊 Resumen" },
            { href: "/backoffice/temas", label: "📚 Temas" },
            { href: "/backoffice/convocatorias", label: "📋 Convocatorias" },
            { href: "/backoffice/usuarios", label: "👥 Usuarios" },
            { href: "/backoffice/tickets", label: "🎫 Tickets" },
            { href: "/backoffice/emails", label: "📧 Emails" },
          ].map(item => (
            <a key={item.href} href={item.href}
              className="block px-3 py-2 rounded-lg text-sm transition-colors hover:bg-white/5"
              style={{ color: "var(--muted)" }}>
              {item.label}
            </a>
          ))}
        </nav>
        <a href="/api/auth/signout" className="px-3 py-2 text-sm rounded-lg hover:bg-white/5 transition-colors"
          style={{ color: "var(--muted)" }}>
          ↩ Cerrar sesión
        </a>
      </aside>
      {/* Main */}
      <main className="flex-1 p-8 overflow-auto">{children}</main>
    </div>
  );
}
