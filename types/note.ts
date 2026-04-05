/**
 * types/note.ts
 *
 * Tipos de notas clínicas SOAP / DAP / BIRP / GIRP:
 * - Estructura tipada por formato
 * - Metadatos de generación IA (Claude)
 * - Historial de ediciones (auditoría clínica)
 * - Detección de riesgo en nota: palabras clave + nivel
 */

import { z } from "zod";
import { NoteFormatSchema } from "./session";
import { RiskLevelSchema } from "./patient";

// ─── SOAP Note ────────────────────────────────────────────────────────────

export const SOAPNoteSchema = z.object({
  format:     z.literal("SOAP"),
  subjective: z.string().min(1).max(3000),
  objective:  z.string().min(1).max(3000),
  assessment: z.string().min(1).max(3000),
  plan:       z.string().min(1).max(3000),
});

export type SOAPNote = z.infer<typeof SOAPNoteSchema>;

// ─── DAP Note ────────────────────────────────────────────────────────────

export const DAPNoteSchema = z.object({
  format:     z.literal("DAP"),
  data:       z.string().min(1).max(3000),
  assessment: z.string().min(1).max(3000),
  plan:       z.string().min(1).max(3000),
});

export type DAPNote = z.infer<typeof DAPNoteSchema>;

// ─── BIRP Note ────────────────────────────────────────────────────────────

export const BIRPNoteSchema = z.object({
  format:       z.literal("BIRP"),
  behavior:     z.string().min(1).max(3000),
  intervention: z.string().min(1).max(3000),
  response:     z.string().min(1).max(3000),
  plan:         z.string().min(1).max(3000),
});

export type BIRPNote = z.infer<typeof BIRPNoteSchema>;

// ─── GIRP Note ────────────────────────────────────────────────────────────

export const GIRPNoteSchema = z.object({
  format:       z.literal("GIRP"),
  goals:        z.string().min(1).max(3000),
  intervention: z.string().min(1).max(3000),
  response:     z.string().min(1).max(3000),
  plan:         z.string().min(1).max(3000),
});

export type GIRPNote = z.infer<typeof GIRPNoteSchema>;

// ─── Free Note ────────────────────────────────────────────────────────────

export const FreeNoteSchema = z.object({
  format:  z.literal("free"),
  content: z.string().min(1).max(10000),
});

export type FreeNote = z.infer<typeof FreeNoteSchema>;

// ─── Union discriminada ───────────────────────────────────────────────────

export const NoteContentSchema = z.discriminatedUnion("format", [
  SOAPNoteSchema,
  DAPNoteSchema,
  BIRPNoteSchema,
  GIRPNoteSchema,
  FreeNoteSchema,
]);

export type NoteContent = z.infer<typeof NoteContentSchema>;

// ─── AI Generation Metadata ───────────────────────────────────────────────

export const AIGenerationMetaSchema = z.object({
  model:            z.string(),
  promptTokens:     z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  totalTokens:      z.number().int().nonnegative(),
  latencyMs:        z.number().int().nonnegative(),
  generatedAt:      z.string().datetime(),
  confidence:       z.number().min(0).max(1),
  riskSignals: z.array(z.object({
    keyword:  z.string(),
    context:  z.string().max(200),
    severity: RiskLevelSchema,
  })).max(20),
});

export type AIGenerationMeta = z.infer<typeof AIGenerationMetaSchema>;

// ─── Edit History (auditoría) ─────────────────────────────────────────────

export const NoteEditSchema = z.object({
  id:          z.string().uuid(),
  noteId:      z.string().uuid(),
  editedBy:    z.string(),
  editedAt:    z.string().datetime(),
  fieldChanged: z.string(),
  previousValue: z.string().max(3000),
  newValue:    z.string().max(3000),
  reason:      z.string().max(500).optional(),
});

export type NoteEdit = z.infer<typeof NoteEditSchema>;

// ─── Note principal ───────────────────────────────────────────────────────

export const NoteSchema = z.object({
  id:             z.string().uuid(),
  sessionId:      z.string().uuid(),
  patientId:      z.string().uuid(),
  psychologistId: z.string(),

  format:         NoteFormatSchema,
  content:        NoteContentSchema,

  status: z.enum([
    "generating",
    "draft",
    "reviewed",
    "signed",
    "rejected",
  ]),

  aiMeta:         AIGenerationMetaSchema.optional(),
  isAIGenerated:  z.boolean(),
  wasEdited:      z.boolean().default(false),
  editHistory:    z.array(NoteEditSchema),

  detectedRiskLevel:  RiskLevelSchema,
  riskAlertCreated:   z.boolean().default(false),

  isAnonymized:   z.boolean().default(false),

  createdAt:      z.string().datetime(),
  updatedAt:      z.string().datetime(),
  signedAt:       z.string().datetime().optional(),
  signedBy:       z.string().optional(),
});

export type Note = z.infer<typeof NoteSchema>;

// ─── Schemas de creación / actualización ─────────────────────────────────

export const CreateNoteSchema = z.object({
  sessionId:      z.string().uuid(),
  patientId:      z.string().uuid(),
  format:         NoteFormatSchema,
  content:        NoteContentSchema,
  isAIGenerated:  z.boolean(),
  aiMeta:         AIGenerationMetaSchema.optional(),
});

export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;

export const UpdateNoteSchema = z.object({
  content: NoteContentSchema.optional(),
  status:  z.enum(["draft", "reviewed", "signed", "rejected"]).optional(),
  editReason: z.string().max(500).optional(),
}).refine(data => data.content !== undefined || data.status !== undefined, {
  message: "Debe proporcionarse al menos content o status",
});

export type UpdateNoteInput = z.infer<typeof UpdateNoteSchema>;

// ─── Generate Note Request ────────────────────────────────────────────────

export const GenerateNoteRequestSchema = z.object({
  sessionId:         z.string().uuid(),
  // Fuente de transcripción — una de las dos opciones:
  transcriptionId:   z.string().uuid().optional(),      // Whisper backend (OpenAI)
  transcriptionText: z.string().min(1).max(50000).optional(),  // Web Speech / Voice nativo — GRATIS
  format:            NoteFormatSchema,
  additionalContext: z.string().max(1000).optional(),
  regenerate:        z.boolean().default(false),
}).refine(
  (d) => !!(d.transcriptionId || d.transcriptionText?.trim()),
  { message: "Se requiere transcriptionId o transcriptionText (no puede estar vacío)" }
);

export type GenerateNoteRequest = z.infer<typeof GenerateNoteRequestSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────

export function isNoteImmutable(note: Pick<Note, "status">): boolean {
  return note.status === "signed";
}

export function getNoteSection(note: Note, section: string): string {
  const content = note.content;
  if (content.format === "free") return content.content;
  if (section in content) {
    return (content as Record<string, string>)[section] ?? "";
  }
  return "";
}

export function hasRiskSignals(note: Pick<Note, "detectedRiskLevel">): boolean {
  return (
    note.detectedRiskLevel === "moderate" ||
    note.detectedRiskLevel === "high" ||
    note.detectedRiskLevel === "critical"
  );
}
