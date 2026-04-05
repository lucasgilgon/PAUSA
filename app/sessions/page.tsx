/**
 * app/sessions/page.tsx
 */

import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { decryptPatientPII } from "@/lib/crypto";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { RiskAlertBanner } from "@/components/layout/RiskAlertBanner";
import { SessionsList } from "@/components/sessions/SessionsList";

export const metadata: Metadata = { title: "Sesiones — Pausa" };

export default async function SessionsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");

  const sessions = await db.session.findMany({
    where: { psychologistId: userId },
    orderBy: { scheduledAt: "desc" },
    take: 50,
    include: {
      patient: {
        select: { id: true, firstName: true, lastName: true, dateOfBirth: true, isAnonymized: true, shortId: true, currentRisk: true },
      },
      note: { select: { id: true } },
    },
  });

  const items = sessions.map((s) => {
    let displayName = `Anon. P-${s.patient.shortId}`;
    if (!s.patient.isAnonymized) {
      try {
        const dec = decryptPatientPII({
          firstName: s.patient.firstName,
          lastName:  s.patient.lastName,
          dateOfBirth: s.patient.dateOfBirth,
        });
        displayName = `${dec.firstName} ${dec.lastName.charAt(0)}.`;
      } catch { /* usa anónimo */ }
    }
    return {
      id:            s.id,
      patientId:     s.patientId,
      patientName:   displayName,
      sessionNumber: s.sessionNumber,
      status:        s.status,
      noteFormat:    s.noteFormat,
      scheduledAt:   s.scheduledAt.toISOString(),
      currentRisk:   s.patient.currentRisk,
      hasNote:       !!s.note,
    };
  });

  return (
    <div className="min-h-dvh bg-background pb-[var(--bottomnav-height)]">
      <TopBar userId={userId} />
      <RiskAlertBanner psychologistId={userId} />

      <main className="pt-[calc(var(--topbar-height)+0.75rem)] max-w-app mx-auto px-4">
        <SessionsList sessions={items} />
      </main>

      <BottomNav />
    </div>
  );
}
