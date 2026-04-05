/**
 * app/api/security/route.ts
 *
 * GET   /api/security — SecuritySettings + ComplianceStatus
 * PATCH /api/security — Actualiza configuración de seguridad
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db }             from "@/lib/db";
import { securityLogger } from "@/lib/logger";
import { writeAudit, extractRequestContext } from "@/lib/audit";
import { apiSuccess, apiError, formatZodError } from "@/lib/utils";
import { UpdateSecuritySettingsSchema, type ComplianceStatus, type ComplianceItem } from "@/types";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(apiError("UNAUTHORIZED", "No autenticado"), { status: 401 });
  }

  let settings = await db.securitySettings.findUnique({
    where: { psychologistId: userId },
  });

  if (!settings) {
    settings = await db.securitySettings.create({
      data: { psychologistId: userId },
    });
  }

  const compliance = computeComplianceStatus(settings);

  return NextResponse.json(apiSuccess({ settings, compliance }));
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
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

  const bodyResult = UpdateSecuritySettingsSchema.safeParse(rawBody);
  if (!bodyResult.success) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Datos inválidos", formatZodError(bodyResult.error)),
      { status: 422 }
    );
  }

  const updated = await db.securitySettings.upsert({
    where:  { psychologistId: userId },
    create: { psychologistId: userId, ...bodyResult.data },
    update: bodyResult.data,
  });

  await writeAudit({
    psychologistId: userId,
    action:         "settings.security.update",
    resourceType:   "settings",
    ...extractRequestContext(request),
    metadata:       { changedFields: Object.keys(bodyResult.data) },
  });

  securityLogger.info({ userId, fields: Object.keys(bodyResult.data) }, "Security settings updated");

  const compliance = computeComplianceStatus(updated);

  return NextResponse.json(apiSuccess({ settings: updated, compliance }));
}

function computeComplianceStatus(
  settings: Awaited<ReturnType<typeof db.securitySettings.findUniqueOrThrow>>
): ComplianceStatus {
  const items: ComplianceItem[] = [];
  let score = 0;

  items.push({ id: "encryption", label: "Cifrado AES-256-GCM", status: "ok", description: "Todos los datos PII están cifrados en reposo." });
  score += 20;

  if (settings.twoFactorEnabled) {
    items.push({ id: "2fa", label: "Autenticación 2FA", status: "ok", description: "Doble factor de autenticación activo." });
    score += 15;
  } else {
    items.push({ id: "2fa", label: "Autenticación 2FA", status: "warning", description: "Recomendado para proteger el acceso a datos sensibles.", actionLabel: "Activar 2FA", actionUrl: "/security?action=enable-2fa" });
  }

  if (settings.flashPrivacyEnabled) {
    items.push({ id: "flash-privacy", label: "Privacidad Flash (audio)", status: "ok", description: "Los archivos de audio se eliminan tras la transcripción." });
    score += 15;
  } else {
    items.push({ id: "flash-privacy", label: "Privacidad Flash (audio)", status: "error", description: "Los archivos de audio se están reteniendo en el servidor.", actionLabel: "Activar", actionUrl: "/security" });
  }

  if (settings.autoAnonymizeTranscriptions) {
    items.push({ id: "anonymization", label: "Auto-anonimización", status: "ok", description: "Los nombres en transcripciones se reemplazan automáticamente." });
    score += 10;
  } else {
    items.push({ id: "anonymization", label: "Auto-anonimización", status: "warning", description: "Las transcripciones pueden contener nombres de pacientes.", actionLabel: "Activar" });
  }

  if (settings.dpaSignedWithAnthropic) {
    items.push({ id: "dpa", label: "DPA con proveedor IA", status: "ok", description: `Acuerdo firmado${settings.dpaVersion ? ` (v${settings.dpaVersion})` : ""}.` });
    score += 20;
  } else {
    items.push({ id: "dpa", label: "DPA con proveedor IA", status: "error", description: "Acuerdo de procesador de datos requerido por RGPD Art. 28.", actionLabel: "Firmar DPA", actionUrl: "/security?action=sign-dpa" });
  }

  if (settings.autoDeleteEnabled) {
    items.push({ id: "retention", label: "Retención automática", status: "ok", description: `Datos eliminados automáticamente tras ${settings.dataRetentionYears} años.` });
    score += 10;
  } else {
    items.push({ id: "retention", label: "Retención de datos", status: "warning", description: `La eliminación automática está desactivada (RGPD Art. 5.1.e).`, actionLabel: "Configurar" });
  }

  if (settings.sessionTimeoutMinutes <= 30) {
    items.push({ id: "session-timeout", label: "Cierre automático de sesión", status: "ok", description: `Sesión se cierra tras ${settings.sessionTimeoutMinutes} min de inactividad.` });
    score += 10;
  } else {
    items.push({ id: "session-timeout", label: "Cierre automático de sesión", status: "warning", description: "Timeout superior a 30 minutos. Recomendado ≤ 30 min." });
  }

  const level: ComplianceStatus["level"] =
    score >= 85 ? "compliant" :
    score >= 60 ? "partial" :
    "non_compliant";

  return {
    score:         Math.min(100, score),
    level,
    items,
    lastCheckedAt: new Date().toISOString(),
  };
}
