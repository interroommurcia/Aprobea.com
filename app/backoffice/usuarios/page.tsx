import { createServiceClient } from "@/lib/supabase/server";

export default async function UsuariosPage() {
  const supabase = await createServiceClient();

  const { data: usuarios } = await supabase
    .from("profiles")
    .select("id, email, nombre, plan, onboarding_completado, created_at, last_active_at")
    .order("created_at", { ascending: false })
    .limit(200);

  const stats = {
    total: usuarios?.length ?? 0,
    free: usuarios?.filter(u => u.plan === "free").length ?? 0,
    pro: usuarios?.filter(u => u.plan === "pro").length ?? 0,
    academia: usuarios?.filter(u => u.plan === "academia").length ?? 0,
  };

  const planColor = (plan: string) => {
    const m: Record<string, string> = { free: "var(--muted)", pro: "var(--green)", academia: "#818cf8" };
    return m[plan] ?? "var(--muted)";
  };
  const planBg = (plan: string) => {
    const m: Record<string, string> = { free: "rgba(255,255,255,0.06)", pro: "rgba(29,158,117,0.15)", academia: "rgba(129,140,248,0.15)" };
    return m[plan] ?? "rgba(255,255,255,0.06)";
  };

  function activo(last: string | null): boolean {
    if (!last) return false;
    return Date.now() - new Date(last).getTime() < 7 * 86400000;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Usuarios</h1>
      <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
        {stats.total} usuarios registrados
      </p>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total", value: stats.total, color: "var(--cream)" },
          { label: "Free", value: stats.free, color: "var(--muted)" },
          { label: "Pro", value: stats.pro, color: "var(--green)" },
          { label: "Academia", value: stats.academia, color: "#818cf8" },
        ].map(k => (
          <div key={k.label} className="glass rounded-2xl p-5">
            <div className="text-3xl font-bold" style={{ color: k.color }}>{k.value}</div>
            <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>Plan {k.label}</div>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="glass rounded-2xl overflow-hidden">
        {!usuarios || usuarios.length === 0 ? (
          <div className="p-12 text-center" style={{ color: "var(--muted)" }}>
            Sin usuarios registrados aún.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Usuario", "Plan", "Onboarding", "Activo", "Registrado"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map((u, i) => (
                  <tr key={u.id}
                    className="hover:bg-white/[0.02] transition-colors"
                    style={{ borderBottom: i < usuarios.length - 1 ? "1px solid rgba(255,255,255,0.04)" : undefined }}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm">{u.nombre ?? "—"}</div>
                      <div className="text-xs mt-0.5 truncate max-w-[200px]" style={{ color: "var(--muted)" }}>{u.email}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full uppercase"
                        style={{ background: planBg(u.plan), color: planColor(u.plan) }}>
                        {u.plan}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs" style={{ color: u.onboarding_completado ? "var(--green)" : "var(--muted)" }}>
                        {u.onboarding_completado ? "✓ Completado" : "Pendiente"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block w-2 h-2 rounded-full mr-2"
                        style={{ background: activo(u.last_active_at) ? "var(--green)" : "rgba(255,255,255,0.2)" }} />
                      <span className="text-xs" style={{ color: "var(--muted)" }}>
                        {u.last_active_at
                          ? new Date(u.last_active_at).toLocaleDateString("es-ES")
                          : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--muted)" }}>
                      {new Date(u.created_at).toLocaleDateString("es-ES")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
