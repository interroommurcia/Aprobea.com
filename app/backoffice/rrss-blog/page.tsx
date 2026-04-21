import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export default async function RrssHubPage() {
  const supabase = await createClient();

  const [
    { count: totalArticulos },
    { count: artPublicados },
    { count: totalRrss },
    { count: rrssPendientes },
    { data: ultimosArticulos },
    { data: ultimasRrss },
  ] = await Promise.all([
    supabase.from("blog_posts").select("id", { count: "exact", head: true }),
    supabase.from("blog_posts").select("id", { count: "exact", head: true }).eq("publicado", true),
    supabase.from("rrss_posts").select("id", { count: "exact", head: true }),
    supabase.from("rrss_posts").select("id", { count: "exact", head: true }).eq("publicado", false),
    supabase.from("blog_posts").select("id, titulo, publicado, categoria, created_at").order("created_at", { ascending: false }).limit(5),
    supabase.from("rrss_posts").select("id, plataforma, contenido, publicado, scheduled_at, created_at").order("created_at", { ascending: false }).limit(5),
  ]);

  const plataformaEmoji: Record<string, string> = {
    instagram: "📸",
    twitter: "𝕏",
    linkedin: "💼",
    facebook: "👤",
    tiktok: "🎵",
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">RRSS / Blog</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            Gestión de contenido editorial y redes sociales
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/backoffice/rrss-blog/articulos/nuevo"
            className="glow-btn px-4 py-2.5 rounded-xl text-sm font-semibold text-black"
            style={{ background: "var(--green)" }}>
            ✍️ Nuevo artículo
          </Link>
          <Link href="/backoffice/rrss-blog/rrss/nuevo"
            className="px-4 py-2.5 rounded-xl text-sm font-medium glass transition-colors"
            style={{ color: "var(--cream)" }}>
            📲 Nuevo post RRSS
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Artículos totales", value: totalArticulos ?? 0, sub: `${artPublicados ?? 0} publicados`, color: "var(--cream)" },
          { label: "Artículos publicados", value: artPublicados ?? 0, color: "var(--green)" },
          { label: "Posts RRSS", value: totalRrss ?? 0, color: "var(--cream)" },
          { label: "RRSS pendientes", value: rrssPendientes ?? 0, color: rrssPendientes ? "#fbbf24" : "var(--muted)" },
        ].map(k => (
          <div key={k.label} className="glass rounded-2xl p-5">
            <div className="text-3xl font-bold" style={{ color: k.color }}>{k.value}</div>
            <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>{k.label}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Últimos artículos */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Últimos artículos</h2>
            <Link href="/backoffice/rrss-blog/articulos"
              className="text-xs" style={{ color: "var(--green)" }}>
              Ver todos →
            </Link>
          </div>
          {!ultimosArticulos || ultimosArticulos.length === 0 ? (
            <div className="text-sm py-6 text-center" style={{ color: "var(--muted)" }}>
              Sin artículos. <Link href="/backoffice/rrss-blog/articulos/nuevo" style={{ color: "var(--green)" }}>Crea el primero →</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {ultimosArticulos.map(a => (
                <Link key={a.id} href={`/backoffice/rrss-blog/articulos/${a.id}`}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{a.titulo}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
                      {a.categoria ?? "Sin categoría"} · {new Date(a.created_at).toLocaleDateString("es-ES")}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{
                      background: a.publicado ? "rgba(29,158,117,0.15)" : "rgba(255,255,255,0.06)",
                      color: a.publicado ? "var(--green)" : "var(--muted)",
                    }}>
                    {a.publicado ? "PUBLICADO" : "BORRADOR"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Últimos posts RRSS */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Últimos posts RRSS</h2>
            <Link href="/backoffice/rrss-blog/rrss" className="text-xs" style={{ color: "var(--green)" }}>
              Ver todos →
            </Link>
          </div>
          {!ultimasRrss || ultimasRrss.length === 0 ? (
            <div className="text-sm py-6 text-center" style={{ color: "var(--muted)" }}>
              Sin posts. <Link href="/backoffice/rrss-blog/rrss/nuevo" style={{ color: "var(--green)" }}>Crea el primero →</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {ultimasRrss.map(p => (
                <Link key={p.id} href={`/backoffice/rrss-blog/rrss/${p.id}`}
                  className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-white/5 transition-colors">
                  <span className="text-xl shrink-0 mt-0.5">
                    {plataformaEmoji[p.plataforma] ?? "📱"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm truncate">{p.contenido}</div>
                    <div className="text-xs mt-0.5 flex gap-2" style={{ color: "var(--muted)" }}>
                      <span className="capitalize">{p.plataforma}</span>
                      {p.scheduled_at && <span>· {new Date(p.scheduled_at).toLocaleDateString("es-ES")}</span>}
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={{
                      background: p.publicado ? "rgba(29,158,117,0.15)" : "rgba(255,255,255,0.06)",
                      color: p.publicado ? "var(--green)" : "var(--muted)",
                    }}>
                    {p.publicado ? "✓" : "⏳"}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="mt-6 glass rounded-2xl p-6">
        <h2 className="font-semibold mb-4">Ideas de contenido automático</h2>
        <div className="grid md:grid-cols-3 gap-3">
          {[
            { emoji: "📡", titulo: "Post sobre convocatoria", desc: "Genera un post para RRSS sobre la última convocatoria detectada en el BOE", href: "/backoffice/rrss-blog/rrss/nuevo?tipo=convocatoria" },
            { emoji: "📚", titulo: "Artículo de temario", desc: "Crea un artículo de blog explicando un tema de oposición para SEO", href: "/backoffice/rrss-blog/articulos/nuevo?tipo=temario" },
            { emoji: "🎯", titulo: "Consejo de estudio", desc: "Post motivacional con consejos para preparar oposiciones", href: "/backoffice/rrss-blog/rrss/nuevo?tipo=consejo" },
          ].map(a => (
            <Link key={a.titulo} href={a.href}
              className="rounded-xl p-4 hover:bg-white/5 transition-colors group"
              style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
              <div className="text-2xl mb-2">{a.emoji}</div>
              <div className="text-sm font-semibold mb-1 group-hover:text-green-400 transition-colors">{a.titulo}</div>
              <div className="text-xs" style={{ color: "var(--muted)" }}>{a.desc}</div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
