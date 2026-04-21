import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import BackofficeSidebar from "./BackofficeSidebar";

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verificar admin
  const admins = (process.env.ADMIN_EMAILS ?? "aprobe.com@gmail.com").split(",").map(e => e.trim());
  const { data: profile } = await supabase.from("profiles").select("plan").eq("id", user.id).single();
  const isAdmin = profile?.plan === "academia" || admins.includes(user.email ?? "");
  if (!isAdmin) redirect("/dashboard");

  return (
    <div className="min-h-screen flex" style={{ background: "var(--bg)" }}>
      <BackofficeSidebar userEmail={user.email ?? ""} />
      <main className="flex-1 p-6 md:p-8 overflow-auto min-w-0">{children}</main>
    </div>
  );
}
