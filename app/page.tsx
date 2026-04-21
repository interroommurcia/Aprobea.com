import Nav from "@/components/Nav";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import ConvocatoriasFeed from "@/components/ConvocatoriasFeed";
import PricingSection from "@/components/PricingSection";
import CtaSection from "@/components/CtaSection";
import { createServiceClient } from "@/lib/supabase/server";

export const revalidate = 300;

export default async function Home() {
  let convocatorias: any[] = [];
  try {
    const supabase = await createServiceClient();
    const { data } = await supabase
      .from("convocatorias")
      .select("id, titulo, categoria, num_plazas, fecha_limite, boletin_referencia, url_boletin, organismo_nombre, created_at")
      .eq("estado", "activa")
      .order("created_at", { ascending: false })
      .limit(6);
    convocatorias = data ?? [];
  } catch {
    // Si Supabase no está configurado, usamos el fallback del componente
  }

  return (
    <>
      <Nav />
      <main>
        <HeroSection />
        <HowItWorks />
        <ConvocatoriasFeed convocatorias={convocatorias} />
        <PricingSection />
        <CtaSection />
      </main>
      <footer
        className="py-8 px-6 text-center text-xs"
        style={{ color: "var(--muted)", borderTop: "1px solid var(--border)" }}
      >
        © 2025 Aprobea · Oposiciones Locales y Regionales · España
      </footer>
    </>
  );
}
