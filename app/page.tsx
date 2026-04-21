import Nav from "@/components/Nav";
import HeroSection from "@/components/HeroSection";
import HowItWorks from "@/components/HowItWorks";
import ConvocatoriasFeed from "@/components/ConvocatoriasFeed";
import PricingSection from "@/components/PricingSection";
import CtaSection from "@/components/CtaSection";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <HeroSection />
        <HowItWorks />
        <ConvocatoriasFeed />
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
