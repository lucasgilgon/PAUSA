import type { Metadata, Viewport } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { SpeedInsights } from "@vercel/speed-insights/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PAUSA — Menos papeleo, más psicología",
  description:
    "La IA que transcribe tus sesiones y genera notas clínicas automáticamente. Formatos SOAP, DAP, BIRP, GIRP. Servidores en Europa. Desde 19€/mes.",
  keywords: [
    "documentación clínica",
    "psicología",
    "notas clínicas",
    "SOAP",
    "DAP",
    "BIRP",
    "GIRP",
    "transcripción",
    "IA",
    "RGPD",
    "salud mental",
  ],
  authors: [{ name: "Lucas Gil González" }],
  creator: "Lucas Gil González",
  publisher: "PAUSA",
  metadataBase: new URL("https://www.pausaas.io"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "PAUSA — Menos papeleo, más psicología",
    description:
      "La IA que transcribe tus sesiones y genera notas clínicas automáticamente. Formatos SOAP, DAP, BIRP, GIRP. Servidores en Europa. Desde 19€/mes.",
    url: "https://www.pausaas.io",
    siteName: "PAUSA",
    locale: "es_ES",
    type: "website",
    images: [
      {
        url: "https://www.pausaas.io/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "PAUSA - Documentación clínica con IA para psicólogos",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PAUSA — Menos papeleo, más psicología",
    description:
      "La IA que transcribe tus sesiones y genera notas clínicas automáticamente. Formatos SOAP, DAP, BIRP, GIRP. Servidores en Europa. Desde 19€/mes.",
    images: ["https://www.pausaas.io/og-image.jpg"],
    creator: "@pausaas",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0B1F2E",
  width: "device-width",
  initialScale: 1,
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
