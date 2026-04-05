/**
 * types/session.ts
 *
 * Tipos de sesión clínica:
 * - AudioState: ciclo de vida del audio con Privacidad Flash
 * - Transcription: resultado de Whisper + pyannote (diarización speaker)
 * - SessionStatus: estados del flujo grabación → transcripción → nota
 *
 * PRIVACIDAD FLASH: el audio se elimina del servidor inmediatamente
 * tras completar la transcripción. `audioDeletedAt` NUNCA debe ser null
 * en sesiones con estado "transcribed" o posterior.
 */

import { z } from "zod";
import { RiskLevelSchema } from "./patient";

// ─── Enums ────────────────────────────────────────────────────────────────

export const SessionStatusSchema = z.enum([
  "scheduled",     // Sesión en agenda, sin empezar
  "recording",     // Grabación de audio en curso
  "processing",    // Audio subido, transcribiendo con Whisper
  "transcribed",   // Transcripción lista (audio ELIMINADO)
  "generating",    // Claude generando nota clínica
  "draft",         // Nota generada, pendiente de revisión del psicólogo
  "reviewed",      // Psicólogo revisó la nota
  "signed",        // Nota firmada / finalizada
  "cancelled",     // Sesión cancelada
]);

export type SessionStatus = z.infer<typeof SessionStatusSchema>;

export const NoteFormatSchema = z.enum([
  "SOAP",  // Subjective, Objective, Assessment, Plan
  "DAP",   // Data, Assessment, Plan
  "BIRP",  // Behavior, Intervention, Response, Plan
  "GIRP",  // Goals, Intervention, Response, Plan
  "free",  // Nota libre sin estructura fija
]);

export type NoteFormat = z.infer<typeof NoteFormatSchema>;

export const SpeakerRoleSchema = z.enum([
  "psychologist", // Psicólogo/a
  "patient",      // Paciente
  "unknown",      // pyannote no pudo determinar
]);

export type SpeakerRole = z.infer<typeof SpeakerRoleSchema>;

// ─── Transcripción ────────────────────────────────────────────────────────

export const TranscriptionSegmentSchema = z.object({
  id:         z.number().int().nonnegative(),
  start:      z.number().nonnegative(), // segundos
  end:        z.number().nonnegative(),
  text:       z.string(),
  speaker:    SpeakerRoleSchema,
  speakerId:  z.string(), // "SPEAKER_00", "SPEAKER_01" — de pyannote
  confidence: z.number().min(0).max(1), // confianza del modelo Whisper
  language:   z.string().length(2),     // ISO 639-1 (es, en, ca...)
});

export type TranscriptionSegment = z.infer<typeof TranscriptionSegmentSchema>;

export const TranscriptionSchema = z.object({
  id:               z.string().uuid(),
  sessionId:        z.string().uuid(),
  segments:         z.array(TranscriptionSegmentSchema),
  fullText:         z.string(),        // Transcripción completa sin diarización
  diarizedText:     z.string(),        // Con etiquetas [Psicólogo:] [Paciente:]
  language:         z.string().length(2),
  durationSeconds:  z.number().nonnegative(),
  wordCount:        z.number().int().nonnegative(),
  speakerCount:     z.number().int().min(1).max(4),
  whisperModel:     z.string(),         // e.g. "whisper-1"
  processingMs:     z.number().int().nonnegative(),
  // RGPD: texto auto-anonimizado (nombres reemplazados por [NOMBRE])
  isAnonymized:     z.boolean(),
  anonymizedAt:     z.string().datetime().optional(),
  createdAt:        z.string().datetime(),
});

export type Transcription = z.infer<typeof TranscriptionSchema>;

// ─── Session ──────────────────────────────────────────────────────────────

