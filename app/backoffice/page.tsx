import { createClient } from "@/lib/supabase/server";

export default async function BackofficePage() {
  const supabase = await createClient();

  const [
    { count: totalTemas },
    { count: totalUsuarios },
    { count: totalExamenes },
    { count: ticketsPendientes },
  ] = await Promise.all([
    supabase.from('temas').select('id', { count: 'exact', head: true }),
    supabase.from('profiles').select('id', { count: 'exact', head: true }),
    supabase.from('examenes').select('id', { count: 'exact', head: true }),
    supabase.from('tickets').select('id', { count: 'exact', head: true }).eq('estado', 'pendiente'),
  ]);

  const stats = [
    { label: "Temas subidos", value: totalTemas ?? 0, icon: "📚", href: "/backoffice/temas" },
    { label: "Usuarios", value: totalUsuarios ?? 0, icon: "👥", href: "/backoffice/usuarios" },
    { label: "Exámenes realizados", value: totalExamenes ?? 0, icon: "📝", href: "#" },
    { label: "Tickets pendientes", value: ticketsPendientes ?? 0, icon: "🎫", href: "/backoffice/tickets", alert: (ticketsPendientes ?? 0) > 0 },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Panel de control</h1>
      <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
        Bienvenido al backoffice de Aprobea
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
        {stats.map(s => (
          <a key={s.label} href={s.href}
            className="glass rounded-2xl p-5 hover:-translate-y-0.5 transition-transform"
            style={{ borderColor: s.alert ? "rgba(239,68,68,0.4)" : undefined }}
          >
            <div className="text-2xl mb-3">{s.icon}</div>
            <div className="text-3xl font-bold" style={{ color: s.alert ? "#f87171" : "var(--green)" }}>
              {s.value}
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>{s.label}</div>
          </a>
        ))}
      </div>

      <div className="glass rounded-2xl p-6">
        <h2 className="font-semibold mb-4">Acciones rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <a href="/backoffice/temas" className="glow-btn px-5 py-2.5 rounded-xl text-sm font-medium text-black"
            style={{ background: "var(--green)" }}>
            📥 Subir PDF
          </a>
          <a href="/backoffice/tickets" className="px-5 py-2.5 rounded-xl text-sm font-medium glass transition-colors"
            style={{ color: "var(--cream)" }}>
            🎫 Ver tickets
          </a>
          <a href="/backoffice/convocatorias" className="px-5 py-2.5 rounded-xl text-sm font-medium glass transition-colors"
            style={{ color: "var(--cream)" }}>
            📋 Convocatorias
          </a>
        </div>
      </div>
    </div>
  );
}
