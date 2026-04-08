/**
 * lib/claude.ts
 *
 * Cliente Ollama API para generación de notas clínicas SOAP/DAP/BIRP.
 * Modelo: gemma3 (local vía Ollama — http://localhost:11434)
 *
 * Reemplaza la llamada a Anthropic con fetch directo a Ollama.
 * La interfaz externa (GenerateNoteOptions, GenerateNoteResult, etc.)
 * se mantiene idéntica para no romper el resto del proyecto.
 */

import type { NoteFormat, NoteContent, AIGenerationMeta, RiskLevel } from "@/types";
import type { Transcription } from "@/types/session";
import { noteLogger } from "@/lib/logger";

const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL ?? "http://localhost:11434").replace(/\/$/, "");
const MODEL           = process.env.OLLAMA_MODEL ?? "gemma3";

export interface GenerateNoteOptions {
  transcription:      Transcription;
  format:             NoteFormat;
  additionalContext?: string;
  patientContext?: {
    sessionNumber:         number;
    therapyModality:       string;
    diagnosisCodes?:       string[];
    previousNoteSummary?:  string;
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

// ─── Instrucciones por formato ─────────────────────────────────────────────

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

// ─── Construcción del prompt ────────────────────────────────────────────────

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

// ─── Cliente Ollama ─────────────────────────────────────────────────────────

interface OllamaResult {
  text:             string;
  promptTokens:     number;
  completionTokens: number;
  totalDurationMs:  number;
}

async function callOllama(
  systemPrompt: string,
  userPrompt:   string,
  maxTokens     = 4096
): Promise<OllamaResult> {
  const startMs = Date.now();

  const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
    method:  "POST",
    headers: { "Content-Type": "application/json" },
    body:    JSON.stringify({
      model:   MODEL,
      stream:  false,
      options: { num_predict: maxTokens },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: userPrompt   },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`Ollama ${response.status}: ${body.slice(0, 300)}`);
  }

  const data = await response.json() as {
    message?:          { content?: string };
    prompt_eval_count?: number;
    eval_count?:        number;
    total_duration?:    number;
  };

  return {
    text:             data.message?.content ?? "",
    promptTokens:     data.prompt_eval_count  ?? 0,
    completionTokens: data.eval_count         ?? 0,
    totalDurationMs:  data.total_duration
      ? Math.round(data.total_duration / 1_000_000)  // ns → ms
      : Date.now() - startMs,
  };
}

// ─── Parser de la respuesta ─────────────────────────────────────────────────

interface OllamaNoteResponse {
  note:        Record<string, string>;
  riskSignals: RiskSignal[];
  confidence:  number;
}

function parseNoteResponse(
  rawText: string,
  format:  NoteFormat
): { parsed: OllamaNoteResponse; content: NoteContent } {
  const cleaned = rawText
    .replace(/^```json\s*/im, "")
    .replace(/^```\s*/im,    "")
    .replace(/\s*```\s*$/im, "")
    .trim();

  let parsed: OllamaNoteResponse;
  try {
    parsed = JSON.parse(cleaned) as OllamaNoteResponse;
  } catch {
    const match = rawText.match(/\{[\s\S]*\}/);
    if (!match) {
      noteLogger.error({ rawText: rawText.slice(0, 500), format }, "No JSON found in Ollama response");
      throw new Error(`Ollama no devolvió JSON válido. Respuesta: ${rawText.slice(0, 200)}`);
    }
    try {
      parsed = JSON.parse(match[0]) as OllamaNoteResponse;
    } catch (e2) {
      noteLogger.error({ rawText: rawText.slice(0, 500), format, err: e2 }, "JSON parse failed after extraction");
      throw new Error(`Error al parsear la respuesta de Ollama: ${(e2 as Error).message}`);
    }
  }

  let content: NoteContent;

  if (format === "SOAP") {
    content = {
      format:     "SOAP",
      subjective: parsed.note["subjective"] ?? "",
      objective:  parsed.note["objective"]  ?? "",
      assessment: parsed.note["assessment"] ?? "",
      plan:       parsed.note["plan"]       ?? "",
    };
  } else if (format === "DAP") {
    content = {
      format:     "DAP",
      data:       parsed.note["data"]       ?? "",
      assessment: parsed.note["assessment"] ?? "",
      plan:       parsed.note["plan"]       ?? "",
    };
  } else if (format === "BIRP") {
    content = {
      format:       "BIRP",
      behavior:     parsed.note["behavior"]     ?? "",
      intervention: parsed.note["intervention"] ?? "",
      response:     parsed.note["response"]     ?? "",
      plan:         parsed.note["plan"]         ?? "",
    };
  } else if (format === "GIRP") {
    content = {
      format:       "GIRP",
      goals:        parsed.note["goals"]        ?? "",
      intervention: parsed.note["intervention"] ?? "",
      response:     parsed.note["response"]     ?? "",
      plan:         parsed.note["plan"]         ?? "",
    };
  } else {
    content = {
      format:  "free",
      content: parsed.note["content"] ?? "",
    };
  }

  return { parsed, content };
}

// ─── Generación de nota clínica ─────────────────────────────────────────────

const SYSTEM_PROMPT = [
  "Eres un asistente especializado en documentación clínica psicológica.",
  "Respondes SIEMPRE en español.",
  "Respondes ÚNICAMENTE con JSON válido, sin markdown ni texto adicional.",
  "Tu prioridad es la seguridad del paciente: detectas y reportas indicadores de riesgo.",
].join(" ");

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
      model:        MODEL,
    },
    "Generating clinical note with Ollama"
  );

  const ollama    = await callOllama(SYSTEM_PROMPT, prompt, 4096);
  const latencyMs = Date.now() - startMs;
  const rawText   = ollama.text;

  const { parsed, content } = parseNoteResponse(rawText, opts.format);

  const riskOrder: RiskLevel[] = ["none", "low", "moderate", "high", "critical"];
  const maxRisk: RiskLevel = (parsed.riskSignals ?? []).reduce<RiskLevel>(
    (max, signal) => {
      const signalIdx = riskOrder.indexOf(signal.severity);
      const maxIdx    = riskOrder.indexOf(max);
      return signalIdx > maxIdx ? signal.severity : max;
    },
    "none"
  );

  const meta: AIGenerationMeta = {
    model:            `ollama/${MODEL}`,
    promptTokens:     ollama.promptTokens,
    completionTokens: ollama.completionTokens,
    totalTokens:      ollama.promptTokens + ollama.completionTokens,
    latencyMs,
    generatedAt:      new Date().toISOString(),
    confidence:       typeof parsed.confidence === "number"
      ? Math.min(1, Math.max(0, parsed.confidence))
      : 0.8,
    riskSignals: (parsed.riskSignals ?? []).map((s) => ({
      keyword:  s.keyword,
      context:  s.context.slice(0, 200),
      severity: s.severity,
    })),
  };

  noteLogger.info(
    {
      sessionId: opts.transcription.sessionId,
      latencyMs,
      tokens:    meta.totalTokens,
      riskLevel: maxRisk,
      riskCount: (parsed.riskSignals ?? []).length,
    },
    "Clinical note generated via Ollama"
  );

  return { content, meta, rawText };
}

// ─── Detección de señales de riesgo (pase dedicado) ─────────────────────────

export async function detectRiskSignals(
  transcriptionText: string,
  sessionId:         string
): Promise<RiskSignal[]> {
  noteLogger.info({ sessionId, model: MODEL }, "Running dedicated risk detection pass via Ollama");

  const userPrompt = `Analiza este texto de una sesión terapéutica y extrae ÚNICAMENTE señales de riesgo clínico (ideación suicida, autolesiones, riesgo para terceros, crisis aguda).

TEXTO:
---
${transcriptionText.slice(0, 4000)}
---

Responde con JSON: { "signals": [{ "keyword": "...", "context": "...", "severity": "none|low|moderate|high|critical" }] }
Si no hay señales, responde: { "signals": [] }`;

  const ollama = await callOllama(
    "Eres un sistema especializado en detección de señales de riesgo clínico. Respondes ÚNICAMENTE con JSON válido. Tu objetivo es proteger la seguridad del paciente.",
    userPrompt,
    512
  );

  const rawText = ollama.text
    .replace(/^```json\s*/i, "")
    .replace(/\s*```$/i,     "")
    .trim();

  try {
    const parsed = JSON.parse(rawText) as { signals: RiskSignal[] };
    return parsed.signals ?? [];
  } catch {
    noteLogger.warn({ sessionId, rawText: rawText.slice(0, 200) }, "Risk signal parse failed — returning empty");
    return [];
  }
}
