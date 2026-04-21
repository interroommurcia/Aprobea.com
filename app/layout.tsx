import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { PostHogProvider } from "@/components/PostHogProvider";
import { Suspense } from "react";
import { Poppins, Nunito } from "next/font/google";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
})

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-nunito",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Aprobea — Plataforma IA para oposiciones en España",
  description:
    "Tests nacionales y regionales, BOE Radar 24/7 y tutor IA personalizado. Prepara tus oposiciones con inteligencia artificial.",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/logo.png", type: "image/png" }],
    apple: "/logo.png",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Aprobea — Plataforma IA para oposiciones en España",
    description: "Tests nacionales y regionales, BOE Radar 24/7 y tutor IA personalizado.",
    images: [{ url: "/logo.svg" }],
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={`${poppins.variable} ${nunito.variable}`}>
      <head>
        <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6067028856246284" crossOrigin="anonymous" />
      </head>
      <body>
        <ThemeProvider>
          <Suspense fallback={null}>
            <PostHogProvider>{children}</PostHogProvider>
          </Suspense>
        </ThemeProvider>
      </body>
    </html>
  );
}
