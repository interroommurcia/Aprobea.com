import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import DashboardSidebar from "./DashboardSidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("nombre, plan, onboarding_completado")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg)" }}>
      <DashboardSidebar
        nombre={profile?.nombre ?? user.email ?? ""}
        plan={profile?.plan ?? "free"}
      />
      <main className="flex-1 p-6 md:p-8 overflow-auto min-w-0 pt-16 md:pt-8">
        {children}
      </main>
    </div>
  );
}