export const SessionSchema = z.object({
  id:             z.string().uuid(),
  patientId:      z.string().uuid(),
  psychologistId: z.string(), // Clerk user ID
  sessionNumber:  z.number().int().positive(), // Sesión #N del paciente

  // ── Estado y formato ────────────────────────────────────────────────────
  status:         SessionStatusSchema,
  noteFormat:     NoteFormatSchema,

  // ── Agenda ──────────────────────────────────────────────────────────────
  scheduledAt:    z.string().datetime(),
  startedAt:      z.string().datetime().optional(),
  endedAt:        z.string().datetime().optional(),
  durationMinutes: z.number().int().positive().optional(),

  // ── Audio — PRIVACIDAD FLASH ─────────────────────────────────────────────
  audioStorageKey:    z.string().optional(),
  audioDurationSeconds: z.number().nonnegative().optional(),
  audioSizeBytes:     z.number().int().nonnegative().optional(),
  audioMimeType:      z.enum(["audio/webm", "audio/ogg", "audio/wav", "audio/mp4"]).optional(),
  audioDeletedAt:     z.string().datetime().optional(), // PRIVACIDAD FLASH

  // ── Transcripción ────────────────────────────────────────────────────────
  transcriptionId:    z.string().uuid().optional(),

  // ── Nota clínica ─────────────────────────────────────────────────────────
  noteId:             z.string().uuid().optional(),

  // ── Riesgo detectado ─────────────────────────────────────────────────────
  detectedRiskLevel:  RiskLevelSchema,
  riskAlertIds:       z.array(z.string().uuid()),

  // ── Metadatos clínicos ───────────────────────────────────────────────────
  therapistObservations: z.string().max(2000).optional(),
  followUpRequired:   z.boolean().default(false),
  followUpNotes:      z.string().max(500).optional(),

  // ── RGPD ────────────────────────────────────────────────────────────────
  isAnonymized:       z.boolean().default(false),
  consentRecorded:    z.boolean(), // El paciente consintió la grabación

  // ── Timestamps ──────────────────────────────────────────────────────────
  createdAt:          z.string().datetime(),
  updatedAt:          z.string().datetime(),
});

export type Session = z.infer<typeof SessionSchema>;

// ─── Create / Update schemas ──────────────────────────────────────────────

export const CreateSessionSchema = SessionSchema.omit({
  id:             true,
  psychologistId: true,
  sessionNumber:  true,
  status:         true,
  startedAt:      true,
  endedAt:        true,
  durationMinutes:true,
  audioStorageKey:true,
  audioDurationSeconds: true,
  audioSizeBytes: true,
  audioMimeType:  true,
  audioDeletedAt: true,
  transcriptionId:true,
  noteId:         true,
  detectedRiskLevel: true,
  riskAlertIds:   true,
  createdAt:      true,
  updatedAt:      true,
}).extend({
  noteFormat:      NoteFormatSchema.default("SOAP"),
  followUpRequired: z.boolean().default(false),
  consentRecorded:  z.boolean(),
});

export type CreateSessionInput = z.infer<typeof CreateSessionSchema>;

// ─── Session list item — versión ligera para listas/agenda ───────────────

export const SessionListItemSchema = z.object({
  id:             z.string().uuid(),
  patientId:      z.string().uuid(),
  patientName:    z.string(), // displayName del paciente
  sessionNumber:  z.number().int().positive(),
  status:         SessionStatusSchema,
  noteFormat:     NoteFormatSchema,
  scheduledAt:    z.string().datetime(),
  durationMinutes: z.number().int().positive().optional(),
  detectedRiskLevel: RiskLevelSchema,
  hasNote:        z.boolean(),
  noteFormat_:    NoteFormatSchema.optional(),
});

export type SessionListItem = z.infer<typeof SessionListItemSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────

/** El audio debe haberse eliminado para sesiones en estado transcribed o posterior */
export function assertAudioDeleted(session: Pick<Session, "status" | "audioDeletedAt">): void {
  const requiresDeletion: SessionStatus[] = [
    "transcribed", "generating", "draft", "reviewed", "signed",
  ];
  if (requiresDeletion.includes(session.status) && !session.audioDeletedAt) {
    throw new Error(
      `PRIVACY VIOLATION: Session status is "${session.status}" but audioDeletedAt is null. ` +
      "Audio must be deleted after transcription (Flash Privacy rule)."
    );
  }
}

export function isSessionActive(session: Pick<Session, "status">): boolean {
  return session.status === "recording" || session.status === "processing";
}

export function canGenerateNote(session: Pick<Session, "status" | "transcriptionId">): boolean {
  return session.status === "transcribed" && session.transcriptionId != null;
}
