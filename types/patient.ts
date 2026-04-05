/**
 * types/patient.ts
 *
 * Tipos base del paciente con cumplimiento RGPD:
 * - Todos los campos PII se marcan explícitamente
 * - Auto-anonimización: campo `isAnonymized` + prefijo P-XXX
 * - `encryptedFields` marca qué columnas están cifradas con AES-256 en DB
 * - Alertas de riesgo: tipo dedicado, nunca opcional en el modelo
 */

import { z } from "zod";

// ─── Enums ────────────────────────────────────────────────────────────────

export const PatientStatusSchema = z.enum([
  "active",    // Paciente con sesiones regulares
  "paused",    // Tratamiento pausado temporalmente
  "discharged",// Alta clínica
  "archived",  // Archivado por retención de datos (RGPD)
]);

export type PatientStatus = z.infer<typeof PatientStatusSchema>;

export const RiskLevelSchema = z.enum([
  "none",     // Sin indicadores de riesgo
  "low",      // Factores de riesgo presentes pero manejables
  "moderate", // Requiere seguimiento próxima sesión
  "high",     // Requiere contacto antes de próxima sesión
  "critical", // Ideación activa — protocolo de crisis inmediato
]);

export type RiskLevel = z.infer<typeof RiskLevelSchema>;

export const TherapyModalitySchema = z.enum([
  "TCC",   // Terapia Cognitivo-Conductual
  "ACT",   // Acceptance and Commitment Therapy
  "DBT",   // Dialectical Behavior Therapy
  "EMDR",  // Eye Movement Desensitization and Reprocessing
  "psico", // Psicoanálisis / Psicodinámica
  "other",
]);

export type TherapyModality = z.infer<typeof TherapyModalitySchema>;

// ─── Risk Alert ───────────────────────────────────────────────────────────
// REGLA: Las alertas de riesgo NUNCA se ocultan. UI: color #a83836, z-70.

export const RiskAlertSchema = z.object({
  id:          z.string().uuid(),
  patientId:   z.string().uuid(),
  sessionId:   z.string().uuid().optional(),
  level:       RiskLevelSchema,
  type: z.enum([
    "suicidal_ideation",    // Ideación suicida
    "self_harm",            // Autolesiones
    "harm_to_others",       // Riesgo para terceros
    "acute_psychosis",      // Episodio psicótico agudo
    "substance_crisis",     // Crisis por sustancias
    "eating_disorder",      // Crisis trastorno alimentario
    "other",
  ]),
  detectedAt:     z.string().datetime(),
  acknowledgedAt: z.string().datetime().optional(), // null = sin revisar
  acknowledgedBy: z.string().optional(),            // userId del psicólogo
  notes:          z.string().max(1000).optional(),
  autoDetected:   z.boolean(), // true = detectado por IA, false = manual
  keywords:       z.array(z.string()).max(20), // palabras clave que lo activaron
});

export type RiskAlert = z.infer<typeof RiskAlertSchema>;

// ─── Contact (PII — cifrado AES-256) ─────────────────────────────────────

export const PatientContactSchema = z.object({
  // ⚠️ CAMPOS PII — almacenados cifrados en DB con AES-256
  email:          z.string().email().optional(),
  phone:          z.string().max(20).optional(),
  emergencyName:  z.string().max(100).optional(),
  emergencyPhone: z.string().max(20).optional(),
});

export type PatientContact = z.infer<typeof PatientContactSchema>;

// ─── Patient base schema ──────────────────────────────────────────────────

