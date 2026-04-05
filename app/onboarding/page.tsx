/**
 * app/onboarding/page.tsx
 *
 * Wizard de primer acceso en 3 pasos:
 * 1. Bienvenida + datos profesionales
 * 2. Configuración RGPD (consentimiento, retención, DPA)
 * 3. Listo — ir al dashboard
 *
 * Server Component: verifica si ya completó onboarding (SecuritySettings existe).
 * Si ya existe → redirect a dashboard.
 */

import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export const metadata: Metadata = { title: "Configuración inicial" };

export default async function OnboardingPage() {
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");

  // Si ya configuró → dashboard
  const existing = await db.securitySettings.findUnique({
    where: { psychologistId: userId },
  });
  if (existing) redirect("/dashboard");

  return <OnboardingWizard />;
}
