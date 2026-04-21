"use client";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await createClient().auth.signInWithPassword({ email, password });
    if (error) {
      setError("Email o contraseña incorrectos");
      setLoading(false);
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Image src="/logo.svg" alt="Aprobea" width={160} height={45} className="mx-auto mb-6" />
          <h1 className="text-2xl font-bold">Accede a tu cuenta</h1>
        </div>
        <form onSubmit={handleLogin} className="glass rounded-2xl p-8 space-y-4">
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
              placeholder="••••••••" required
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
            {loading ? "Entrando..." : "Entrar"}
          </button>
          <p className="text-center text-sm" style={{ color: "var(--muted)" }}>
            ¿No tienes cuenta?{" "}
            <a href="/registro" style={{ color: "var(--green)" }}>Regístrate gratis</a>
          </p>
        </form>
      </div>
    </div>
  );
}
