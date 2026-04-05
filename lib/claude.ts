/**
 * lib/claude.ts
 *
 * Cliente Claude API para generación de notas clínicas SOAP/DAP/BIRP.
 * Modelo: claude-sonnet-4-6
 */

import Anthropic from "@anthropic-ai/sdk";
import type { NoteFormat, NoteContent, AIGenerationMeta, RiskLevel } from "@/types";
import type { Transcription } from "@/types/session";
import { noteLogger } from "@/lib/logger";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  timeout: 60_000,
  maxRetries: 2,
});

const MODEL = "claude-sonnet-4-6" as const;
const MAX_TOKENS = 4096;

export interface GenerateNoteOptions {
  transcription:     Transcription;
  format:            NoteFormat;
  additionalContext?: string;
  patientContext?: {
    sessionNumber:    number;
    therapyModality:  string;
    diagnosisCodes?:  string[];
    previousNoteSummary?: string;
  };
}

export interface GenerateNoteResult {
  content:  NoteContent;
  meta:     AIGenerationMeta;
  rawText:  string;
}

export interface RiskSignal {
  keyword:  string;
  context:  string;
  severity: RiskLevel;
}

const FORMAT_INSTRUCTIONS: Record<NoteFormat, string> = {
  SOAP: `Genera una nota clínica en formato SOAP con estas secciones exactas:
SUBJECTIVE: Lo que el paciente refiere subjetivamente sobre su estado, síntomas, experiencias y preocupaciones.
OBJECTIVE: Observaciones objetivas del psicólogo: comportamiento, afecto, cognición, apariencia, lenguaje.
ASSESSMENT: Impresión clínica, análisis del progreso terapéutico, hipótesis diagnósticas relevantes.
PLAN: Próximas intervenciones, tareas para el paciente, frecuencia de sesiones, derivaciones si aplica.`,

  DAP: `Genera una nota clínica en formato DAP con estas secciones exactas:
DATA: Información objetiva y subjetiva de la sesión: lo que el paciente dijo y lo que el terapeuta observó.
ASSESSMENT: Interpretación clínica de los datos, progreso hacia objetivos terapéuticos.
PLAN: Intervenciones planificadas, objetivos para la próxima sesión, tareas asignadas.`,

  BIRP: `Genera una nota clínica en formato BIRP con estas secciones exactas:
BEHAVIOR: Comportamiento observable del paciente durante la sesión: verbal, no verbal, afecto.
INTERVENTION: Técnicas e intervenciones terapéuticas aplicadas por el terapeuta.
RESPONSE: Cómo respondió el paciente a las intervenciones durante la sesión.
PLAN: Objetivos y estrategias para próximas sesiones, tareas asignadas.`,

  GIRP: `Genera una nota clínica en formato GIRP con estas secciones exactas:
GOALS: Objetivos terapéuticos abordados en esta sesión.
INTERVENTION: Técnicas e intervenciones terapéuticas aplicadas.
RESPONSE: Respuesta del paciente a las intervenciones.
PLAN: Próximos pasos, tareas, objetivos para siguiente sesión.`,

  free: `Genera una nota clínica libre y completa que documente los aspectos más relevantes de la sesión.`,
};

