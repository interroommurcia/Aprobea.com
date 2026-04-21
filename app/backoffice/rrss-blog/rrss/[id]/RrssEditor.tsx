"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const PLATAFORMAS = ["instagram", "twitter", "linkedin", "facebook", "tiktok"];
const EMOJI: Record<string, string> = {
  instagram: "📸", twitter: "𝕏", linkedin: "💼", facebook: "👤", tiktok: "🎵",
};

type Post = {
  id: string;
  plataforma: string;
  contenido: string;
  imagen_url: string | null;
  hashtags: string[];
  scheduled_at: string | null;
  publicado: boolean;
  enlace_post: string | null;
};

export default function RrssEditor({ post }: { post: Post | null }) {
  const router = useRouter();
  const [plataforma, setPlataforma] = useState(post?.plataforma ?? "instagram");
  const [contenido, setContenido] = useState(post?.contenido ?? "");
  const [imagenUrl, setImagenUrl] = useState(post?.imagen_url ?? "");
  const [hashtags, setHashtags] = useState((post?.hashtags ?? []).join(", "));
  const [scheduledAt, setScheduledAt] = useState(
    post?.scheduled_at ? new Date(post.scheduled_at).toISOString().slice(0, 16) : ""
  );
  const [enlacePost, setEnlacePost] = useState(post?.enlace_post ?? "");
  const [publicado, setPublicado] = useState(post?.publicado ?? false);
  const [generando, setGenerando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const limites: Record<string, number> = {
    twitter: 280, instagram: 2200, linkedin: 3000, facebook: 63206, tiktok: 2200,
  };
  const limite = limites[plataforma] ?? 2200;
  const superaLimite = contenido.length > limite;

  async function generarConIA() {
    setGenerando(true);
    try {
      const res = await fetch("/api/backoffice/rrss/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plataforma }),
      });
      const data = await res.json();
      if (data.contenido) setContenido(data.contenido);
      if (data.hashtags) setHashtags(data.hashtags.join(", "));
    } catch {}
    setGenerando(false);
  }

  async function guardar() {
    setGuardando(true);
    const body = {
      plataforma,
      contenido,
      imagen_url: imagenUrl || null,
      hashtags: hashtags.split(",").map(h => h.trim().replace(/^#/, "")).filter(Boolean),
      scheduled_at: scheduledAt || null,
      enlace_post: enlacePost || null,
      publicado,
    };
    const url = post ? `/api/backoffice/rrss/${post.id}` : "/api/backoffice/rrss";
    const method = post ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok && !post) {
      const data = await res.json();
      router.replace(`/backoffice/rrss-blog/rrss/${data.id}`);
    }
    setGuardando(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{post ? "Editar post RRSS" : "Nuevo post RRSS"}</h1>
        <div className="flex gap-2">
          <button onClick={guardar} disabled={guardando || !contenido.trim()}
            className="glow-btn px-4 py-2.5 rounded-xl text-sm font-semibold text-black"
            style={{ background: "var(--green)", opacity: guardando ? 0.6 : 1 }}>
            {guardando ? "Guardando…" : post ? "Guardar cambios" : "Crear post"}
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="space-y-4">
          {/* Plataforma */}
          <div className="glass rounded-2xl p-5">
            <label className="text-xs mb-3 block font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Plataforma</label>
            <div className="flex flex-wrap gap-2">
              {PLATAFORMAS.map(p => (
                <button key={p} onClick={() => setPlataforma(p)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all capitalize"
                  style={{
                    background: plataforma === p ? "rgba(29,158,117,0.2)" : "rgba(255,255,255,0.05)",
                    color: plataforma === p ? "var(--green)" : "var(--muted)",
                    border: plataforma === p ? "1px solid rgba(29,158,117,0.4)" : "1px solid transparent",
                  }}>
                  {EMOJI[p]} {p}
                </button>
              ))}
            </div>
          </div>

          {/* Contenido */}
          <div className="glass rounded-2xl p-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Texto del post</label>
              <button onClick={generarConIA} disabled={generando}
                className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-colors"
                style={{ background: "rgba(29,158,117,0.15)", color: "var(--green)", opacity: generando ? 0.6 : 1 }}>
                {generando ? "⏳ Generando…" : "🤖 Generar con IA"}
              </button>
            </div>
            <textarea
              value={contenido} onChange={e => setContenido(e.target.value)}
              rows={8}
              placeholder={`Escribe el texto para ${plataforma}...`}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-y"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${superaLimite ? "rgba(239,68,68,0.4)" : "rgba(255,255,255,0.08)"}`,
                color: "var(--cream)",
              }}
            />
            <div className="flex justify-between mt-1.5 text-xs">
              <span style={{ color: superaLimite ? "#ef6444" : "var(--muted)" }}>
                {contenido.length}/{limite} caracteres
                {superaLimite && " — Supera el límite"}
              </span>
            </div>
          </div>

          {/* Hashtags */}
          <div className="glass rounded-2xl p-5">
            <label className="text-xs mb-2 block font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>
              Hashtags (sin #, separados por coma)
            </label>
            <input type="text" value={hashtags} onChange={e => setHashtags(e.target.value)}
              placeholder="oposiciones, policia local, estudio"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--cream)" }} />
          </div>

          {/* Imagen + programación */}
          <div className="glass rounded-2xl p-5 space-y-4">
            <div>
              <label className="text-xs mb-1.5 block font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>URL imagen</label>
              <input type="text" value={imagenUrl} onChange={e => setImagenUrl(e.target.value)} placeholder="https://..."
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--cream)" }} />
            </div>
            <div>
              <label className="text-xs mb-1.5 block font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Programar publicación</label>
              <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--cream)" }} />
            </div>
            {post?.publicado && (
              <div>
                <label className="text-xs mb-1.5 block font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Enlace al post publicado</label>
                <input type="text" value={enlacePost} onChange={e => setEnlacePost(e.target.value)} placeholder="https://..."
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--cream)" }} />
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        <div>
          <div className="glass rounded-2xl p-5 sticky top-6">
            <div className="text-xs font-semibold uppercase tracking-wider mb-4" style={{ color: "var(--muted)" }}>
              Preview · {EMOJI[plataforma]} {plataforma}
            </div>
            {/* Mock phone frame */}
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)", background: "#000" }}>
              <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-7 h-7 rounded-full" style={{ background: "var(--green)" }} />
                <div>
                  <div className="text-xs font-bold">aprobea.com</div>
                  <div className="text-[10px]" style={{ color: "var(--muted)" }}>Hace un momento</div>
                </div>
              </div>
              {imagenUrl && (
                <img src={imagenUrl} alt="" className="w-full object-cover" style={{ maxHeight: "200px" }} />
              )}
              <div className="p-4">
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--cream)" }}>
                  {contenido || <span style={{ color: "var(--muted)" }}>Escribe el texto del post...</span>}
                </p>
                {hashtags && (
                  <p className="text-sm mt-2" style={{ color: "#818cf8" }}>
                    {hashtags.split(",").map(h => h.trim()).filter(Boolean).map(h => `#${h.replace(/^#/, "")}`).join(" ")}
                  </p>
                )}
              </div>
            </div>
            {scheduledAt && (
              <div className="mt-3 text-xs text-center" style={{ color: "var(--muted)" }}>
                📅 Programado: {new Date(scheduledAt).toLocaleString("es-ES")}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
