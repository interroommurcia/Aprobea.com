"use client";
import { useState } from "react";

const CATEGORIAS = [
  "Administrativo","Policía Local","Bomberos","Sanidad",
  "Educación","Técnico","Servicios Sociales",
];
const COMUNIDADES = [
  "Andalucía","Aragón","Asturias","Baleares","Canarias","Cantabria",
  "Castilla-La Mancha","Castilla y León","Cataluña","Extremadura",
  "Galicia","La Rioja","Madrid","Murcia","Navarra","País Vasco","Valencia",
  "Estado (Nacional)",
];

type Alerta = {
  id: string;
  categorias: string[];
  comunidades: string[];
  email_activo: boolean;
} | null;

export default function AlertasClient({ userId, alerta }: { userId: string; alerta: Alerta }) {
  const [categorias,  setCategorias]  = useState<string[]>(alerta?.categorias  ?? []);
  const [comunidades, setComunidades] = useState<string[]>(alerta?.comunidades ?? []);
  const [emailActivo, setEmailActivo] = useState(alerta?.email_activo ?? true);
  const [guardando,   setGuardando]   = useState(false);
  const [ok,          setOk]          = useState(false);

  function toggle<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val];
  }

  async function guardar() {
    setGuardando(true);
    setOk(false);
    await fetch("/api/dashboard/alertas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ categorias, comunidades, email_activo: emailActivo }),
    });
    setGuardando(false);
    setOk(true);
    setTimeout(() => setOk(false), 3000);
  }

  const Chip = ({ label, activo, onClick }: { label: string; activo: boolean; onClick: () => void }) => (
    <button type="button" onClick={onClick}
      className="text-sm px-3 py-1.5 rounded-xl font-medium transition-all"
      style={{
        background: activo ? "rgba(29,158,117,0.2)" : "rgba(255,255,255,0.04)",
        color:       activo ? "var(--green)"         : "var(--muted)",
        border:      activo ? "1px solid rgba(29,158,117,0.4)" : "1px solid rgba(255,255,255,0.06)",
      }}>
      {activo ? "✓ " : ""}{label}
    </button>
  );

  return (
    <div className="max-w-2xl space-y-6">

      {/* Email activo */}
      <div className="glass rounded-2xl p-6 flex items-center justify-between">
        <div>
          <div className="font-semibold">Alertas por email</div>
          <div className="text-sm mt-0.5" style={{ color:"var(--muted)" }}>
            Recibe un email cuando detectemos convocatorias nuevas
          </div>
        </div>
        <button onClick={() => setEmailActivo(v => !v)}
          className="relative w-12 h-6 rounded-full transition-colors"
          style={{ background: emailActivo ? "var(--green)" : "rgba(255,255,255,0.15)" }}>
          <span className="absolute top-1 w-4 h-4 rounded-full bg-white transition-transform"
            style={{ left: emailActivo ? "1.75rem" : "0.25rem" }} />
        </button>
      </div>

      {/* Categorías */}
      <div className="glass rounded-2xl p-6">
        <h2 className="font-semibold mb-1">Categorías de oposición</h2>
        <p className="text-xs mb-4" style={{ color:"var(--muted)" }}>
          Filtra por tipo de plaza. Vacío = todas las categorías.
        </p>
        <div className="flex flex-wrap gap-2">
          {CATEGORIAS.map(c => (
            <Chip key={c} label={c} activo={categorias.includes(c)}
              onClick={() => setCategorias(toggle(categorias, c))} />
          ))}
        </div>
      </div>

      {/* Comunidades */}
      <div className="glass rounded-2xl p-6">
        <h2 className="font-semibold mb-1">Comunidades autónomas</h2>
        <p className="text-xs mb-4" style={{ color:"var(--muted)" }}>
          Recibe solo convocatorias de las CCAA que te interesan. Vacío = todas.
        </p>
        <div className="flex flex-wrap gap-2">
          {COMUNIDADES.map(c => (
            <Chip key={c} label={c} activo={comunidades.includes(c)}
              onClick={() => setComunidades(toggle(comunidades, c))} />
          ))}
        </div>
      </div>

      {/* Guardar */}
      <div className="flex items-center gap-4">
        <button onClick={guardar} disabled={guardando}
          className="glow-btn px-6 py-3 rounded-xl text-sm font-semibold text-black"
          style={{ background:"var(--green)", opacity: guardando ? 0.6 : 1 }}>
          {guardando ? "Guardando…" : "Guardar preferencias"}
        </button>
        {ok && (
          <span className="text-sm" style={{ color:"var(--green)" }}>
            ✓ Guardado correctamente
          </span>
        )}
      </div>
    </div>
  );
}
