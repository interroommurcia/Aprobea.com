import { createServiceClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createServiceClient();
  const { data } = await supabase
    .from("blog_posts")
    .select("titulo, meta_title, meta_desc, resumen, imagen_url")
    .eq("slug", slug)
    .eq("publicado", true)
    .single();
  if (!data) return {};
  return {
    title: data.meta_title || data.titulo,
    description: data.meta_desc || data.resumen,
    openGraph: { images: data.imagen_url ? [data.imagen_url] : [] },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createServiceClient();

  const { data: articulo } = await supabase
    .from("blog_posts")
    .select("*")
    .eq("slug", slug)
    .eq("publicado", true)
    .single();

  if (!articulo) notFound();

  // Incrementar vistas (fire & forget)
  supabase.from("blog_posts").update({ vistas: (articulo.vistas ?? 0) + 1 }).eq("id", articulo.id).then(() => {});

  // Artículos relacionados
  const { data: relacionados } = await supabase
    .from("blog_posts")
    .select("id, titulo, slug, resumen, categoria, publicado_at")
    .eq("publicado", true)
    .eq("categoria", articulo.categoria ?? "")
    .neq("id", articulo.id)
    .limit(3);

  return (
    <div className="min-h-screen" style={{ background:"var(--bg)" }}>
      <nav className="sticky top-0 z-50 px-6 py-4 flex items-center justify-between"
        style={{ background:"rgba(11,12,11,0.9)", backdropFilter:"blur(16px)", borderBottom:"1px solid var(--border)" }}>
        <Link href="/" className="text-lg font-bold">
          Apro<span style={{ color:"var(--green)" }}>bea</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/blog" className="text-sm" style={{ color:"var(--muted)" }}>← Blog</Link>
          <Link href="/registro"
            className="text-sm px-4 py-2 rounded-xl font-semibold text-black"
            style={{ background:"var(--green)" }}>
            Empezar gratis
          </Link>
        </div>
      </nav>

      <article className="max-w-3xl mx-auto px-6 py-16">
        {/* Meta */}
        <div className="mb-6">
          {articulo.categoria && (
            <Link href="/blog"
              className="text-xs font-semibold uppercase tracking-wider mb-3 inline-block"
              style={{ color:"var(--green)" }}>
              {articulo.categoria}
            </Link>
          )}
          <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-4">{articulo.titulo}</h1>
          {articulo.resumen && (
            <p className="text-lg leading-relaxed mb-4" style={{ color:"var(--muted)" }}>
              {articulo.resumen}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs" style={{ color:"var(--muted)" }}>
            {articulo.publicado_at && (
              <span>{new Date(articulo.publicado_at).toLocaleDateString("es-ES",{ day:"numeric", month:"long", year:"numeric" })}</span>
            )}
            {articulo.vistas > 0 && <span>· {articulo.vistas} lecturas</span>}
            <span>· {Math.ceil((articulo.contenido ?? "").split(" ").length / 200)} min</span>
          </div>
        </div>

        {/* Imagen destacada */}
        {articulo.imagen_url && (
          <img src={articulo.imagen_url} alt={articulo.titulo}
            className="w-full rounded-2xl mb-10 object-cover"
            style={{ maxHeight:"400px" }} />
        )}

        {/* Contenido */}
        <div className="prose prose-invert max-w-none text-base leading-relaxed whitespace-pre-wrap"
          style={{ color:"var(--cream)" }}>
          {articulo.contenido ?? ""}
        </div>

        {/* Tags */}
        {articulo.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-10 pt-8" style={{ borderTop:"1px solid var(--border)" }}>
            {articulo.tags.map((tag: string) => (
              <span key={tag} className="text-xs px-3 py-1.5 rounded-xl"
                style={{ background:"rgba(29,158,117,0.1)", color:"var(--green)" }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* CTA */}
        <div className="mt-12 rounded-2xl p-8 text-center"
          style={{ background:"rgba(29,158,117,0.06)", border:"1px solid rgba(29,158,117,0.2)" }}>
          <div className="text-2xl mb-3">🎯</div>
          <h3 className="text-xl font-bold mb-2">¿Preparando oposiciones?</h3>
          <p className="text-sm mb-6" style={{ color:"var(--muted)" }}>
            Accede gratis a tests, temarios y alertas de convocatorias en Aprobea.
          </p>
          <Link href="/registro"
            className="inline-block glow-btn px-6 py-3 rounded-xl text-sm font-semibold text-black"
            style={{ background:"var(--green)" }}>
            Crear cuenta gratuita →
          </Link>
        </div>

        {/* Relacionados */}
        {relacionados && relacionados.length > 0 && (
          <div className="mt-12">
            <h2 className="font-semibold mb-4">Artículos relacionados</h2>
            <div className="space-y-3">
              {relacionados.map(r => (
                <Link key={r.id} href={`/blog/${r.slug}`}
                  className="glass rounded-xl px-5 py-4 flex items-center gap-3 hover:bg-white/5 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{r.titulo}</div>
                    {r.resumen && (
                      <div className="text-xs mt-0.5 truncate" style={{ color:"var(--muted)" }}>{r.resumen}</div>
                    )}
                  </div>
                  <span style={{ color:"var(--green)" }}>→</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>

      <footer className="py-8 px-6 text-center text-xs border-t"
        style={{ color:"var(--muted)", borderColor:"var(--border)" }}>
        © 2025 Aprobea · <Link href="/blog" style={{ color:"var(--green)" }}>Blog</Link> · España
      </footer>
    </div>
  );
}
