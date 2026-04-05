/**
 * types/security.ts
 */

import { z } from "zod";

export const SecuritySettingsSchema = z.object({
  psychologistId:  z.string(),

  twoFactorEnabled:     z.boolean().default(false),
  twoFactorMethod:      z.enum(["totp", "sms", "email"]).optional(),
  sessionTimeoutMinutes: z.number().int().min(5).max(480).default(30),
  allowedIpRanges:      z.array(z.string()).max(10).default([]),

  flashPrivacyEnabled:  z.boolean().default(true),

  autoAnonymizeTranscriptions: z.boolean().default(true),
  anonymizePatientNames:       z.boolean().default(true),
  anonymizeDates:              z.boolean().default(false),
  anonymizeLocations:          z.boolean().default(false),

  dataRetentionYears:       z.number().int().min(1).max(10).default(5),
  autoDeleteEnabled:        z.boolean().default(false),
  autoDeleteNotifyDays:     z.number().int().min(7).max(90).default(30),

  encryptionEnabled:    z.literal(true).default(true),
  encryptionAlgorithm:  z.literal("AES-256-GCM").default("AES-256-GCM"),
  keyRotationDays:      z.number().int().min(30).max(365).default(90),
  lastKeyRotationAt:    z.string().datetime().optional(),

  dpaSignedWithAnthropic: z.boolean().default(false),
  dpaSignedAt:            z.string().datetime().optional(),
  dpaVersion:             z.string().optional(),

  dataProtectionOfficer:  z.string().email().optional(),
  supervisoryAuthority:   z.string().optional(),
  privacyPolicyVersion:   z.string().optional(),
  lastPrivacyReviewAt:    z.string().datetime().optional(),

  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type SecuritySettings = z.infer<typeof SecuritySettingsSchema>;

export const UpdateSecuritySettingsSchema = SecuritySettingsSchema
  .omit({
    psychologistId:      true,
    encryptionEnabled:   true,
    encryptionAlgorithm: true,
    createdAt:           true,
    updatedAt:           true,
  })
  .partial();

export type UpdateSecuritySettingsInput = z.infer<typeof UpdateSecuritySettingsSchema>;

export const ComplianceItemSchema = z.object({
  id:          z.string(),
  label:       z.string(),
  status:      z.enum(["ok", "warning", "error", "info"]),
  description: z.string(),
  actionLabel: z.string().optional(),
  actionUrl:   z.string().optional(),
});

export type ComplianceItem = z.infer<typeof ComplianceItemSchema>;

export const ComplianceStatusSchema = z.object({
  score:        z.number().int().min(0).max(100),
  level:        z.enum(["compliant", "partial", "non_compliant"]),
  items:        z.array(ComplianceItemSchema),
  lastCheckedAt: z.string().datetime(),
});

export type ComplianceStatus = z.infer<typeof ComplianceStatusSchema>;

export const AuditActionSchema = z.enum([
  "patient.view",
  "patient.create",
  "patient.update",
  "patient.delete",
  "patient.export",
  "session.create",
  "session.recording.start",
  "session.recording.stop",
  "session.audio.delete",
  "session.transcription.view",
  "session.note.view",
  "session.note.edit",
  "session.note.sign",
  "session.note.export",
  "auth.login",
  "auth.logout",
  "auth.2fa.enable",
  "auth.2fa.verify",
  "auth.session.timeout",
  "settings.security.update",
  "settings.key.rotation",
  "rgpd.consent.record",
  "rgpd.data.export",
  "rgpd.data.delete",
  "rgpd.anonymize",
]);

export type AuditAction = z.infer<typeof AuditActionSchema>;

export const AuditLogSchema = z.object({
  id:             z.string().uuid(),
  psychologistId: z.string(),
  action:         AuditActionSchema,
  resourceType:   z.enum(["patient", "session", "note", "auth", "settings", "rgpd"]),
  resourceId:     z.string().optional(),
  ipAddress:      z.string().optional(),
  userAgent:      z.string().optional(),
  metadata:       z.record(z.unknown()).optional(),
  success:        z.boolean(),
  errorCode:      z.string().optional(),
  createdAt:      z.string().datetime(),
});

export type AuditLog = z.infer<typeof AuditLogSchema>;

export const GetComplianceResponseSchema = z.object({
  compliance: ComplianceStatusSchema,
  settings:   SecuritySettingsSchema,
});

export type GetComplianceResponse = z.infer<typeof GetComplianceResponseSchema>;
