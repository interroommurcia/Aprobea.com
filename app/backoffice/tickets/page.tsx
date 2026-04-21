import { createClient } from "@/lib/supabase/server";
import TicketsClient from "./TicketsClient";

export default async function TicketsPage() {
  const supabase = await createClient();

  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, categoria, mensaje_original, resumen_ia, estado, prioridad, resolucion, created_at, resuelto_at, user_id")
    .order("created_at", { ascending: false })
    .limit(200);

  // Obtener emails de usuarios
  const userIds = [...new Set((tickets ?? []).map(t => t.user_id).filter(Boolean))];
  let perfiles: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, email, nombre")
      .in("id", userIds);
    (profs ?? []).forEach(p => { perfiles[p.id] = p.nombre ? `${p.nombre} (${p.email})` : p.email; });
  }

  const stats = {
    pendientes: tickets?.filter(t => t.estado === "pendiente").length ?? 0,
    en_revision: tickets?.filter(t => t.estado === "en_revision").length ?? 0,
    resueltos: tickets?.filter(t => t.estado === "resuelto").length ?? 0,
    total: tickets?.length ?? 0,
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Tickets de soporte</h1>
      <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
        Gestión de incidencias, consultas y solicitudes
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Pendientes", value: stats.pendientes, color: "#ef6444", alert: stats.pendientes > 0 },
          { label: "En revisión", value: stats.en_revision, color: "#fbbf24" },
          { label: "Resueltos", value: stats.resueltos, color: "var(--green)" },
          { label: "Total", value: stats.total, color: "var(--muted)" },
        ].map(k => (
          <div key={k.label} className="glass rounded-2xl p-5"
            style={{ borderColor: k.alert ? "rgba(239,100,68,0.3)" : undefined }}>
            <div className="text-3xl font-bold" style={{ color: k.color }}>{k.value}</div>
            <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>{k.label}</div>
          </div>
        ))}
      </div>

      <TicketsClient tickets={(tickets ?? []).map(t => ({ ...t, usuario: perfiles[t.user_id] ?? "—" }))} />
    </div>
  );
}
