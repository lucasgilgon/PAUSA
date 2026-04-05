/**
 * lib/audit.ts
 *
 * Registro de auditoría RGPD (Art. 30).
 */

import { db } from "@/lib/db";
import { securityLogger } from "@/lib/logger";
import type { AuditAction } from "@/types";

interface WriteAuditInput {
  psychologistId: string;
  action:         AuditAction;
  resourceType:   "patient" | "session" | "note" | "auth" | "settings" | "rgpd";
  resourceId?:    string;
  ipAddress?:     string;
  userAgent?:     string;
  metadata?:      Record<string, unknown>;
  success?:       boolean;
  errorCode?:     string;
}

const ACTION_MAP: Record<AuditAction, string> = {
  "patient.view":               "patient_view",
  "patient.create":             "patient_create",
  "patient.update":             "patient_update",
  "patient.delete":             "patient_delete",
  "patient.export":             "patient_export",
  "session.create":             "session_create",
  "session.recording.start":   "session_recording_start",
  "session.recording.stop":    "session_recording_stop",
  "session.audio.delete":      "session_audio_delete",
  "session.transcription.view":"session_note_view",
  "session.note.view":         "session_note_view",
  "session.note.edit":         "session_note_edit",
  "session.note.sign":         "session_note_sign",
  "session.note.export":       "session_note_export",
  "auth.login":                "auth_login",
  "auth.logout":               "auth_logout",
  "auth.2fa.enable":           "auth_2fa_enable",
  "auth.2fa.verify":           "auth_2fa_verify",
  "auth.session.timeout":      "auth_session_timeout",
  "settings.security.update":  "settings_security_update",
  "settings.key.rotation":     "settings_key_rotation",
  "rgpd.consent.record":       "rgpd_consent_record",
  "rgpd.data.export":          "rgpd_data_export",
  "rgpd.data.delete":          "rgpd_data_delete",
  "rgpd.anonymize":            "rgpd_anonymize",
};

export async function writeAudit(input: WriteAuditInput): Promise<void> {
  const {
    psychologistId,
    action,
    resourceType,
    resourceId,
    ipAddress,
    userAgent,
    metadata,
    success = true,
    errorCode,
  } = input;

  try {
    await db.auditLog.create({
      data: {
        psychologistId,
        action:       ACTION_MAP[action] as never,
        resourceType,
        resourceId,
        ipAddress,
        userAgent,
        metadata:     metadata ? JSON.parse(JSON.stringify(metadata)) : undefined,
        success,
        errorCode,
      },
    });
  } catch (err) {
    securityLogger.error(
      { err, action, psychologistId },
      "Failed to write audit log — non-fatal"
    );
  }
}

export function extractRequestContext(request: Request): {
  ipAddress: string | undefined;
  userAgent: string | undefined;
} {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    undefined;

  const maskedIp = ip
    ? ip.replace(/(\d+\.\d+)\.\d+\.\d+$/, "$1.xxx.xxx")
    : undefined;

  return {
    ipAddress: maskedIp,
    userAgent: request.headers.get("user-agent") ?? undefined,
  };
}
