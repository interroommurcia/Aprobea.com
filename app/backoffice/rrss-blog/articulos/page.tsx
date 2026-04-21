import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function ArticulosPage() {
  const supabase = await createClient();

  const { data: articulos } = await supabase
    .from("blog_posts")
    .select("id, titulo, slug, categoria, publicado, vistas, created_at, publicado_at")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Artículos del Blog</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            {articulos?.length ?? 0} artículos · {articulos?.filter(a => a.publicado).length ?? 0} publicados
          </p>
        </div>
        <Link href="/backoffice/rrss-blog/articulos/nuevo"
          className="glow-btn px-4 py-2.5 rounded-xl text-sm font-semibold text-black"
          style={{ background: "var(--green)" }}>
          ✍️ Nuevo artículo
        </Link>
      </div>

      <div className="glass rounded-2xl overflow-hidden">
        {!articulos || articulos.length === 0 ? (
          <div className="p-16 text-center" style={{ color: "var(--muted)" }}>
            <div className="text-4xl mb-4">✍️</div>
            <p className="mb-4">Aún no hay artículos. Escribe el primero y empieza a captar tráfico orgánico.</p>
            <Link href="/backoffice/rrss-blog/articulos/nuevo"
              className="glow-btn inline-block px-5 py-2.5 rounded-xl text-sm font-semibold text-black"
              style={{ background: "var(--green)" }}>
              Crear primer artículo →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  {["Título", "Categoría", "Vistas", "Estado", "Fecha", ""].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--muted)" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {articulos.map((a, i) => (
                  <tr key={a.id}
                    className="hover:bg-white/[0.02] transition-colors"
                    style={{ borderBottom: i < articulos.length - 1 ? "1px solid rgba(255,255,255,0.04)" : undefined }}>
                    <td className="px-4 py-3" style={{ maxWidth: "280px" }}>
                      <div className="font-medium truncate">{a.titulo}</div>
                      <div className="text-xs mt-0.5 truncate" style={{ color: "var(--muted)" }}>/{a.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-1 rounded-lg"
                        style={{ background: "rgba(255,255,255,0.06)", color: "var(--muted)" }}>
                        {a.categoria ?? "Sin categoría"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm" style={{ color: "var(--muted)" }}>
                      {a.vistas ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                        style={{
                          background: a.publicado ? "rgba(29,158,117,0.15)" : "rgba(255,255,255,0.06)",
                          color: a.publicado ? "var(--green)" : "var(--muted)",
                        }}>
                        {a.publicado ? "PUBLICADO" : "BORRADOR"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs" style={{ color: "var(--muted)" }}>
                      {new Date(a.created_at).toLocaleDateString("es-ES")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link href={`/backoffice/rrss-blog/articulos/${a.id}`}
                          className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-white/10"
                          style={{ color: "var(--green)", border: "1px solid rgba(29,158,117,0.2)" }}>
                          Editar
                        </Link>
                        {a.publicado && (
                          <Link href={`/blog/${a.slug}`} target="_blank"
                            className="text-xs px-3 py-1.5 rounded-lg transition-colors hover:bg-white/10"
                            style={{ color: "var(--muted)", border: "1px solid rgba(255,255,255,0.08)" }}>
                            Ver →
                          </Link>
                        )}
                      </div>
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
