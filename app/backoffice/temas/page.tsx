import { createClient } from "@/lib/supabase/server";
import SubirPDF from "./SubirPDF";

export default async function TemasPage() {
  const supabase = await createClient();

  const { data: temas } = await supabase
    .from('temas')
    .select('id, titulo, categoria, created_at, activo')
    .order('created_at', { ascending: false });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Temas</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            {temas?.length ?? 0} temas · Sube PDFs para generar preguntas y flashcards automáticamente
          </p>
        </div>
      </div>

      {/* Subir PDF */}
      <SubirPDF />

      {/* Lista de temas */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold mb-4 uppercase tracking-widest" style={{ color: "var(--muted)" }}>
          Temas subidos
        </h2>
        {!temas || temas.length === 0 ? (
          <div className="glass rounded-2xl p-12 text-center" style={{ color: "var(--muted)" }}>
            Aún no hay temas. Sube tu primer PDF arriba.
          </div>
        ) : (
          <div className="space-y-3">
            {temas.map(tema => (
              <div key={tema.id} className="glass rounded-xl px-5 py-4 flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{tema.titulo}</div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                    {tema.categoria ?? 'Sin categoría'} · {new Date(tema.created_at).toLocaleDateString('es-ES')}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs px-2.5 py-1 rounded-full"
                    style={{
                      background: tema.activo ? "rgba(29,158,117,0.15)" : "rgba(255,255,255,0.06)",
                      color: tema.activo ? "var(--green)" : "var(--muted)",
                    }}
                  >
                    {tema.activo ? "Activo" : "Inactivo"}
                  </span>
                  <a
                    href={`/backoffice/temas/${tema.id}`}
                    className="text-xs px-3 py-1.5 rounded-lg transition-colors"
                    style={{ background: "rgba(255,255,255,0.06)", color: "var(--cream)" }}
                  >
                    Ver →
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
