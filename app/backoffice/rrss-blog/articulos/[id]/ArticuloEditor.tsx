"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIAS = ["Oposiciones", "Estudio", "BOE", "Consejos", "Noticias", "Temario", "Convocatorias"];

type Articulo = {
  id: string;
  titulo: string;
  slug: string;
  contenido: string | null;
  resumen: string | null;
  imagen_url: string | null;
  categoria: string | null;
  tags: string[];
  publicado: boolean;
  meta_title: string | null;
  meta_desc: string | null;
};

function toSlug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export default function ArticuloEditor({ articulo }: { articulo: Articulo | null }) {
  const router = useRouter();
  const [titulo, setTitulo] = useState(articulo?.titulo ?? "");
  const [slug, setSlug] = useState(articulo?.slug ?? "");
  const [resumen, setResumen] = useState(articulo?.resumen ?? "");
  const [contenido, setContenido] = useState(articulo?.contenido ?? "");
  const [categoria, setCategoria] = useState(articulo?.categoria ?? "");
  const [imagenUrl, setImagenUrl] = useState(articulo?.imagen_url ?? "");
  const [tags, setTags] = useState((articulo?.tags ?? []).join(", "));
  const [metaTitle, setMetaTitle] = useState(articulo?.meta_title ?? "");
  const [metaDesc, setMetaDesc] = useState(articulo?.meta_desc ?? "");
  const [publicado, setPublicado] = useState(articulo?.publicado ?? false);
  const [generando, setGenerando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [tab, setTab] = useState<"editor" | "seo" | "preview">("editor");

  function onTituloChange(v: string) {
    setTitulo(v);
    if (!articulo) setSlug(toSlug(v));
    if (!metaTitle) setMetaTitle(v);
  }

  async function generarConIA() {
    if (!titulo && !categoria) return;
    setGenerando(true);
    try {
      const res = await fetch("/api/backoffice/blog/generar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ titulo, categoria, resumen }),
      });
      const data = await res.json();
      if (data.contenido) setContenido(data.contenido);
      if (data.resumen && !resumen) setResumen(data.resumen);
      if (data.meta_desc && !metaDesc) setMetaDesc(data.meta_desc);
    } catch {}
    setGenerando(false);
  }

  async function guardar(pub?: boolean) {
    setGuardando(true);
    const body = {
      titulo, slug, contenido, resumen, categoria,
      imagen_url: imagenUrl,
      tags: tags.split(",").map(t => t.trim()).filter(Boolean),
      meta_title: metaTitle, meta_desc: metaDesc,
      publicado: pub !== undefined ? pub : publicado,
    };
    const url = articulo ? `/api/backoffice/blog/${articulo.id}` : "/api/backoffice/blog";
    const method = articulo ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      if (pub !== undefined) setPublicado(pub);
      if (!articulo) {
        const data = await res.json();
        router.replace(`/backoffice/rrss-blog/articulos/${data.id}`);
      }
    }
    setGuardando(false);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{articulo ? "Editar artículo" : "Nuevo artículo"}</h1>
          {articulo && (
            <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>ID: {articulo.id}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={() => guardar()}
            disabled={guardando || !titulo}
            className="px-4 py-2.5 rounded-xl text-sm font-medium glass transition-colors"
            style={{ color: "var(--cream)", opacity: guardando ? 0.6 : 1 }}>
            {guardando ? "Guardando…" : "Guardar borrador"}
          </button>
          <button onClick={() => guardar(!publicado)}
            disabled={guardando || !titulo}
            className="glow-btn px-4 py-2.5 rounded-xl text-sm font-semibold text-black"
            style={{ background: "var(--green)", opacity: guardando ? 0.6 : 1 }}>
            {publicado ? "⬇ Despublicar" : "🚀 Publicar"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit" style={{ background: "rgba(255,255,255,0.04)" }}>
        {(["editor", "seo", "preview"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors"
            style={{
              background: tab === t ? "rgba(29,158,117,0.2)" : "transparent",
              color: tab === t ? "var(--green)" : "var(--muted)",
            }}>
            {t === "editor" ? "✏️ Editor" : t === "seo" ? "🔍 SEO" : "👁 Preview"}
          </button>
        ))}
      </div>

      {tab === "editor" && (
        <div className="space-y-4">
          {/* Título + Slug */}
          <div className="glass rounded-2xl p-6 space-y-4">
            <div>
              <label className="text-xs mb-1.5 block font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Título *</label>
              <input type="text" value={titulo} onChange={e => onTituloChange(e.target.value)} required
                placeholder="Ej: Cómo preparar las oposiciones de Policía Local en 6 meses"
                className="w-full px-4 py-3 rounded-xl text-base outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--cream)" }} />
            </div>
            <div>
              <label className="text-xs mb-1.5 block font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Slug (URL)</label>
              <input type="text" value={slug} onChange={e => setSlug(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none font-mono"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--muted)" }} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs mb-1.5 block font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Categoría</label>
                <select value={categoria} onChange={e => setCategoria(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--cream)" }}>
                  <option value="">Sin categoría</option>
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs mb-1.5 block font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Imagen destacada (URL)</label>
                <input type="text" value={imagenUrl} onChange={e => setImagenUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--cream)" }} />
              </div>
            </div>
            <div>
              <label className="text-xs mb-1.5 block font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Tags (separados por coma)</label>
              <input type="text" value={tags} onChange={e => setTags(e.target.value)}
                placeholder="oposiciones, policía local, estudio"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--cream)" }} />
            </div>
          </div>

          {/* Resumen */}
          <div className="glass rounded-2xl p-6">
            <label className="text-xs mb-1.5 block font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Resumen / Extracto</label>
            <textarea value={resumen} onChange={e => setResumen(e.target.value)} rows={2}
              placeholder="Breve descripción del artículo para la home y buscadores..."
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--cream)" }} />
          </div>

          {/* Contenido */}
          <div className="glass rounded-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Contenido (Markdown)</label>
              <button onClick={generarConIA} disabled={generando || !titulo}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{ background: "rgba(29,158,117,0.15)", color: "var(--green)", opacity: generando || !titulo ? 0.5 : 1 }}>
                {generando ? "⏳ Generando…" : "🤖 Generar con IA"}
              </button>
            </div>
            <textarea
              value={contenido} onChange={e => setContenido(e.target.value)}
              rows={24}
              placeholder="# Título del artículo&#10;&#10;Escribe aquí el contenido en Markdown..."
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-y font-mono"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", color: "var(--cream)", minHeight: "320px" }}
            />
            <div className="flex justify-between mt-2 text-xs" style={{ color: "var(--muted)" }}>
              <span>{contenido.length} caracteres</span>
              <span>~{Math.ceil(contenido.split(" ").length / 200)} min lectura</span>
            </div>
          </div>
        </div>
      )}

      {tab === "seo" && (
        <div className="glass rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold mb-2">SEO & Meta</h2>
          <div>
            <label className="text-xs mb-1.5 block font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Meta title</label>
            <input type="text" value={metaTitle} onChange={e => setMetaTitle(e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--cream)" }} />
            <div className="text-xs mt-1" style={{ color: metaTitle.length > 60 ? "#ef6444" : "var(--muted)" }}>
              {metaTitle.length}/60 caracteres
            </div>
          </div>
          <div>
            <label className="text-xs mb-1.5 block font-semibold uppercase tracking-wider" style={{ color: "var(--muted)" }}>Meta description</label>
            <textarea value={metaDesc} onChange={e => setMetaDesc(e.target.value)} rows={3}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--cream)" }} />
            <div className="text-xs mt-1" style={{ color: metaDesc.length > 160 ? "#ef6444" : "var(--muted)" }}>
              {metaDesc.length}/160 caracteres
            </div>
          </div>
          {/* Vista previa Google */}
          <div className="rounded-xl p-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
            <div className="text-xs font-semibold mb-3 uppercase tracking-wider" style={{ color: "var(--muted)" }}>Preview Google</div>
            <div className="text-base font-medium" style={{ color: "#8ab4f8" }}>{metaTitle || titulo || "Título del artículo"}</div>
            <div className="text-xs mt-0.5" style={{ color: "#34a853" }}>aprobea.com/blog/{slug || "slug-del-articulo"}</div>
            <div className="text-sm mt-1" style={{ color: "#bdc1c6" }}>{metaDesc || resumen || "Descripción del artículo..."}</div>
          </div>
        </div>
      )}

      {tab === "preview" && (
        <div className="glass rounded-2xl p-8">
          {imagenUrl && (
            <img src={imagenUrl} alt={titulo} className="w-full rounded-xl mb-6 object-cover" style={{ maxHeight: "360px" }} />
          )}
          <h1 className="text-3xl font-bold mb-3">{titulo || "Sin título"}</h1>
          {resumen && <p className="text-lg mb-6" style={{ color: "var(--muted)" }}>{resumen}</p>}
          <div className="prose prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap"
            style={{ color: "var(--cream)" }}>
            {contenido || "Sin contenido aún."}
          </div>
        </div>
      )}
    </div>
  );
}
