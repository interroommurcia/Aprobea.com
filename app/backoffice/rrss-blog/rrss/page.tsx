import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import RrssClient from "./RrssClient";

export default async function RrssPage() {
  const supabase = await createClient();

  const { data: posts } = await supabase
    .from("rrss_posts")
    .select("id, plataforma, contenido, imagen_url, hashtags, scheduled_at, publicado, publicado_at, engagement, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const byPlataforma = (posts ?? []).reduce<Record<string, number>>((acc, p) => {
    acc[p.plataforma] = (acc[p.plataforma] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Posts de Redes Sociales</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            {posts?.length ?? 0} posts · {posts?.filter(p => p.publicado).length ?? 0} publicados
          </p>
        </div>
        <Link href="/backoffice/rrss-blog/rrss/nuevo"
          className="glow-btn px-4 py-2.5 rounded-xl text-sm font-semibold text-black"
          style={{ background: "var(--green)" }}>
          📲 Nuevo post
        </Link>
      </div>

      {/* Por plataforma */}
      <div className="flex flex-wrap gap-3 mb-6">
        {Object.entries(byPlataforma).map(([plat, count]) => (
          <div key={plat} className="glass rounded-xl px-4 py-2.5 flex items-center gap-2">
            <span className="capitalize text-sm font-medium">{plat}</span>
            <span className="text-xs px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: "rgba(29,158,117,0.15)", color: "var(--green)" }}>
              {count}
            </span>
          </div>
        ))}
        {Object.keys(byPlataforma).length === 0 && (
          <div className="text-sm" style={{ color: "var(--muted)" }}>Sin posts aún</div>
        )}
      </div>

      <RrssClient posts={posts ?? []} />
    </div>
  );
}
