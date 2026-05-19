import type { Metadata } from "next";
import "../globals.css";

export const metadata: Metadata = {
  title: "PAUSA — Inversión en Salud Mental Digital | Documentación Clínica con IA",
  description:
    "Oportunidad de inversión en healthtech. PAUSA automatiza la documentación clínica para psicólogos con IA local, cifrado AES-256 y cumplimiento RGPD.",
  openGraph: {
    title: "PAUSA — Inversión en Salud Mental Digital",
    description:
      "Oportunidad de inversión en healthtech. IA local, cifrado AES-256, cumplimiento RGPD.",
    type: "website",
    locale: "es_ES",
  },
};

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="scroll-smooth">
      <body className="landing-body">{children}</body>
    </html>
  );
}
