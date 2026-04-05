/**
 * app/api/sessions/[id]/route.ts
 *
 * GET   /api/sessions/[id] — Obtener sesión completa
 * PATCH /api/sessions/[id] — Actualizar estado / observaciones
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db }            from "@/lib/db";
import { sessionLogger } from "@/lib/logger";
import { writeAudit, extractRequestContext } from "@/lib/audit";
import { apiSuccess, apiError, formatZodError } from "@/lib/utils";

const PatchSessionSchema = z.object({
  status:                z.enum(["cancelled", "scheduled", "recording"]).optional(),
  therapistObservations: z.string().max(2000).optional(),
  followUpRequired:      z.boolean().optional(),
  followUpNotes:         z.string().max(500).optional(),
  durationMinutes:       z.number().int().positive().optional(),
}).refine((d) => Object.values(d).some((v) => v !== undefined), {
  message: "Proporciona al menos un campo para actualizar",
});

// ─── GET ──────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) return NextResponse.json(apiError("UNAUTHORIZED", "No autenticado"), { status: 401 });

  const { id } = await params;

  const session = await db.session.findFirst({
    where: { id, psychologistId: userId },
    include: {
      transcription: { select: { id: true, wordCount: true, durationSeconds: true, isAnonymized: true } },
      note:          {
        select: {
          id: true, status: true, format: true,
          content: true,            // ← incluir para caché mobile (GRATIS, ya está en DB)
          detectedRiskLevel: true,
          riskAlertCreated: true,
          isAIGenerated: true,
          aiModel: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      riskAlerts:    { where: { acknowledgedAt: null }, select: { id: true, level: true } },
    },
  });

  if (!session) return NextResponse.json(apiError("NOT_FOUND", "Sesión no encontrada"), { status: 404 });

  await writeAudit({
    psychologistId: userId, action: "session.note.view",
    resourceType: "session", resourceId: id,
    ...extractRequestContext(request),
  });

  return NextResponse.json(apiSuccess({
    ...session,
    scheduledAt:   session.scheduledAt.toISOString(),
    startedAt:     session.startedAt?.toISOString(),
    endedAt:       session.endedAt?.toISOString(),
    audioDeletedAt: session.audioDeletedAt?.toISOString(),
    createdAt:     session.createdAt.toISOString(),
    updatedAt:     session.updatedAt.toISOString(),
  }));
}

// ─── PATCH ────────────────────────────────────────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) return NextResponse.json(apiError("UNAUTHORIZED", "No autenticado"), { status: 401 });

  const { id } = await params;

  const existing = await db.session.findFirst({
    where: { id, psychologistId: userId },
    select: { id: true, status: true },
  });
  if (!existing) return NextResponse.json(apiError("NOT_FOUND", "Sesión no encontrada"), { status: 404 });

  let rawBody: unknown;
  try { rawBody = await request.json(); }
  catch { return NextResponse.json(apiError("INVALID_JSON", "Body inválido"), { status: 400 }); }

  const result = PatchSessionSchema.safeParse(rawBody);
  if (!result.success) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Datos inválidos", formatZodError(result.error)),
      { status: 422 }
    );
  }

  const updated = await db.session.update({
    where: { id },
    data:  result.data,
    select: { id: true, status: true, updatedAt: true },
  });

  sessionLogger.info({ sessionId: id, userId, data: result.data }, "Session updated");

  return NextResponse.json(apiSuccess({ id: updated.id, status: updated.status }));
}
