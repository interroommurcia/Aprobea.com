"use client";
import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const CATEGORIAS = [
  "Administrativo", "Policía Local", "Bomberos", "Sanidad",
  "Educación", "Técnico", "Servicios Sociales", "Otro"
];

export default function SubirPDF() {
  const [file, setFile]           = useState<File | null>(null);
  const [titulo, setTitulo]       = useState("");
  const [categoria, setCategoria] = useState("");
  const [fuenteNombre, setFuenteNombre] = useState("");
  const [fuenteUrl, setFuenteUrl]       = useState("");
  const [precioAprox, setPrecioAprox]   = useState("");
  const [estado, setEstado] = useState<"idle"|"subiendo"|"ok"|"error">("idle");
  const [mensaje, setMensaje] = useState("");
  const [drag, setDrag]   = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || !titulo) return;
    setEstado("subiendo");
    setMensaje("");

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const fd = new FormData();
    fd.append("file", file);
    fd.append("titulo", titulo);
    fd.append("categoria", categoria);
    if (fuenteNombre) fd.append("fuente_nombre", fuenteNombre);
    if (fuenteUrl)    fd.append("fuente_url", fuenteUrl);
    if (precioAprox)  fd.append("precio_aprox", precioAprox);

    try {
      const res  = await fetch("/api/temas/upload-pdf", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEstado("ok");
      setMensaje(data.mensaje);
      setFile(null); setTitulo(""); setCategoria("");
      setFuenteNombre(""); setFuenteUrl(""); setPrecioAprox("");
      setTimeout(() => window.location.reload(), 1500);
    } catch (err: unknown) {
      setEstado("error");
      setMensaje(err instanceof Error ? err.message : "Error desconocido");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f?.type === "application/pdf") {
      setFile(f);
      if (!titulo) setTitulo(f.name.replace(".pdf","").replace(/_/g," "));
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-2xl p-6 space-y-5">
      <h2 className="font-semibold text-base">Subir nuevo tema (PDF)</h2>

      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={handleDrop}
        className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all"
        style={{
          borderColor: drag ? "var(--green)" : "rgba(255,255,255,0.12)",
          background:   drag ? "rgba(29,158,117,0.05)" : "rgba(255,255,255,0.02)",
        }}
      >
        <input ref={inputRef} type="file" accept=".pdf" className="hidden"
          onChange={e => {
            const f = e.target.files?.[0];
            if (f) { setFile(f); if (!titulo) setTitulo(f.name.replace(".pdf","").replace(/_/g," ")); }
          }}
        />
        {file ? (
          <div>
            <div className="text-2xl mb-2">📄</div>
            <div className="font-medium text-sm">{file.name}</div>
            <div className="text-xs mt-1" style={{ color:"var(--muted)" }}>
              {(file.size/1024/1024).toFixed(2)} MB
            </div>
          </div>
        ) : (
          <div>
            <div className="text-3xl mb-3">📥</div>
            <p className="text-sm font-medium">Arrastra tu PDF aquí o haz clic para seleccionar</p>
            <p className="text-xs mt-1" style={{ color:"var(--muted)" }}>Solo archivos PDF · Máx. 50 MB</p>
          </div>
        )}
      </div>

      {/* Título + Categoría */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs mb-1.5 block" style={{ color:"var(--muted)" }}>Título del tema *</label>
          <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} required
            placeholder="Ej: Tema 1 — La Constitución Española"
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", color:"var(--cream)" }} />
        </div>
        <div>
          <label className="text-xs mb-1.5 block" style={{ color:"var(--muted)" }}>Categoría</label>
          <select value={categoria} onChange={e => setCategoria(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", color:"var(--cream)" }}>
            <option value="">Seleccionar...</option>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Fuente / Dónde adquirir */}
      <div className="rounded-xl p-4 space-y-3"
        style={{ background:"rgba(29,158,117,0.05)", border:"1px solid rgba(29,158,117,0.15)" }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm">📡</span>
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color:"var(--green)" }}>
            Fuente / Dónde adquirir
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background:"rgba(29,158,117,0.15)", color:"var(--green)" }}>
            Opcional — se muestra al alumno
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs mb-1.5 block" style={{ color:"var(--muted)" }}>Nombre de la fuente</label>
            <input type="text" value={fuenteNombre} onChange={e => setFuenteNombre(e.target.value)}
              placeholder="Ej: BOE · Editorial Adams · Amazon"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", color:"var(--cream)" }} />
          </div>
          <div>
            <label className="text-xs mb-1.5 block" style={{ color:"var(--muted)" }}>Precio aproximado</label>
            <input type="text" value={precioAprox} onChange={e => setPrecioAprox(e.target.value)}
              placeholder="Ej: Gratis · 12,95€ · 25€"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", color:"var(--cream)" }} />
          </div>
        </div>
        <div>
          <label className="text-xs mb-1.5 block" style={{ color:"var(--muted)" }}>URL de compra / descarga</label>
          <input type="url" value={fuenteUrl} onChange={e => setFuenteUrl(e.target.value)}
            placeholder="https://www.boe.es/... · https://www.amazon.es/..."
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", color:"var(--cream)" }} />
          <p className="text-[10px] mt-1" style={{ color:"var(--muted)" }}>
            Si el PDF es del BOE, pega el enlace directo a la publicación oficial.
          </p>
        </div>
      </div>

      {mensaje && (
        <div className="px-4 py-3 rounded-xl text-sm"
          style={{
            background: estado === "ok" ? "rgba(29,158,117,0.15)" : "rgba(239,68,68,0.15)",
            color:      estado === "ok" ? "var(--green)" : "#f87171",
          }}>
          {estado === "ok" ? "✅ " : "❌ "}{mensaje}
        </div>
      )}

      <button type="submit"
        disabled={!file || !titulo || estado === "subiendo"}
        className="glow-btn px-6 py-2.5 rounded-xl text-sm font-semibold text-black transition-opacity"
        style={{ background:"var(--green)", opacity:(!file||!titulo||estado==="subiendo") ? 0.5 : 1 }}>
        {estado === "subiendo" ? "⏳ Procesando PDF..." : "Subir y generar preguntas →"}
      </button>
    </form>
  );
}
