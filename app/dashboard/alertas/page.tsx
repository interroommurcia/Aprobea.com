import { createClient } from "@/lib/supabase/server";
import AlertasClient from "./AlertasClient";

export default async function AlertasPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: alerta } = await supabase
    .from("alertas_usuario")
    .select("*")
    .eq("user_id", user.id)
    .single();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Alertas BOE</h1>
      <p className="text-sm mb-8" style={{ color: "var(--muted)" }}>
        Recibe un email cuando se publique una convocatoria que te interese.
      </p>
      <AlertasClient userId={user.id} alerta={alerta} />
    </div>
  );
}
