/**
 * lib/whisper.ts
 *
 * Cliente de transcripción con OpenAI Whisper + diarización heurística.
 */

import OpenAI from "openai";
import { transcribeLogger } from "@/lib/logger";
import { anonymizeTranscription } from "@/lib/crypto";
import type { TranscriptionSegment, SpeakerRole } from "@/types/session";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  timeout: 120_000,
  maxRetries: 2,
});

export interface TranscribeAudioOptions {
  audioBlob:      Blob;
  sessionId:      string;
  language?:      string;
  shouldAnonymize: boolean;
  anonymizeNames?:     boolean;
  anonymizeDates?:     boolean;
  anonymizeLocations?: boolean;
}

export interface TranscribeAudioResult {
  fullText:         string;
  diarizedText:     string;
  segments:         TranscriptionSegment[];
  language:         string;
  durationSeconds:  number;
  wordCount:        number;
  speakerCount:     number;
  whisperModel:     string;
  processingMs:     number;
  isAnonymized:     boolean;
  anonymizedAt?:    string;
}

interface WhisperVerboseSegment {
  id:         number;
  seek:       number;
  start:      number;
  end:        number;
  text:       string;
  tokens:     number[];
  temperature: number;
  avg_logprob: number;
  compression_ratio: number;
  no_speech_prob: number;
}

export async function transcribeAudio(
  opts: TranscribeAudioOptions
): Promise<TranscribeAudioResult> {
  const startMs = Date.now();
  const { audioBlob, sessionId, language = "es", shouldAnonymize } = opts;

  transcribeLogger.info(
    { sessionId, sizeBytes: audioBlob.size, language },
    "Starting Whisper transcription"
  );

  const audioFile = new File([audioBlob], `session-${sessionId}.webm`, {
    type: audioBlob.type || "audio/webm",
  });

  const whisperResponse = await openai.audio.transcriptions.create({
    file:              audioFile,
    model:             "whisper-1",
    language,
    response_format:   "verbose_json",
    timestamp_granularities: ["segment"],
  });

  const rawSegments = (whisperResponse as unknown as {
    segments?: WhisperVerboseSegment[];
    duration?: number;
  }).segments ?? [];

  const duration = (whisperResponse as unknown as { duration?: number }).duration ?? 0;

  const diarizedSegments = applyHeuristicDiarization(rawSegments);
  const diarizedText = buildDiarizedText(diarizedSegments);
  const fullText     = whisperResponse.text;
  const wordCount    = fullText.split(/\s+/).filter(Boolean).length;
  const speakerCount = new Set(diarizedSegments.map((s) => s.speakerId)).size;

  let finalFullText     = fullText;
  let finalDiarizedText = diarizedText;
  let anonymizedAt: string | undefined;

  if (shouldAnonymize) {
    const anonFull     = anonymizeTranscription(fullText,     opts);
    const anonDiarized = anonymizeTranscription(diarizedText, opts);
    finalFullText     = anonFull.anonymized;
    finalDiarizedText = anonDiarized.anonymized;
    anonymizedAt      = new Date().toISOString();
  }

  const processingMs = Date.now() - startMs;

  return {
    fullText:        finalFullText,
    diarizedText:    finalDiarizedText,
    segments:        diarizedSegments,
    language,
    durationSeconds: duration,
    wordCount,
    speakerCount,
    whisperModel:    "whisper-1",
    processingMs,
    isAnonymized:    shouldAnonymize,
    anonymizedAt,
  };
}

interface DiarizedSegment {
  id:         number;
  start:      number;
  end:        number;
  text:       string;
  speaker:    SpeakerRole;
  speakerId:  string;
  confidence: number;
  language:   string;
}

function applyHeuristicDiarization(
  segments: WhisperVerboseSegment[]
): TranscriptionSegment[] {
  if (segments.length === 0) return [];

  const PAUSE_THRESHOLD_S   = 0.8;
  const LONG_SEGMENT_S      = 20;

  let currentSpeaker = "SPEAKER_00";
  const result: TranscriptionSegment[] = [];

  for (let i = 0; i < segments.length; i++) {
    const seg  = segments[i]!;
    const prev = segments[i - 1];

    if (prev !== undefined) {
      const pauseSeconds = seg.start - prev.end;
      const prevDuration = prev.end - prev.start;

      if (pauseSeconds >= PAUSE_THRESHOLD_S || prevDuration >= LONG_SEGMENT_S) {
        currentSpeaker = currentSpeaker === "SPEAKER_00" ? "SPEAKER_01" : "SPEAKER_00";
      }
    }

    const speakerRole: SpeakerRole =
      currentSpeaker === "SPEAKER_00" ? "psychologist" : "patient";

    const confidence = Math.max(0, Math.min(1, 1 + (seg.avg_logprob ?? -0.5)));

    result.push({
      id:         seg.id,
      start:      seg.start,
      end:        seg.end,
      text:       seg.text.trim(),
      speaker:    speakerRole,
      speakerId:  currentSpeaker,
      confidence,
      language:   "es",
    });
  }

  return result;
}

function buildDiarizedText(segments: DiarizedSegment[]): string {
  const lines: string[] = [];
  let lastSpeaker = "";

  for (const seg of segments) {
    const label =
      seg.speaker === "psychologist" ? "[Psicólogo/a]" : "[Paciente]";

    if (seg.speakerId !== lastSpeaker) {
      lines.push(`\n${label}: ${seg.text}`);
      lastSpeaker = seg.speakerId;
    } else {
      const last = lines[lines.length - 1];
      if (last !== undefined) {
        lines[lines.length - 1] = last + " " + seg.text;
      }
    }
  }

  return lines.join("").trim();
}
