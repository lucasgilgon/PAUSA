/**
 * components/sessions/TranscriptViewer.tsx
 *
 * Visualización de la transcripción de una sesión con:
 * - Burbujas de chat diferenciadas por hablante (psicólogo / paciente)
 * - Resaltado de señales de riesgo (palabras clave clínicas)
 * - Timestamps y confianza del reconocimiento
 */

"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { TranscriptionSegment, SpeakerRole } from "@/types/session";

// ── Risk keyword list (Spanish clinical terms) ────────────────────────────────

const RISK_KEYWORDS = [
  "suicid",  "suicidar", "suicidarse", "suicidio",
  "morir",   "muerte",   "muerto",     "matar",    "matarme",
  "hacerme daño", "daño", "quitarme la vida",
  "no quiero vivir", "acabar con todo",
  "autolesión", "cortarme", "pastillas", "sobredosis",
  "desesperado", "sin salida", "hopeless",
];

const RISK_REGEX = new RegExp(
  `(${RISK_KEYWORDS.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
  "gi",
);

function highlightRisk(text: string): React.ReactNode[] {
  const parts = text.split(RISK_REGEX);
  return parts.map((part, i) =>
    RISK_REGEX.test(part) ? (
      <mark
        key={i}
        className="bg-amber-100 text-amber-900 rounded px-0.5 font-semibold not-italic"
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTimestamp(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function confidenceColor(confidence: number): string {
  if (confidence >= 0.9) return "bg-success/20 text-success";
  if (confidence >= 0.7) return "bg-warning/20 text-warning";
  return "bg-error/20 text-error";
}

// ── Plain-text fallback parser (for diarizedText string) ─────────────────────

interface ParsedLine {
  speaker: SpeakerRole;
  text:    string;
}

function parseDiarizedText(text: string): ParsedLine[] {
  return text
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      if (line.startsWith("[Psicólogo") || line.startsWith("[Psicologo")) {
        return { speaker: "psychologist" as SpeakerRole, text: line.replace(/^\[.*?\]:\s*/, "") };
      }
      if (line.startsWith("[Paciente]")) {
        return { speaker: "patient" as SpeakerRole, text: line.replace(/^\[.*?\]:\s*/, "") };
      }
      return { speaker: "unknown" as SpeakerRole, text: line };
    });
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface TranscriptViewerProps {
  /** Structured segments from Chirp 3 (preferred — has timestamps + confidence) */
  segments?:     TranscriptionSegment[];
  /** Plain diarized text fallback (e.g. loaded from DB for older sessions) */
  diarizedText?: string;
  /** Show timestamps */
  showTimestamps?: boolean;
  /** Show per-segment confidence badge */
  showConfidence?: boolean;
  /** Highlight risk keywords */
  highlightRisk?: boolean;
  className?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TranscriptViewer({
  segments,
  diarizedText,
  showTimestamps  = true,
  showConfidence  = false,
  highlightRisk: doHighlightRisk = true,
  className,
}: TranscriptViewerProps) {
  // If we have structured segments use those, otherwise fall back to plain text parser
  const lines = useMemo(() => {
    if (segments && segments.length > 0) {
      return segments.map((seg) => ({
        speaker:    seg.speaker,
        text:       seg.text,
        start:      seg.start,
        end:        seg.end,
        confidence: seg.confidence,
      }));
    }
    if (diarizedText) {
      return parseDiarizedText(diarizedText).map((l) => ({
        ...l, start: undefined, end: undefined, confidence: undefined,
      }));
    }
    return [];
  }, [segments, diarizedText]);

  if (lines.length === 0) {
    return (
      <div className={cn("text-center py-8 text-sm text-text-tertiary", className)}>
        Sin transcripción disponible
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {lines.map((line, idx) => {
        const isPsychologist = line.speaker === "psychologist";
        const isUnknown      = line.speaker === "unknown";

        return (
          <div
            key={idx}
            className={cn(
              "flex flex-col gap-1",
              isPsychologist ? "items-end" : "items-start",
            )}
          >
            {/* Speaker label */}
            <span className={cn(
              "text-2xs font-semibold px-1",
              isPsychologist ? "text-primary"    :
              isUnknown      ? "text-text-tertiary" :
                               "text-text-secondary",
            )}>
              {isPsychologist ? "Psicólogo/a" : isUnknown ? "Hablante desconocido" : "Paciente"}
            </span>

            {/* Bubble */}
            <div className={cn(
              "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
              isPsychologist
                ? "bg-primary text-white rounded-tr-sm"
                : isUnknown
                  ? "bg-surface border border-border text-text-secondary rounded-tl-sm"
                  : "bg-surface-secondary text-text-primary rounded-tl-sm",
            )}>
              {doHighlightRisk
                ? highlightRisk(line.text)
                : line.text}
            </div>

            {/* Meta row: timestamp + confidence */}
            {(showTimestamps || showConfidence) && (
              <div className={cn(
                "flex items-center gap-2 px-1",
                isPsychologist ? "flex-row-reverse" : "flex-row",
              )}>
                {showTimestamps && line.start !== undefined && (
                  <span className="text-2xs text-text-tertiary tabular-nums">
                    {formatTimestamp(line.start)}
                    {line.end !== undefined ? `–${formatTimestamp(line.end)}` : ""}
                  </span>
                )}
                {showConfidence && line.confidence !== undefined && (
                  <span className={cn(
                    "text-2xs font-medium px-1.5 py-0.5 rounded-full",
                    confidenceColor(line.confidence),
                  )}>
                    {Math.round(line.confidence * 100)}%
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Risk summary banner (optional — render above TranscriptViewer) ─────────────

interface RiskBannerProps {
  segments?:     TranscriptionSegment[];
  diarizedText?: string;
}

export function RiskBanner({ segments, diarizedText }: RiskBannerProps) {
  const fullText = useMemo(() => {
    if (segments) return segments.map((s) => s.text).join(" ");
    return diarizedText ?? "";
  }, [segments, diarizedText]);

  const hits = useMemo(() => {
    const found = new Set<string>();
    let match: RegExpExecArray | null;
    const re = new RegExp(RISK_REGEX.source, "gi");
    while ((match = re.exec(fullText)) !== null) {
      found.add(match[0]!.toLowerCase());
    }
    return Array.from(found);
  }, [fullText]);

  if (hits.length === 0) return null;

  return (
    <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-3.5 py-3 mb-3">
      <div className="w-5 h-5 rounded-full bg-amber-400 flex items-center justify-center flex-shrink-0 mt-0.5">
        <span className="text-white text-xs font-bold">!</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-amber-900">Señales de riesgo detectadas</p>
        <p className="text-2xs text-amber-700 mt-0.5 leading-relaxed">
          Términos encontrados:{" "}
          {hits.map((h, i) => (
            <span key={i}>
              <span className="font-semibold">{h}</span>
              {i < hits.length - 1 ? ", " : ""}
            </span>
          ))}
        </p>
      </div>
    </div>
  );
}
