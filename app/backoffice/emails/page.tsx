import { createClient } from "@/lib/supabase/server";

export default async function EmailsPage() {
  const supabase = await createClient();

  const [
    { data: cola },
    { count: enviados },
    { count: pendientes },
    { count: errores },
  ] = await Promise.all([
    supabase.from("email_queue")
      .select("id, tipo, payload, enviado, scheduled_for, enviado_at, error, user_id")
      .order("scheduled_for", { ascending: false })
      .limit(100),
    supabase.from("email_queue").select("id", { count: "exact", head: true }).eq("enviado", true),
    supabase.from("email_queue").select("id", { count: "exact", head: true }).eq("enviado", false),
    supabase.from("email_queue").select("id", { count: "exact", head: true }).not("error", "is", null),
  ]);

  const tipoLabel: Record<string, string> = {
    bienvenida: "Bienvenida",
    alerta_convocatoria: "Alerta BOE",
    churn_prevention: "Anti-churn",
    renovacion: "Renovación",
    onboarding_d3: "Onboarding D3",
    ticket_confirmacion: "Ticket creado",
    ticket_resuelto: "Ticket resuelto",
  };

  const tipoColor: Record<string, string> = {
    bienvenida: "rgba(29,158,117,0.15)",
    alerta_convocatoria: "rgba(251,191,36,0.15)",
    churn_prevention: "rgba(239,68,68,0.12)",
    renovacion: "rgba(129,140,248,0.15)",
    onboarding_d3: "rgba(29,158,117,0.1)",
    ticket_confirmacion: "rgba(255,255,255,0.06)",
    ticket_resuelto: "rgba(29,158,117,0.1)",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Emails / Cola de envío</h1>
      <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
        Histórico de emails transaccionales y alertas
      </p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Enviados", value: enviados ?? 0, color: "var(--green)" },
          { label: "Pendientes", value: pendientes ?? 0, color: "#fbbf24" },
          { label: "Con error", value: errores ?? 0, color: "#ef6444" },
        ].map(k => (
          <div key={k.label} className="glass rounded-2xl p-5">
            <div className="text-3xl font-bold" style={{ color: k.color }}>{k.value}</div>
            <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        {!cola || cola.length === 0 ? (
          <div className="p-12 text-center" style={{ color: "var(--muted)" }}>
            Cola vacía. Los emails se encolan automáticamente al detectar convocatorias o registros de usuarios.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Tipo", "Programado", "Estado", "Detalle"].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {cola.map((e, i) => (
                  <tr key={e.id}
                    className="hover:bg-white/[0.02] transition-colors"
                    style={{ borderBottom: i < cola.length - 1 ? "1px solid rgba(255,255,255,0.04)" : undefined }}>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: tipoColor[e.tipo] ?? "rgba(255,255,255,0.06)", color: "var(--cream)" }}>
                        {tipoLabel[e.tipo] ?? e.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--muted)" }}>
                      {new Date(e.scheduled_for).toLocaleString("es-ES")}
                    </td>
                    <td className="px-4 py-3">
                      {e.error ? (
                        <span className="text-xs text-red-400">✗ Error</span>
                      ) : e.enviado ? (
                        <span className="text-xs" style={{ color: "var(--green)" }}>✓ Enviado</span>
                      ) : (
                        <span className="text-xs" style={{ color: "#fbbf24" }}>⏳ Pendiente</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs max-w-xs">
                      {e.error ? (
                        <span className="text-red-400 truncate block">{e.error}</span>
                      ) : (
                        <span className="truncate block" style={{ color: "var(--muted)" }}>
                          {e.enviado_at ? `Enviado ${new Date(e.enviado_at).toLocaleString("es-ES")}` : "—"}
                        </span>
                      )}
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
