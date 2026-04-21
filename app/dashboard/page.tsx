import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    { data: profile },
    { count: totalExamenes },
    { data: ultimosExamenes },
    { data: convocatoriasActivas },
    { data: proximasRevisiones },
    { count: temasDisponibles },
  ] = await Promise.all([
    supabase.from("profiles").select("nombre, plan, nivel_base, onboarding_completado, convocatoria_objetivo_id").eq("id", user.id).single(),
    supabase.from("examenes").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    supabase.from("examenes")
      .select("id, tipo, puntuacion_final, nota_sobre_10, completado_at, created_at")
      .eq("user_id", user.id)
      .eq("estado", "completado")
      .order("completado_at", { ascending: false })
      .limit(5),
    supabase.from("convocatorias")
      .select("id, titulo, categoria, num_plazas, fecha_limite, boletin_referencia, url_boletin")
      .eq("estado", "activa")
      .order("fecha_limite", { ascending: true })
      .limit(4),
    supabase.from("repeticion_espaciada")
      .select("id, proxima_revision, pregunta_id")
      .eq("user_id", user.id)
      .lte("proxima_revision", new Date().toISOString().split("T")[0])
      .limit(20),
    supabase.from("temas").select("id", { count: "exact", head: true }).eq("activo", true),
  ]);

  const nombre = profile?.nombre ?? user.email?.split("@")[0] ?? "Opositor";
  const plan = profile?.plan ?? "free";
  const notaMedia = ultimosExamenes?.length
    ? (ultimosExamenes.reduce((s, e) => s + (e.nota_sobre_10 ?? 0), 0) / ultimosExamenes.length).toFixed(1)
    : null;

  function diasRestantes(fecha: string | null): number | null {
    if (!fecha) return null;
    return Math.ceil((new Date(fecha).getTime() - Date.now()) / 86400000);
  }

  return (
    <div>
      {/* Saludo */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">
          Hola, {nombre.split(" ")[0]} 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          {proximasRevisiones?.length
            ? `Tienes ${proximasRevisiones.length} preguntas pendientes de repasar hoy.`
            : "Al día con los repasos. ¡Buen trabajo!"}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          {
            icon: "📝", label: "Tests realizados",
            value: totalExamenes ?? 0, color: "var(--cream)",
            href: "/dashboard/test",
          },
          {
            icon: "⭐", label: "Nota media",
            value: notaMedia ? `${notaMedia}/10` : "—", color: notaMedia && parseFloat(notaMedia) >= 5 ? "var(--green)" : "var(--cream)",
            href: "/dashboard/progreso",
          },
          {
            icon: "🔁", label: "Repasos hoy",
            value: proximasRevisiones?.length ?? 0,
            color: (proximasRevisiones?.length ?? 0) > 0 ? "#fbbf24" : "var(--green)",
            href: "/dashboard/test",
          },
          {
            icon: "📚", label: "Temas disponibles",
            value: temasDisponibles ?? 0, color: "var(--cream)",
            href: "/dashboard/temas",
          },
        ].map(k => (
          <Link key={k.label} href={k.href}
            className="glass rounded-2xl p-5 hover:-translate-y-0.5 transition-transform">
            <div className="text-2xl mb-2">{k.icon}</div>
            <div className="text-2xl font-bold" style={{ color: k.color }}>{k.value}</div>
            <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>{k.label}</div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Convocatorias activas */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Convocatorias activas</h2>
            <Link href="/dashboard/convocatorias" className="text-xs" style={{ color: "var(--green)" }}>
              Ver todas →
            </Link>
          </div>
          {!convocatoriasActivas || convocatoriasActivas.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              Sin convocatorias activas. Activa alertas para recibir notificaciones.
            </p>
          ) : (
            <div className="space-y-3">
              {convocatoriasActivas.map(c => {
                const dias = diasRestantes(c.fecha_limite);
                const urgente = dias !== null && dias <= 14;
                return (
                  <a key={c.id} href={c.url_boletin ?? "#"} target="_blank" rel="noopener noreferrer"
                    className="flex items-start gap-3 rounded-xl px-3 py-3 hover:bg-white/5 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{c.titulo}</div>
                      <div className="text-xs mt-0.5 flex gap-2 flex-wrap" style={{ color: "var(--muted)" }}>
                        <span>{c.categoria ?? "—"}</span>
                        {c.num_plazas && <span>· {c.num_plazas} plazas</span>}
                        <span className="font-mono text-[10px] px-1.5 rounded"
                          style={{ background: "rgba(255,255,255,0.06)" }}>
                          {c.boletin_referencia}
                        </span>
                      </div>
                    </div>
                    {dias !== null && (
                      <span className="text-xs shrink-0 font-semibold"
                        style={{ color: urgente ? "#ef6444" : "var(--muted)" }}>
                        {dias <= 0 ? "Cerrada" : `${dias}d`}
                      </span>
                    )}
                  </a>
                );
              })}
            </div>
          )}
        </div>

        {/* Últimos tests */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Últimos tests</h2>
            <Link href="/dashboard/progreso" className="text-xs" style={{ color: "var(--green)" }}>
              Ver historial →
            </Link>
          </div>
          {!ultimosExamenes || ultimosExamenes.length === 0 ? (
            <div className="text-sm py-4 text-center" style={{ color: "var(--muted)" }}>
              <p className="mb-3">Aún no has hecho ningún test.</p>
              <Link href="/dashboard/test"
                className="glow-btn inline-block px-5 py-2.5 rounded-xl text-sm font-semibold text-black"
                style={{ background: "var(--green)" }}>
                Empezar primer test →
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {ultimosExamenes.map(e => (
                <div key={e.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5"
                  style={{ background: "rgba(255,255,255,0.02)" }}>
                  <div className="flex-1">
                    <div className="text-sm capitalize">{e.tipo}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                      {e.completado_at ? new Date(e.completado_at).toLocaleDateString("es-ES") : "—"}
                    </div>
                  </div>
                  {e.nota_sobre_10 !== null && (
                    <div className="text-lg font-bold"
                      style={{ color: e.nota_sobre_10 >= 5 ? "var(--green)" : "#ef6444" }}>
                      {e.nota_sobre_10.toFixed(1)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="glass rounded-2xl p-6">
        <h2 className="font-semibold mb-4">¿Qué quieres hacer ahora?</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { href: "/dashboard/test", emoji: "🎯", titulo: "Hacer un test", desc: "Practica con preguntas de tu temario" },
            { href: "/dashboard/temas", emoji: "📖", titulo: "Estudiar temas", desc: "Repasa el temario completo" },
            { href: "/dashboard/convocatorias", emoji: "📋", titulo: "Ver convocatorias", desc: "Últimas oposiciones del BOE" },
            { href: "/dashboard/alertas", emoji: "🔔", titulo: "Configurar alertas", desc: "Recibe avisos de nuevas convocatorias" },
          ].map(a => (
            <Link key={a.href} href={a.href}
              className="rounded-xl p-4 hover:bg-white/5 transition-colors group"
              style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-2xl mb-2">{a.emoji}</div>
              <div className="text-sm font-semibold mb-1 group-hover:text-green-400 transition-colors">{a.titulo}</div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>{a.desc}</div>
            </Link>
          ))}
        </div>
      </div>

      {/* Banner upgrade (solo free) */}
      {plan === "free" && (
        <div className="mt-6 rounded-2xl p-6 flex items-center gap-4"
          style={{ background: "linear-gradient(135deg, rgba(29,158,117,0.12), rgba(29,158,117,0.04))", border: "1px solid rgba(29,158,117,0.2)" }}>
          <div className="text-3xl">✨</div>
          <div className="flex-1">
            <div className="font-semibold mb-0.5">Mejora a Pro</div>
            <div className="text-sm" style={{ color: "var(--muted)" }}>
              Accede a todos los temas, simulacros completos y seguimiento avanzado de tu progreso.
            </div>
          </div>
          <Link href="/dashboard/upgrade"
            className="glow-btn shrink-0 px-5 py-2.5 rounded-xl text-sm font-semibold text-black"
            style={{ background: "var(--green)" }}>
            Ver planes →
          </Link>
        </div>
      )}
    </div>
  );
}
