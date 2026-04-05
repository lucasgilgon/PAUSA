/**
 * app/api/patients/[id]/route.ts
 *
 * GET   /api/patients/[id] — Obtener paciente con PII descifrada
 * PATCH /api/patients/[id] — Actualizar datos del paciente
 * DELETE /api/patients/[id] — Archivar paciente (soft delete, RGPD)
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db }                from "@/lib/db";
import { patientLogger }     from "@/lib/logger";
import { writeAudit, extractRequestContext } from "@/lib/audit";
import { encryptPatientPII, decryptPatientPII } from "@/lib/crypto";
import { apiSuccess, apiError, formatZodError } from "@/lib/utils";

const UpdatePatientSchema = z.object({
  therapyModality:  z.enum(["TCC", "ACT", "DBT", "EMDR", "psico", "other"]).optional(),
  diagnosisCodes:   z.array(z.string().max(10)).max(10).optional(),
  status:           z.enum(["active", "paused", "discharged"]).optional(),
  therapistNotes:   z.string().max(5000).optional(),
  nextSessionAt:    z.string().datetime().optional(),
  dataRetentionUntil: z.string().datetime().optional(),
  // PII actualizable
  email:            z.string().email().optional().or(z.literal("")),
  phone:            z.string().max(20).optional().or(z.literal("")),
  emergencyName:    z.string().max(100).optional().or(z.literal("")),
  emergencyPhone:   z.string().max(20).optional().or(z.literal("")),
});

// ─── GET ──────────────────────────────────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) return NextResponse.json(apiError("UNAUTHORIZED", "No autenticado"), { status: 401 });

  const { id } = await params;

  const patient = await db.patient.findFirst({
    where: { id, psychologistId: userId },
  });

  if (!patient) return NextResponse.json(apiError("NOT_FOUND", "Paciente no encontrado"), { status: 404 });

  // Descifrar PII
  let pii = { firstName: "???", lastName: "???", dateOfBirth: "???", email: "", phone: "" };
  if (!patient.isAnonymized) {
    try {
      const dec = decryptPatientPII({
        firstName:   patient.firstName,
        lastName:    patient.lastName,
        dateOfBirth: patient.dateOfBirth,
        email:       patient.email ?? undefined,
        phone:       patient.phone ?? undefined,
      });
      pii = { ...dec, email: dec.email ?? "", phone: dec.phone ?? "" };
    } catch {
      patientLogger.error({ patientId: id }, "PII decrypt failed on GET");
    }
  }

  await writeAudit({
    psychologistId: userId, action: "patient.view",
    resourceType: "patient", resourceId: id,
    ...extractRequestContext(request),
  });

  return NextResponse.json(apiSuccess({
    ...patient,
    // Sobreescribir con datos descifrados
    firstName:   pii.firstName,
    lastName:    pii.lastName,
    dateOfBirth: pii.dateOfBirth,
    email:       pii.email,
    phone:       pii.phone,
    // Serializar fechas
    createdAt:         patient.createdAt.toISOString(),
    updatedAt:         patient.updatedAt.toISOString(),
    lastSessionAt:     patient.lastSessionAt?.toISOString(),
    nextSessionAt:     patient.nextSessionAt?.toISOString(),
    consentDate:       patient.consentDate?.toISOString(),
    dataRetentionUntil: patient.dataRetentionUntil?.toISOString(),
    archivedAt:        patient.archivedAt?.toISOString(),
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

  const existing = await db.patient.findFirst({
    where: { id, psychologistId: userId },
    select: { id: true, status: true },
  });
  if (!existing) return NextResponse.json(apiError("NOT_FOUND", "Paciente no encontrado"), { status: 404 });
  if (existing.status === "archived") {
    return NextResponse.json(apiError("ARCHIVED", "No se puede modificar un paciente archivado"), { status: 409 });
  }

  let rawBody: unknown;
  try { rawBody = await request.json(); }
  catch { return NextResponse.json(apiError("INVALID_JSON", "Body inválido"), { status: 400 }); }

  const result = UpdatePatientSchema.safeParse(rawBody);
  if (!result.success) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Datos inválidos", formatZodError(result.error)),
      { status: 422 }
    );
  }

  const { email, phone, emergencyName, emergencyPhone, therapistNotes, ...rest } = result.data;

  // Cifrar campos PII si se actualizan
  const encryptedUpdates: Record<string, string> = {};
  if (email !== undefined) {
    const enc = encryptPatientPII({ firstName: "x", lastName: "x", dateOfBirth: "2000-01-01", email: email || undefined });
    if (enc.email) encryptedUpdates["email"] = enc.email;
  }
  if (phone !== undefined) {
    const enc = encryptPatientPII({ firstName: "x", lastName: "x", dateOfBirth: "2000-01-01", phone: phone || undefined });
    if (enc.phone) encryptedUpdates["phone"] = enc.phone;
  }
  if (therapistNotes !== undefined) {
    const enc = encryptPatientPII({ firstName: "x", lastName: "x", dateOfBirth: "2000-01-01", therapistNotes });
    if (enc.therapistNotes) encryptedUpdates["therapistNotes"] = enc.therapistNotes;
  }

  const updated = await db.patient.update({
    where: { id },
    data:  {
      ...rest,
      ...encryptedUpdates,
      nextSessionAt: rest.nextSessionAt ? new Date(rest.nextSessionAt) : undefined,
    },
    select: { id: true, status: true, updatedAt: true },
  });

  await writeAudit({
    psychologistId: userId, action: "patient.update",
    resourceType: "patient", resourceId: id,
    ...extractRequestContext(request),
    metadata: { fields: Object.keys(result.data) },
  });

  return NextResponse.json(apiSuccess({ id: updated.id, updatedAt: updated.updatedAt.toISOString() }));
}

// ─── DELETE (soft — archiva) ──────────────────────────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) return NextResponse.json(apiError("UNAUTHORIZED", "No autenticado"), { status: 401 });

  const { id } = await params;

  const existing = await db.patient.findFirst({
    where: { id, psychologistId: userId },
    select: { id: true },
  });
  if (!existing) return NextResponse.json(apiError("NOT_FOUND", "Paciente no encontrado"), { status: 404 });

  await db.patient.update({
    where: { id },
    data:  { status: "archived", archivedAt: new Date() },
  });

  await writeAudit({
    psychologistId: userId, action: "patient.delete",
    resourceType: "patient", resourceId: id,
    ...extractRequestContext(request),
  });

  patientLogger.info({ patientId: id, userId }, "Patient archived (soft delete)");

  return NextResponse.json(apiSuccess({ id, archived: true }));
}
