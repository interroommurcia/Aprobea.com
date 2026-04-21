"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function RegistroPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleRegistro(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await createClient().auth.signUp({
      email, password,
      options: { data: { nombre } },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/onboarding");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image src="/logo.svg" alt="Aprobea" width={160} height={45} className="mx-auto mb-6" />
          <h1 className="text-2xl font-bold">Empieza gratis</h1>
          <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>Sin tarjeta. Alertas inmediatas del BOE.</p>
        </div>
        <form onSubmit={handleRegistro} className="glass rounded-2xl p-8 space-y-4">
          <div>
            <label className="text-sm mb-1.5 block" style={{ color: "var(--muted)" }}>Nombre</label>
            <input
              type="text" value={nombre} onChange={e => setNombre(e.target.value)}
              placeholder="Tu nombre" required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--cream)" }}
            />
          </div>
          <div>
            <label className="text-sm mb-1.5 block" style={{ color: "var(--muted)" }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com" required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--cream)" }}
            />
          </div>
          <div>
            <label className="text-sm mb-1.5 block" style={{ color: "var(--muted)" }}>Contraseña</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres" required minLength={8}
              className="w-full px-4 py-3 rounded-xl text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "var(--cream)" }}
            />
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit" disabled={loading}
            className="glow-btn w-full py-3 rounded-xl text-sm font-semibold text-black"
            style={{ background: "var(--green)", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Creando cuenta..." : "Crear cuenta gratis"}
          </button>
          <p className="text-center text-sm" style={{ color: "var(--muted)" }}>
            ¿Ya tienes cuenta?{" "}
            <a href="/login" style={{ color: "var(--green)" }}>Entrar</a>
          </p>
        </form>
      </div>
    </div>
  );
}
