import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Pausa — Gestión clínica",
  description: "Plataforma de documentación clínica para psicólogos con privacidad RGPD",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <ClerkProvider>
          {children}
          <SpeedInsights />
        </ClerkProvider>
      </body>
    </html>
  );
}
