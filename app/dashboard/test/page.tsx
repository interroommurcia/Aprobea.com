import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function TestPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [
    { data: temas },
    { count: totalPreguntas },
    { data: pendientesRepaso },
  ] = await Promise.all([
    supabase.from("temas").select("id, titulo, categoria").eq("activo", true).order("orden").limit(50),
    supabase.from("preguntas").select("id", { count: "exact", head: true }).eq("activa", true),
    supabase.from("repeticion_espaciada")
      .select("id")
      .eq("user_id", user.id)
      .lte("proxima_revision", new Date().toISOString().split("T")[0]),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Hacer test</h1>
      <p className="text-sm mb-8" style={{ color:"var(--muted)" }}>
        {totalPreguntas ?? 0} preguntas disponibles
        {(pendientesRepaso?.length ?? 0) > 0 && ` · ${pendientesRepaso!.length} pendientes de repaso`}
      </p>

      {/* Modos de test */}
      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {[
          {
            icon: "🎯", titulo: "Test rápido",
            desc: "10 preguntas aleatorias de todo el temario",
            badge: "10 preguntas",
            href: "/dashboard/test/iniciar?modo=rapido",
            highlight: false,
          },
          {
            icon: "📋", titulo: "Simulacro",
            desc: "Examen completo con tiempo y penalización, como en la oposición real",
            badge: "Pro",
            href: "/dashboard/test/iniciar?modo=simulacro",
            highlight: true,
          },
          {
            icon: "🔁", titulo: "Repaso espaciado",
            desc: `Repasa las ${pendientesRepaso?.length ?? 0} preguntas que toca revisar hoy`,
            badge: `${pendientesRepaso?.length ?? 0} hoy`,
            href: "/dashboard/test/iniciar?modo=repaso",
            highlight: false,
          },
        ].map(m => (
          <Link key={m.titulo} href={m.href}
            className="glass rounded-2xl p-6 hover:-translate-y-0.5 transition-all duration-200 group block"
            style={{ borderColor: m.highlight ? "rgba(29,158,117,0.4)" : undefined }}>
            <div className="text-3xl mb-3">{m.icon}</div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-semibold">{m.titulo}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                style={{
                  background: m.highlight ? "rgba(29,158,117,0.2)" : "rgba(255,255,255,0.06)",
                  color:      m.highlight ? "var(--green)" : "var(--muted)",
                }}>
                {m.badge}
              </span>
            </div>
            <p className="text-sm" style={{ color:"var(--muted)" }}>{m.desc}</p>
            <div className="mt-4 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ color:"var(--green)" }}>
              Empezar →
            </div>
          </Link>
        ))}
      </div>

      {/* Por tema */}
      {temas && temas.length > 0 && (
        <div className="glass rounded-2xl p-6">
          <h2 className="font-semibold mb-4">Practicar por tema</h2>
          <div className="space-y-2">
            {temas.map(t => (
              <Link key={t.id}
                href={`/dashboard/test/iniciar?tema_id=${t.id}`}
                className="flex items-center justify-between rounded-xl px-4 py-3 hover:bg-white/5 transition-colors">
                <div>
                  <div className="text-sm font-medium">{t.titulo}</div>
                  <div className="text-xs mt-0.5" style={{ color:"var(--muted)" }}>
                    {t.categoria ?? "Sin categoría"}
                  </div>
                </div>
                <span className="text-sm opacity-50 hover:opacity-100 transition-opacity"
                  style={{ color:"var(--green)" }}>→</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {(!temas || temas.length === 0) && (
        <div className="glass rounded-2xl p-12 text-center" style={{ color:"var(--muted)" }}>
          <div className="text-4xl mb-4">📚</div>
          <p>Aún no hay temas disponibles.</p>
          <p className="text-xs mt-2">El administrador está subiendo el contenido. Vuelve pronto.</p>
        </div>
      )}
    </div>
  );
}
