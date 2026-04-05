/**
 * app/patients/[id]/page.tsx
 *
 * Página de detalle de paciente.
 * Carga: datos del paciente (descifrados), historial de sesiones,
 * alertas de riesgo activas, y última nota.
 */

import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { decryptPatientPII } from "@/lib/crypto";
import { writeAudit } from "@/lib/audit";
import { patientLogger } from "@/lib/logger";
import { PatientDetail } from "@/components/patients/PatientDetail";

export const metadata: Metadata = { title: "Paciente" };
export const revalidate = 30;

interface PatientPageProps {
  params:      Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}

export default async function PatientPage({ params, searchParams }: PatientPageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");

  const { id }  = await params;
  const { tab } = await searchParams;

  const patient = await db.patient.findFirst({
    where: { id, psychologistId: userId },
    include: {
      sessions: {
        where:   { status: { not: "cancelled" } },
        orderBy: { scheduledAt: "desc" },
        take:    10,
        include: {
          note: { select: { id: true, status: true, format: true } },
        },
      },
      riskAlerts: {
        orderBy: { detectedAt: "desc" },
        take: 5,
      },
    },
  });

  if (!patient) notFound();

  // Descifrar PII
  let displayName = `Anon. P-${patient.shortId}`;
  let initials    = "??";
  let fullName    = displayName;
  let ageYears: number | undefined;

  if (!patient.isAnonymized) {
    try {
      const dec = decryptPatientPII({
        firstName:   patient.firstName,
        lastName:    patient.lastName,
        dateOfBirth: patient.dateOfBirth,
      });
      fullName    = `${dec.firstName} ${dec.lastName}`;
      displayName = `${dec.firstName} ${dec.lastName.charAt(0)}.`;
      initials    = `${dec.firstName.charAt(0)}${dec.lastName.charAt(0)}`.toUpperCase();
      ageYears    = new Date().getFullYear() - new Date(dec.dateOfBirth).getFullYear();
    } catch {
      patientLogger.error({ patientId: id }, "Decrypt failed on patient detail");
    }
  }

  await writeAudit({
    psychologistId: userId,
    action:         "patient.view",
    resourceType:   "patient",
    resourceId:     id,
  });

  return (
    <PatientDetail
      patient={{
        id:              patient.id,
        shortId:         patient.shortId,
        displayName,
        fullName,
        initials,
        ageYears,
        isAnonymized:    patient.isAnonymized,
        status:          patient.status,
        currentRisk:     patient.currentRisk,
        therapyModality: patient.therapyModality,
        diagnosisCodes:  patient.diagnosisCodes,
        totalSessions:   patient.totalSessions,
        lastSessionAt:   patient.lastSessionAt?.toISOString(),
        nextSessionAt:   patient.nextSessionAt?.toISOString(),
        consentGiven:    patient.consentGiven,
        createdAt:       patient.createdAt.toISOString(),
        dataRetentionUntil: patient.dataRetentionUntil?.toISOString(),
      }}
      sessions={patient.sessions.map((s) => ({
        id:            s.id,
        sessionNumber: s.sessionNumber,
        status:        s.status,
        noteFormat:    s.noteFormat,
        scheduledAt:   s.scheduledAt.toISOString(),
        durationMinutes: s.durationMinutes ?? undefined,
        hasNote:       !!s.note,
        noteStatus:    s.note?.status,
      }))}
      riskAlerts={patient.riskAlerts.map((a) => ({
        id:             a.id,
        level:          a.level,
        type:           a.type,
        detectedAt:     a.detectedAt.toISOString(),
        acknowledgedAt: a.acknowledgedAt?.toISOString(),
        autoDetected:   a.autoDetected,
        keywords:       a.keywords,
      }))}
      initialTab={tab ?? "overview"}
    />
  );
}
