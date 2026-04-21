"use client";
import Link from "next/link";
import { useState } from "react";

type Post = {
  id: string;
  plataforma: string;
  contenido: string;
  imagen_url: string | null;
  hashtags: string[];
  scheduled_at: string | null;
  publicado: boolean;
  publicado_at: string | null;
  engagement: Record<string, number> | null;
  created_at: string;
};

const PLATAFORMAS = ["todas", "instagram", "twitter", "linkedin", "facebook", "tiktok"];
const EMOJI: Record<string, string> = {
  instagram: "📸", twitter: "𝕏", linkedin: "💼", facebook: "👤", tiktok: "🎵",
};

export default function RrssClient({ posts }: { posts: Post[] }) {
  const [filtro, setFiltro] = useState("todas");

  const filtered = filtro === "todas" ? posts : posts.filter(p => p.plataforma === filtro);

  return (
    <div>
      <div className="flex flex-wrap gap-1 mb-6">
        {PLATAFORMAS.map(p => (
          <button key={p} onClick={() => setFiltro(p)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors"
            style={{
              background: filtro === p ? "rgba(29,158,117,0.2)" : "rgba(255,255,255,0.04)",
              color: filtro === p ? "var(--green)" : "var(--muted)",
              border: filtro === p ? "1px solid rgba(29,158,117,0.3)" : "1px solid transparent",
            }}>
            {EMOJI[p] ?? ""} {p}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="glass rounded-2xl p-16 text-center" style={{ color: "var(--muted)" }}>
          <div className="text-4xl mb-4">📲</div>
          <p className="mb-4">Sin posts para esta plataforma.</p>
          <Link href="/backoffice/rrss-blog/rrss/nuevo"
            className="glow-btn inline-block px-5 py-2.5 rounded-xl text-sm font-semibold text-black"
            style={{ background: "var(--green)" }}>
            Crear primer post →
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <Link key={p.id} href={`/backoffice/rrss-blog/rrss/${p.id}`}
              className="glass rounded-2xl p-5 hover:-translate-y-0.5 transition-all duration-200 block group">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{EMOJI[p.plataforma] ?? "📱"}</span>
                  <span className="text-sm font-medium capitalize">{p.plataforma}</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: p.publicado ? "rgba(29,158,117,0.15)" : "rgba(255,255,255,0.06)",
                    color: p.publicado ? "var(--green)" : "var(--muted)",
                  }}>
                  {p.publicado ? "✓ Publicado" : p.scheduled_at ? "⏳ Programado" : "Borrador"}
                </span>
              </div>

              {p.imagen_url && (
                <img src={p.imagen_url} alt="" className="w-full rounded-xl mb-3 object-cover" style={{ height: "120px" }} />
              )}

              <p className="text-sm mb-3 line-clamp-3" style={{ color: "var(--muted)" }}>{p.contenido}</p>

              {p.hashtags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {p.hashtags.slice(0, 4).map(h => (
                    <span key={h} className="text-[10px] px-2 py-0.5 rounded-full"
                      style={{ background: "rgba(29,158,117,0.1)", color: "var(--green)" }}>
                      #{h}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between text-xs" style={{ color: "var(--muted)" }}>
                {p.scheduled_at ? (
                  <span>📅 {new Date(p.scheduled_at).toLocaleDateString("es-ES")}</span>
                ) : (
                  <span>{new Date(p.created_at).toLocaleDateString("es-ES")}</span>
                )}
                {p.engagement && Object.keys(p.engagement).length > 0 && (
                  <span>❤️ {p.engagement.likes ?? 0}</span>
                )}
                <span className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--green)" }}>Editar →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