function buildNotePrompt(opts: GenerateNoteOptions): string {
  const { transcription, format, additionalContext, patientContext } = opts;

  const contextBlock = patientContext
    ? `
CONTEXTO DEL PACIENTE:
- Sesión número: ${patientContext.sessionNumber}
- Modalidad terapéutica: ${patientContext.therapyModality}
${patientContext.diagnosisCodes?.length ? `- Diagnósticos (CIE-10): ${patientContext.diagnosisCodes.join(", ")}` : ""}
${patientContext.previousNoteSummary ? `- Resumen sesión anterior: ${patientContext.previousNoteSummary}` : ""}
`
    : "";

  const additionalBlock = additionalContext
    ? `\nCONTEXTO ADICIONAL DEL TERAPEUTA:\n${additionalContext}\n`
    : "";

  // Nota sobre la fuente de transcripción (Web Speech vs Whisper)
  const isWebSpeech = transcription.whisperModel === "web-speech-api";
  const transcriptionNote = isWebSpeech
    ? `\nNOTA SOBRE LA TRANSCRIPCIÓN: Esta transcripción se obtuvo mediante reconocimiento de voz en tiempo real del navegador (Web Speech API). Es un texto continuo sin separación de hablantes y puede contener pequeños errores de reconocimiento. Interpreta el contenido en contexto clínico e ignora posibles errores de palabras aisladas.\n`
    : "";

  return `Eres un asistente especializado en documentación clínica para psicólogos. Tu tarea es generar notas clínicas precisas, profesionales y en español, basándote en la transcripción de la sesión.

REGLAS ESTRICTAS:
1. Usa solo la información presente en la transcripción. NO inventes datos.
2. Mantén un tono clínico y profesional.
3. Si hay información insuficiente para una sección, escribe "Información no disponible en esta sesión."
4. Los datos del paciente son confidenciales — no uses nombres propios, solo "el/la paciente".
5. Si detectas indicadores de riesgo (ideación suicida, autolesiones, riesgo para terceros), DEBES incluirlos explícitamente en la nota y en el campo RISK_SIGNALS.
${contextBlock}${transcriptionNote}${additionalBlock}
TRANSCRIPCIÓN DE LA SESIÓN${isWebSpeech ? " (texto continuo — reconocimiento de voz)" : " (diarizada)"}:
---
${transcription.diarizedText}
---

${FORMAT_INSTRUCTIONS[format]}

IMPORTANTE — Responde ÚNICAMENTE con JSON válido con esta estructura exacta (sin markdown, sin explicaciones):
{
  "note": {
    ${format === "SOAP" ? `"subjective": "...",\n    "objective": "...",\n    "assessment": "...",\n    "plan": "..."` : ""}
    ${format === "DAP"  ? `"data": "...",\n    "assessment": "...",\n    "plan": "..."` : ""}
    ${format === "BIRP" ? `"behavior": "...",\n    "intervention": "...",\n    "response": "...",\n    "plan": "..."` : ""}
    ${format === "GIRP" ? `"goals": "...",\n    "intervention": "...",\n    "response": "...",\n    "plan": "..."` : ""}
    ${format === "free" ? `"content": "..."` : ""}
  },
  "riskSignals": [
    { "keyword": "texto literal de la transcripción", "context": "frase de contexto de max 200 chars", "severity": "none|low|moderate|high|critical" }
  ],
  "confidence": 0.0
}`;
}

interface ClaudeNoteResponse {
  note:        Record<string, string>;
  riskSignals: RiskSignal[];
  confidence:  number;
}

