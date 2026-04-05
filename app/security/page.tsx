/**
 * app/security/page.tsx
 * Configuración de seguridad y RGPD.
 */

import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { SecurityClient } from "@/components/security/SecurityClient";

export const metadata: Metadata = { title: "Seguridad — Pausa" };

export default async function SecurityPage() {
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");

  let settings = await db.securitySettings.findUnique({
    where: { psychologistId: userId },
  });

  if (!settings) {
    settings = await db.securitySettings.create({
      data: { psychologistId: userId },
    });
  }

  // Calcular score de cumplimiento (0-100)
  const checks = [
    settings.twoFactorEnabled,
    settings.flashPrivacyEnabled,
    settings.autoAnonymizeTranscriptions,
    settings.encryptionEnabled,
    settings.dpaSignedWithAnthropic,
    settings.dataRetentionYears <= 5,
    !!settings.dataProtectionOfficer,
    settings.keyRotationDays <= 90,
  ];
  const complianceScore = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  const settingsData = {
    twoFactorEnabled:             settings.twoFactorEnabled,
    sessionTimeoutMinutes:        settings.sessionTimeoutMinutes,
    flashPrivacyEnabled:          settings.flashPrivacyEnabled,
    autoAnonymizeTranscriptions:  settings.autoAnonymizeTranscriptions,
    anonymizePatientNames:        settings.anonymizePatientNames,
    anonymizeDates:               settings.anonymizeDates,
    anonymizeLocations:           settings.anonymizeLocations,
    dataRetentionYears:           settings.dataRetentionYears,
    autoDeleteEnabled:            settings.autoDeleteEnabled,
    autoDeleteNotifyDays:         settings.autoDeleteNotifyDays,
    dpaSignedWithAnthropic:       settings.dpaSignedWithAnthropic,
    dpaSignedAt:                  settings.dpaSignedAt?.toISOString(),
    dpaVersion:                   settings.dpaVersion,
    keyRotationDays:              settings.keyRotationDays,
    lastKeyRotationAt:            settings.lastKeyRotationAt?.toISOString(),
  };

  return (
    <div className="min-h-dvh bg-background pb-[var(--bottomnav-height)]">
      <TopBar userId={userId} />

      <main className="pt-[calc(var(--topbar-height)+0.75rem)] max-w-app mx-auto px-4">
        <SecurityClient
          initialSettings={settingsData}
          complianceScore={complianceScore}
        />
      </main>

      <BottomNav />
    </div>
  );
}
