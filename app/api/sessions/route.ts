/**
 * app/api/sessions/route.ts
 *
 * POST /api/sessions — Crear nueva sesión clínica.
 * Calcula automáticamente el número de sesión del paciente.
 * Valida que el paciente pertenece al psicólogo autenticado.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db }            from "@/lib/db";
import { sessionLogger } from "@/lib/logger";
import { writeAudit, extractRequestContext } from "@/lib/audit";
import { apiSuccess, apiError, formatZodError } from "@/lib/utils";

// ─── GET /api/sessions — Listar sesiones ──────────────────────────────────

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(apiError("UNAUTHORIZED", "No autenticado"), { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get("patientId");
  const limit     = Math.min(parseInt(searchParams.get("limit") ?? "50", 10), 100);

  const sessions = await db.session.findMany({
    where: {
      psychologistId: userId,
      ...(patientId ? { patientId } : {}),
      status: { not: "cancelled" },
    },
    include: {
      patient: { select: { firstName: true, lastName: true, isAnonymized: true, shortId: true, currentRisk: true } },
      note:    { select: { id: true } },
    },
    orderBy: { scheduledAt: "desc" },
    take: limit,
  });

  const items = sessions.map((s) => ({
    id:            s.id,
    patientId:     s.patientId,
    patientName:   s.patient.isAnonymized
      ? `Anon. P-${s.patient.shortId}`
      : `${s.patient.firstName} ${s.patient.lastName}`.trim(),
    sessionNumber: s.sessionNumber,
    status:        s.status,
    noteFormat:    s.noteFormat,
    scheduledAt:   s.scheduledAt.toISOString(),
    currentRisk:   s.patient.currentRisk,
    hasNote:       !!s.note,
  }));

  return NextResponse.json(apiSuccess({ items, total: items.length }));
}

// ─── POST /api/sessions — Crear sesión ────────────────────────────────────

const CreateSessionSchema = z.object({
  patientId:       z.string().uuid(),
  scheduledAt:     z.string().datetime(),
  durationMinutes: z.number().int().min(15).max(180).default(50),
  noteFormat:      z.enum(["SOAP", "DAP", "BIRP", "GIRP", "free"]).default("SOAP"),
  consentRecorded: z.boolean(),
  therapistObservations: z.string().max(2000).optional(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(apiError("UNAUTHORIZED", "No autenticado"), { status: 401 });
  }

  let rawBody: unknown;
  try { rawBody = await request.json(); }
  catch { return NextResponse.json(apiError("INVALID_JSON", "Body inválido"), { status: 400 }); }

  const result = CreateSessionSchema.safeParse(rawBody);
  if (!result.success) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Datos inválidos", formatZodError(result.error)),
      { status: 422 }
    );
  }

  const { patientId, scheduledAt, durationMinutes, noteFormat, consentRecorded } = result.data;

  // Verificar que el paciente pertenece al psicólogo
  const patient = await db.patient.findFirst({
    where: { id: patientId, psychologistId: userId },
    select: { id: true, totalSessions: true },
  });

  if (!patient) {
    return NextResponse.json(apiError("NOT_FOUND", "Paciente no encontrado"), { status: 404 });
  }

  if (!consentRecorded) {
    return NextResponse.json(
      apiError("CONSENT_REQUIRED", "El consentimiento de grabación es obligatorio (RGPD)"),
      { status: 422 }
    );
  }

  const sessionNumber = patient.totalSessions + 1;

  const session = await db.session.create({
    data: {
      patientId,
      psychologistId:  userId,
      sessionNumber,
      status:          "scheduled",
      noteFormat,
      scheduledAt:     new Date(scheduledAt),
      durationMinutes,
      consentRecorded,
      detectedRiskLevel: "none",
      isAnonymized:    false,
    },
    select: { id: true, sessionNumber: true },
  });

  // Actualizar total de sesiones del paciente
  await db.patient.update({
    where: { id: patientId },
    data:  {
      totalSessions: sessionNumber,
      nextSessionAt: new Date(scheduledAt),
    },
  });

  await writeAudit({
    psychologistId: userId,
    action:         "session.create",
    resourceType:   "session",
    resourceId:     session.id,
    ...extractRequestContext(request),
    metadata:       { patientId, sessionNumber, noteFormat },
  });

  sessionLogger.info({ sessionId: session.id, patientId, sessionNumber }, "Session created");

  return NextResponse.json(
    apiSuccess({ id: session.id, sessionNumber: session.sessionNumber }),
    { status: 201 }
  );
}
