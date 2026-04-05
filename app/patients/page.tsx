/**
 * app/patients/page.tsx
 */

import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { decryptPatientPII } from "@/lib/crypto";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { RiskAlertBanner } from "@/components/layout/RiskAlertBanner";
import { PatientsClient } from "@/components/patients/PatientsClient";
import type { PatientPublic } from "@/types";

export const metadata: Metadata = { title: "Pacientes — Pausa" };

export default async function PatientsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");

  const patients = await db.patient.findMany({
    where: { psychologistId: userId, status: { not: "archived" } },
    orderBy: { lastSessionAt: "desc" },
  });

  const decrypted: PatientPublic[] = patients.map((p) => {
    let displayName = `Anon. P-${p.shortId}`;
    let initials    = "??";
    let ageYears: number | undefined;

    if (!p.isAnonymized) {
      try {
        const dec = decryptPatientPII({
          firstName: p.firstName, lastName: p.lastName, dateOfBirth: p.dateOfBirth,
        });
        displayName = `${dec.firstName} ${dec.lastName.charAt(0)}.`;
        initials    = `${dec.firstName.charAt(0)}${dec.lastName.charAt(0)}`.toUpperCase();
        ageYears    = new Date().getFullYear() - new Date(dec.dateOfBirth).getFullYear();
      } catch { /* usa anónimo */ }
    }

    return {
      id:              p.id,
      psychologistId:  p.psychologistId,
      shortId:         p.shortId,
      isAnonymized:    p.isAnonymized,
      status:          p.status,
      currentRisk:     p.currentRisk,
      therapyModality: p.therapyModality,
      totalSessions:   p.totalSessions,
      lastSessionAt:   p.lastSessionAt?.toISOString(),
      nextSessionAt:   p.nextSessionAt?.toISOString(),
      consentGiven:    p.consentGiven,
      consentDate:     p.consentDate?.toISOString(),
      dataRetentionUntil: p.dataRetentionUntil?.toISOString(),
      retentionYears:  p.retentionYears,
      createdAt:       p.createdAt.toISOString(),
      updatedAt:       p.updatedAt.toISOString(),
      archivedAt:      p.archivedAt?.toISOString(),
      displayName,
      initials,
      ageYears,
    };
  });

  return (
    <div className="min-h-dvh bg-background pb-[var(--bottomnav-height)]">
      <TopBar userId={userId} />
      <RiskAlertBanner psychologistId={userId} />

      <main className="pt-[calc(var(--topbar-height)+0.75rem)] max-w-app mx-auto px-4">
        <PatientsClient initialPatients={decrypted} />
      </main>

      <BottomNav />
    </div>
  );
}
