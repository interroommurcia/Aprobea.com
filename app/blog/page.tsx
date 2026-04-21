import { createServiceClient } from "@/lib/supabase/server";
import Link from "next/link";

export const revalidate = 300;

export default async function BlogPage() {
  const supabase = await createServiceClient();

  const { data: articulos } = await supabase
    .from("blog_posts")
    .select("id, titulo, slug, resumen, imagen_url, categoria, tags, vistas, publicado_at, created_at")
    .eq("publicado", true)
    .order("publicado_at", { ascending: false })
    .limit(30);

  const categorias = [...new Set((articulos ?? []).map(a => a.categoria).filter(Boolean))];

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* Nav simple */}
      <nav className="sticky top-0 z-50 px-6 py-4 flex items-center justify-between"
        style={{ background:"rgba(11,12,11,0.9)", backdropFilter:"blur(16px)", borderBottom:"1px solid var(--border)" }}>
        <Link href="/" className="text-lg font-bold">
          Apro<span style={{ color:"var(--green)" }}>bea</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/" className="text-sm" style={{ color:"var(--muted)" }}>← Inicio</Link>
          <Link href="/registro"
            className="text-sm px-4 py-2 rounded-xl font-semibold text-black"
            style={{ background:"var(--green)" }}>
            Empezar gratis
          </Link>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-16">
        {/* Header */}
        <div className="mb-12">
          <div className="text-xs font-semibold tracking-[0.2em] uppercase mb-3" style={{ color:"var(--green)" }}>
            Blog
          </div>
          <h1 className="text-4xl font-bold mb-3">Recursos para oposiciones</h1>
          <p style={{ color:"var(--muted)" }}>
            Guías, consejos y novedades sobre oposiciones locales y regionales en España.
          </p>
        </div>

        {/* Filtro por categoría */}
        {categorias.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-10">
            <span className="text-sm px-3 py-1.5 rounded-xl font-medium"
              style={{ background:"rgba(29,158,117,0.2)", color:"var(--green)" }}>
              Todos
            </span>
            {categorias.map(c => (
              <span key={c} className="text-sm px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer hover:bg-white/5"
                style={{ background:"rgba(255,255,255,0.04)", color:"var(--muted)" }}>
                {c}
              </span>
            ))}
          </div>
        )}

        {/* Grid artículos */}
        {!articulos || articulos.length === 0 ? (
          <div className="text-center py-20" style={{ color:"var(--muted)" }}>
            <div className="text-4xl mb-4">✍️</div>
            <p>Próximamente — estamos preparando el contenido.</p>
            <Link href="/" className="inline-block mt-6 text-sm" style={{ color:"var(--green)" }}>
              ← Volver al inicio
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articulos.map((a, i) => (
              <Link key={a.id} href={`/blog/${a.slug}`}
                className="glass rounded-2xl overflow-hidden hover:-translate-y-1 transition-all duration-200 group block">
                {a.imagen_url ? (
                  <img src={a.imagen_url} alt={a.titulo}
                    className="w-full object-cover"
                    style={{ height:"180px" }} />
                ) : (
                  <div className="w-full flex items-center justify-center text-4xl"
                    style={{ height:"120px", background:"rgba(29,158,117,0.06)" }}>
                    📝
                  </div>
                )}
                <div className="p-5">
                  {a.categoria && (
                    <span className="text-[11px] font-semibold uppercase tracking-wider mb-2 block"
                      style={{ color:"var(--green)" }}>
                      {a.categoria}
                    </span>
                  )}
                  <h2 className="font-semibold text-base mb-2 group-hover:text-green-400 transition-colors line-clamp-2">
                    {a.titulo}
                  </h2>
                  {a.resumen && (
                    <p className="text-sm line-clamp-2 mb-3" style={{ color:"var(--muted)" }}>
                      {a.resumen}
                    </p>
                  )}
                  <div className="flex items-center justify-between text-xs" style={{ color:"var(--muted)" }}>
                    <span>
                      {a.publicado_at
                        ? new Date(a.publicado_at).toLocaleDateString("es-ES", { day:"numeric", month:"short", year:"numeric" })
                        : ""}
                    </span>
                    {a.vistas > 0 && <span>{a.vistas} lecturas</span>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <footer className="py-8 px-6 text-center text-xs border-t"
        style={{ color:"var(--muted)", borderColor:"var(--border)" }}>
        © 2025 Aprobea · Oposiciones Locales y Regionales · España
      </footer>
    </div>
  );
}