export const PatientSchema = z.object({
  id:             z.string().uuid(),
  psychologistId: z.string(), // Clerk user ID

  // ── Identidad (PII — cifrado AES-256) ──────────────────────────────────
  // Si isAnonymized=true, displayName = "Anon. P-{shortId}"
  firstName:      z.string().min(1).max(100),
  lastName:       z.string().min(1).max(100),
  dateOfBirth:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  contact:        PatientContactSchema,

  // ── Identificadores ────────────────────────────────────────────────────
  shortId:        z.string().length(6), // P-XXXXXX para referencias anónimas
  isAnonymized:   z.boolean().default(false),

  // ── Estado clínico ─────────────────────────────────────────────────────
  status:         PatientStatusSchema,
  currentRisk:    RiskLevelSchema,
  therapyModality: TherapyModalitySchema,
  diagnosisCodes:  z.array(z.string().max(10)).max(10), // CIE-10 / DSM-5
  therapistNotes:  z.string().max(5000).optional(), // Notas privadas (cifradas)

  // ── Sesiones ────────────────────────────────────────────────────────────
  totalSessions:  z.number().int().nonnegative(),
  lastSessionAt:  z.string().datetime().optional(),
  nextSessionAt:  z.string().datetime().optional(),

  // ── RGPD ────────────────────────────────────────────────────────────────
  consentGiven:   z.boolean(),
  consentDate:    z.string().datetime().optional(),
  dataRetentionUntil: z.string().datetime().optional(), // Auto-calculado
  retentionYears: z.number().int().min(1).max(10).default(5),

  // ── Timestamps ──────────────────────────────────────────────────────────
  createdAt:      z.string().datetime(),
  updatedAt:      z.string().datetime(),
  archivedAt:     z.string().datetime().optional(),
});

export type Patient = z.infer<typeof PatientSchema>;

// ─── Versión pública — SIN datos PII ─────────────────────────────────────
// Se usa en listas y búsquedas. Los campos PII se omiten o enmascaran.

export const PatientPublicSchema = PatientSchema.omit({
  firstName:      true,
  lastName:       true,
  dateOfBirth:    true,
  contact:        true,
  therapistNotes: true,
  diagnosisCodes: true,
}).extend({
  displayName: z.string(), // "María G." | "Anon. P-A4F3B2"
  initials:    z.string(), // "MG" | "??"
  ageYears:    z.number().int().nonnegative().optional(),
});

export type PatientPublic = z.infer<typeof PatientPublicSchema>;

// ─── Create / Update schemas (validación en API routes) ──────────────────

export const CreatePatientSchema = PatientSchema.omit({
  id:            true,
  psychologistId:true,
  shortId:       true,
  totalSessions: true,
  lastSessionAt: true,
  currentRisk:   true,
  createdAt:     true,
  updatedAt:     true,
  archivedAt:    true,
  dataRetentionUntil: true,
}).extend({
  status:          PatientStatusSchema.default("active"),
  therapyModality: TherapyModalitySchema,
  isAnonymized:    z.boolean().default(false),
  consentGiven:    z.boolean(),
  retentionYears:  z.number().int().min(1).max(10).default(5),
  diagnosisCodes:  z.array(z.string().max(10)).max(10).default([]),
});

export type CreatePatientInput = z.infer<typeof CreatePatientSchema>;

export const UpdatePatientSchema = CreatePatientSchema.partial().omit({
  consentGiven: true, // El consentimiento no puede revertirse vía update
});

export type UpdatePatientInput = z.infer<typeof UpdatePatientSchema>;

// ─── Search / Filter ──────────────────────────────────────────────────────

export const PatientFilterSchema = z.object({
  status:      PatientStatusSchema.optional(),
  riskLevel:   RiskLevelSchema.optional(),
  modality:    TherapyModalitySchema.optional(),
  searchQuery: z.string().max(100).optional(),
  page:        z.number().int().positive().default(1),
  limit:       z.number().int().min(1).max(50).default(20),
});

export type PatientFilter = z.infer<typeof PatientFilterSchema>;

// ─── Helpers de tipo ──────────────────────────────────────────────────────

export function isHighRisk(patient: Pick<Patient, "currentRisk">): boolean {
  return (
    patient.currentRisk === "high" ||
    patient.currentRisk === "critical"
  );
}

export function getDisplayName(
  patient: Pick<Patient, "firstName" | "lastName" | "isAnonymized" | "shortId">
): string {
  if (patient.isAnonymized) {
    return `Anon. P-${patient.shortId}`;
  }
  return `${patient.firstName} ${patient.lastName.charAt(0)}.`;
}

export function getInitials(
  patient: Pick<Patient, "firstName" | "lastName" | "isAnonymized">
): string {
  if (patient.isAnonymized) return "??";
  return `${patient.firstName.charAt(0)}${patient.lastName.charAt(0)}`.toUpperCase();
}
