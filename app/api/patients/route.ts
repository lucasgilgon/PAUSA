/**
 * app/api/patients/route.ts
 *
 * GET  /api/patients — Lista paginada de pacientes (datos PII descifrados)
 * POST /api/patients — Crear paciente con PII encriptada en DB
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db }                from "@/lib/db";
import { patientLogger }     from "@/lib/logger";
import { writeAudit, extractRequestContext } from "@/lib/audit";
import { encryptPatientPII, decryptPatientPII } from "@/lib/crypto";
import { apiSuccess, apiError, formatZodError, generateShortId } from "@/lib/utils";
import {
  CreatePatientSchema,
  PatientFilterSchema,
  type PatientPublic,
} from "@/types";
import { addYears } from "date-fns";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(apiError("UNAUTHORIZED", "No autenticado"), { status: 401 });
  }

  const searchParams = Object.fromEntries(request.nextUrl.searchParams);
  const filterResult = PatientFilterSchema.safeParse({
    ...searchParams,
    page:  searchParams["page"]  ? Number(searchParams["page"])  : 1,
    limit: searchParams["limit"] ? Number(searchParams["limit"]) : 20,
  });

  if (!filterResult.success) {
    return NextResponse.json(
      apiError("INVALID_PARAMS", "Parámetros inválidos", formatZodError(filterResult.error)),
      { status: 400 }
    );
  }

  const { status, riskLevel, searchQuery, page, limit } = filterResult.data;

  const where = {
    psychologistId: userId,
    ...(status    ? { status }           : {}),
    ...(riskLevel ? { currentRisk: riskLevel } : {}),
  };

  const [rawPatients, total] = await Promise.all([
    db.patient.findMany({
      where,
      orderBy: [
        { currentRisk: "desc" },
        { lastSessionAt: "desc" },
      ],
      take:  limit,
      skip:  (page - 1) * limit,
      select: {
        id: true, shortId: true, isAnonymized: true,
        firstName: true, lastName: true, dateOfBirth: true,
        status: true, currentRisk: true, therapyModality: true,
        totalSessions: true, lastSessionAt: true, nextSessionAt: true,
        consentGiven: true, createdAt: true,
      },
    }),
    db.patient.count({ where }),
  ]);

  const patients: PatientPublic[] = rawPatients.map((p) => {
    let displayName = `Anon. P-${p.shortId}`;
    let initials    = "??";
    let ageYears: number | undefined;

    if (!p.isAnonymized) {
      try {
        const decrypted = decryptPatientPII({
          firstName:   p.firstName,
          lastName:    p.lastName,
          dateOfBirth: p.dateOfBirth,
        });

        displayName = `${decrypted.firstName} ${decrypted.lastName.charAt(0)}.`;
        initials    = `${decrypted.firstName.charAt(0)}${decrypted.lastName.charAt(0)}`.toUpperCase();

        const birthYear = new Date(decrypted.dateOfBirth).getFullYear();
        ageYears = new Date().getFullYear() - birthYear;
      } catch {
        patientLogger.error({ patientId: p.id }, "Failed to decrypt patient PII");
        displayName = `P-${p.shortId}`;
        initials    = "??";
      }
    }

    return {
      id:              p.id,
      shortId:         p.shortId,
      psychologistId:  userId,
      isAnonymized:    p.isAnonymized,
      displayName,
      initials,
      ageYears,
      status:          p.status as PatientPublic["status"],
      currentRisk:     p.currentRisk as PatientPublic["currentRisk"],
      therapyModality: p.therapyModality as PatientPublic["therapyModality"],
      diagnosisCodes:  [],
      totalSessions:   p.totalSessions,
      lastSessionAt:   p.lastSessionAt?.toISOString(),
      nextSessionAt:   p.nextSessionAt?.toISOString(),
      consentGiven:    p.consentGiven,
      retentionYears:  5,
      createdAt:       p.createdAt.toISOString(),
      updatedAt:       p.createdAt.toISOString(),
    };
  });

  const filtered = searchQuery
    ? patients.filter((p) =>
        p.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.shortId.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : patients;

  await writeAudit({
    psychologistId: userId,
    action:         "patient.view",
    resourceType:   "patient",
    ...extractRequestContext(request),
    metadata:       { count: filtered.length, filters: filterResult.data },
  });

  return NextResponse.json(
    apiSuccess({
      items:      filtered,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      hasMore:    page * limit < total,
    })
  );
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(apiError("UNAUTHORIZED", "No autenticado"), { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(apiError("INVALID_JSON", "Body inválido"), { status: 400 });
  }

  const bodyResult = CreatePatientSchema.safeParse(rawBody);
  if (!bodyResult.success) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Datos inválidos", formatZodError(bodyResult.error)),
      { status: 422 }
    );
  }

  const input = bodyResult.data;

  if (!input.consentGiven) {
    return NextResponse.json(
      apiError("CONSENT_REQUIRED", "El consentimiento del paciente es obligatorio (RGPD)"),
      { status: 422 }
    );
  }

  const encrypted = encryptPatientPII({
    firstName:      input.firstName,
    lastName:       input.lastName,
    dateOfBirth:    input.dateOfBirth,
    email:          input.contact?.email,
    phone:          input.contact?.phone,
    emergencyName:  input.contact?.emergencyName,
    emergencyPhone: input.contact?.emergencyPhone,
  });

  const shortId          = generateShortId();
  const dataRetentionUntil = addYears(new Date(), input.retentionYears);

  const patient = await db.patient.create({
    data: {
      psychologistId:  userId,
      shortId,
      firstName:       encrypted.firstName,
      lastName:        encrypted.lastName,
      dateOfBirth:     encrypted.dateOfBirth,
      email:           encrypted.email,
      phone:           encrypted.phone,
      emergencyName:   encrypted.emergencyName,
      emergencyPhone:  encrypted.emergencyPhone,
      status:          input.status,
      therapyModality: input.therapyModality,
      diagnosisCodes:  input.diagnosisCodes,
      isAnonymized:    input.isAnonymized,
      consentGiven:    input.consentGiven,
      consentDate:     new Date(),
      dataRetentionUntil,
      retentionYears:  input.retentionYears,
      currentRisk:     "none",
    },
    select: { id: true, shortId: true },
  });

  await writeAudit({
    psychologistId: userId,
    action:         "patient.create",
    resourceType:   "patient",
    resourceId:     patient.id,
    ...extractRequestContext(request),
  });

  patientLogger.info({ patientId: patient.id, psychologistId: userId }, "Patient created");

  return NextResponse.json(
    apiSuccess({ id: patient.id, shortId: patient.shortId }),
    { status: 201 }
  );
}

export type GetPatientsResponse = ReturnType<typeof apiSuccess<{
  items:      PatientPublic[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
  hasMore:    boolean;
}>>;

const GetPatientsResponseSchema = z.object({
  success:   z.literal(true),
  data: z.object({
    items:      z.array(z.unknown()),
    total:      z.number(),
    page:       z.number(),
    limit:      z.number(),
    totalPages: z.number(),
    hasMore:    z.boolean(),
  }),
  timestamp: z.string(),
});
