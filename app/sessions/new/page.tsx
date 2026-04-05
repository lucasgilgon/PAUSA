/**
 * app/sessions/new/page.tsx
 */

import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { decryptPatientPII } from "@/lib/crypto";
import { NewSessionForm } from "@/components/sessions/NewSessionForm";

export const metadata: Metadata = { title: "Nueva sesión" };

interface NewSessionPageProps {
  searchParams: Promise<{ patientId?: string }>;
}

export default async function NewSessionPage({ searchParams }: NewSessionPageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");

  const { patientId } = await searchParams;

  // Cargar lista de pacientes activos para el selector
  const patients = await db.patient.findMany({
    where:   { psychologistId: userId, status: "active" },
    orderBy: { lastSessionAt: "desc" },
    select: {
      id: true, shortId: true, isAnonymized: true,
      firstName: true, lastName: true, totalSessions: true,
    },
  });

  const patientOptions = patients.map((p) => {
    let displayName = `Anon. P-${p.shortId}`;
    if (!p.isAnonymized) {
      try {
        const dec = decryptPatientPII({
          firstName: p.firstName, lastName: p.lastName, dateOfBirth: "2000-01-01",
        });
        displayName = `${dec.firstName} ${dec.lastName.charAt(0)}.`;
      } catch { /* usa anónimo */ }
    }
    return { id: p.id, displayName, totalSessions: p.totalSessions };
  });

  return (
    <NewSessionForm
      patients={patientOptions}
      preselectedPatientId={patientId}
    />
  );
}