function parseNoteResponse(
  rawText: string,
  format: NoteFormat
): { parsed: ClaudeNoteResponse; content: NoteContent } {
  // Intento 1: limpiar markdown code block
  const cleaned = rawText
    .replace(/^```json\s*/im, "")
    .replace(/^```\s*/im, "")
    .replace(/\s*```\s*$/im, "")
    .trim();

  let parsed: ClaudeNoteResponse;
  try {
    parsed = JSON.parse(cleaned) as ClaudeNoteResponse;
  } catch {
    // Intento 2: extraer el primer objeto JSON del texto (por si Claude añade texto extra)
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) {
      noteLogger.error({ rawText: rawText.slice(0, 500), format }, "No JSON found in Claude response");
      throw new Error(`Claude no devolvió JSON válido. Respuesta: ${rawText.slice(0, 200)}`);
    }
    try {
      parsed = JSON.parse(match[0]) as ClaudeNoteResponse;
    } catch (e2) {
      noteLogger.error({ rawText: rawText.slice(0, 500), format, err: e2 }, "JSON parse failed after extraction");
      throw new Error(`Error al parsear la respuesta de Claude: ${(e2 as Error).message}`);
    }
  }

  let content: NoteContent;

  if (format === "SOAP") {
    content = {
      format:     "SOAP",
      subjective: parsed.note["subjective"] ?? "",
      objective:  parsed.note["objective"] ?? "",
      assessment: parsed.note["assessment"] ?? "",
      plan:       parsed.note["plan"] ?? "",
    };
  } else if (format === "DAP") {
    content = {
      format:     "DAP",
      data:       parsed.note["data"] ?? "",
      assessment: parsed.note["assessment"] ?? "",
      plan:       parsed.note["plan"] ?? "",
    };
  } else if (format === "BIRP") {
    content = {
      format:       "BIRP",
      behavior:     parsed.note["behavior"] ?? "",
      intervention: parsed.note["intervention"] ?? "",
      response:     parsed.note["response"] ?? "",
      plan:         parsed.note["plan"] ?? "",
    };
  } else if (format === "GIRP") {
    content = {
      format:       "GIRP",
      goals:        parsed.note["goals"] ?? "",
      intervention: parsed.note["intervention"] ?? "",
      response:     parsed.note["response"] ?? "",
      plan:         parsed.note["plan"] ?? "",
    };
  } else {
    content = {
      format:  "free",
      content: parsed.note["content"] ?? "",
    };
  }

  return { parsed, content };
}

export async function generateClinicalNote(
  opts: GenerateNoteOptions
): Promise<GenerateNoteResult> {
  const startMs = Date.now();
  const prompt  = buildNotePrompt(opts);

  noteLogger.info(
    {
      sessionId:    opts.transcription.sessionId,
      format:       opts.format,
      wordCount:    opts.transcription.wordCount,
      durationSecs: opts.transcription.durationSeconds,
    },
    "Generating clinical note with Claude"
  );

  const response = await anthropic.messages.create({
    model:      MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      "Eres un asistente especializado en documentación clínica psicológica.",
      "Respondes SIEMPRE en español.",
      "Respondes ÚNICAMENTE con JSON válido, sin markdown ni texto adicional.",
      "Tu prioridad es la seguridad del paciente: detectas y reportas indicadores de riesgo.",
    ].join(" "),
    messages: [
      { role: "user", content: prompt },
    ],
  });

  const latencyMs = Date.now() - startMs;

  const rawText = response.content
    .filter((block) => block.type === "text")
    .map((block) => {
      if (block.type === "text") return block.text;
      return "";
    })
    .join("");

  const { parsed, content } = parseNoteResponse(rawText, opts.format);

  const riskOrder: RiskLevel[] = ["none", "low", "moderate", "high", "critical"];
  const maxRisk: RiskLevel = parsed.riskSignals.reduce<RiskLevel>(
    (max, signal) => {
      const signalIdx = riskOrder.indexOf(signal.severity);
      const maxIdx    = riskOrder.indexOf(max);
      return signalIdx > maxIdx ? signal.severity : max;
    },
    "none"
  );

  const meta: AIGenerationMeta = {
    model:            MODEL,
    promptTokens:     response.usage.input_tokens,
    completionTokens: response.usage.output_tokens,
    totalTokens:      response.usage.input_tokens + response.usage.output_tokens,
    latencyMs,
    generatedAt:      new Date().toISOString(),
    confidence:       typeof parsed.confidence === "number"
      ? Math.min(1, Math.max(0, parsed.confidence))
      : 0.8,
    riskSignals: parsed.riskSignals.map((s) => ({
      keyword:  s.keyword,
      context:  s.context.slice(0, 200),
      severity: s.severity,
    })),
  };

  noteLogger.info(
    {
      sessionId:  opts.transcription.sessionId,
      latencyMs,
      tokens:     meta.totalTokens,
      riskLevel:  maxRisk,
      riskCount:  parsed.riskSignals.length,
    },
    "Clinical note generated"
  );

  return { content, meta, rawText };
}

export async function detectRiskSignals(
  transcriptionText: string,
  sessionId: string
): Promise<RiskSignal[]> {
  noteLogger.info({ sessionId }, "Running dedicated risk detection pass");

  const response = await anthropic.messages.create({
    model:      MODEL,
    max_tokens: 512,
    system: [
      "Eres un sistema especializado en detección de señales de riesgo clínico.",
      "Respondes ÚNICAMENTE con JSON válido.",
      "Tu objetivo es proteger la seguridad del paciente.",
    ].join(" "),
    messages: [
      {
        role:    "user",
        content: `Analiza este texto de una sesión terapéutica y extrae ÚNICAMENTE señales de riesgo clínico (ideación suicida, autolesiones, riesgo para terceros, crisis aguda).

TEXTO:
---
${transcriptionText.slice(0, 4000)}
---

Responde con JSON: { "signals": [{ "keyword": "...", "context": "...", "severity": "none|low|moderate|high|critical" }] }
Si no hay señales, responde: { "signals": [] }`,
      },
    ],
  });

  const rawText = response.content
    .filter((b) => b.type === "text")
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .replace(/^```json\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const parsed = JSON.parse(rawText) as { signals: RiskSignal[] };
  return parsed.signals ?? [];
}
