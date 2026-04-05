/**
 * app/sessions/[id]/page.tsx
 * Vista/grabación de una sesión clínica.
 */

import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { decryptPatientPII } from "@/lib/crypto";
import { SessionRecorder } from "@/components/sessions/SessionRecorder";

export const metadata: Metadata = { title: "Sesión — Pausa" };

interface SessionPageProps {
  params: Promise<{ id: string }>;
}

export default async function SessionPage({ params }: SessionPageProps) {
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");

  const { id } = await params;

  const session = await db.session.findFirst({
    where: { id, psychologistId: userId },
    include: {
      patient: {
        select: {
          id: true, shortId: true, isAnonymized: true,
          firstName: true, lastName: true, dateOfBirth: true, currentRisk: true,
        },
      },
      transcription: {
        select: { id: true, diarizedText: true, wordCount: true },
      },
      note: {
        select: { id: true, status: true, format: true, content: true },
      },
    },
  });

  if (!session) notFound();

  let patientName = `Anon. P-${session.patient.shortId}`;
  if (!session.patient.isAnonymized) {
    try {
      const dec = decryptPatientPII({
        firstName:   session.patient.firstName,
        lastName:    session.patient.lastName,
        dateOfBirth: session.patient.dateOfBirth,
      });
      patientName = `${dec.firstName} ${dec.lastName.charAt(0)}.`;
    } catch { /* usa anónimo */ }
  }

  return (
    <SessionRecorder
      session={{
        id:              session.id,
        patientId:       session.patientId,
        patientName,
        sessionNumber:   session.sessionNumber,
        status:          session.status,
        noteFormat:      session.noteFormat,
        scheduledAt:     session.scheduledAt.toISOString(),
        consentRecorded: session.consentRecorded,
        currentRisk:     session.patient.currentRisk,
        transcription:   session.transcription
          ? {
              id:           session.transcription.id,
              diarizedText: session.transcription.diarizedText,
              wordCount:    session.transcription.wordCount,
            }
          : null,
        note: session.note
          ? {
              id:      session.note.id,
              status:  session.note.status,
              format:  session.note.format,
              content: session.note.content as Record<string, string>,
            }
          : null,
      }}
    />
  );
}
