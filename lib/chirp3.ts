/**
 * lib/chirp3.ts
 *
 * Transcripción con Google Speech-to-Text V2 + Chirp 3.
 * - Endpoint EU (RGPD): eu-speech.googleapis.com
 * - Modelo: chirp_3 (diarización nativa por hablante)
 * - Sync para audio <60 s  / Batch GCS para ≥60 s
 * - Privacy Flash: buffer zeroed in finally — el audio NUNCA persiste en memoria
 */

import { SpeechClient }       from "@google-cloud/speech/build/src/v2/speech_client";
import { Storage }            from "@google-cloud/storage";
import { randomUUID }         from "crypto";
import { transcribeLogger }   from "@/lib/logger";
import { anonymizeTranscription } from "@/lib/crypto";
import type { TranscriptionSegment, SpeakerRole } from "@/types/session";

// ── Drop-in replacement for lib/whisper.ts ────────────────────────────────────

export interface TranscribeAudioOptions {
  audioBlob:           Blob;
  sessionId:           string;
  language?:           string;
  shouldAnonymize:     boolean;
  anonymizeNames?:     boolean;
  anonymizeDates?:     boolean;
  anonymizeLocations?: boolean;
}

export interface TranscribeAudioResult {
  fullText:        string;
  diarizedText:    string;
  segments:        TranscriptionSegment[];
  language:        string;
  durationSeconds: number;
  wordCount:       number;
  speakerCount:    number;
  whisperModel:    string;  // stores "chirp-3" — DB field reused
  processingMs:    number;
  isAnonymized:    boolean;
  anonymizedAt?:   string;
}

// ── Typed error ───────────────────────────────────────────────────────────────

export class TranscriptionError extends Error {
  constructor(
    public readonly code:
      | "CONFIG_MISSING"
      | "AUDIO_TOO_LARGE"
      | "GCS_UPLOAD_FAILED"
      | "RECOGNIZE_FAILED"
      | "BATCH_FAILED"
      | "EMPTY_RESULT",
    message: string,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = "TranscriptionError";
  }
}

// ── Internal word structure returned by Chirp 3 ───────────────────────────────

interface Chirp3Word {
  word:         string;
  startSeconds: number;
  endSeconds:   number;
  confidence:   number;
  speakerLabel: string;  // e.g. "1", "2"
}

// ── Config ────────────────────────────────────────────────────────────────────

const PROJECT_ID   = process.env.GOOGLE_CLOUD_PROJECT_ID ?? "";
const LOCATION     = "eu";
const GCS_BUCKET   = process.env.GOOGLE_CLOUD_STORAGE_BUCKET ?? "";
const SYNC_MAX_S   = 60;

function getCredentials(): object {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  if (!raw) return {};
  try {
    return { credentials: JSON.parse(raw) as object };
  } catch {
    return {};
  }
}

function buildSpeechClient(): SpeechClient {
  if (!PROJECT_ID) {
    throw new TranscriptionError(
      "CONFIG_MISSING",
      "GOOGLE_CLOUD_PROJECT_ID is not set",
    );
  }
  return new SpeechClient({
    apiEndpoint: "eu-speech.googleapis.com",
    ...getCredentials(),
  } as ConstructorParameters<typeof SpeechClient>[0]);
}

function buildStorageClient(): Storage {
  return new Storage({
    projectId: PROJECT_ID,
    ...getCredentials(),
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function offsetToSeconds(
  offset: { seconds?: number | string | null; nanos?: number | null } | null | undefined,
): number {
  if (!offset) return 0;
  const secs = typeof offset.seconds === "string"
    ? parseFloat(offset.seconds)
    : (offset.seconds ?? 0);
  const ns = offset.nanos ?? 0;
  return (secs as number) + ns / 1e9;
}

/** Map Chirp speaker label to SpeakerRole.
 *  Chirp assigns "1" to the dominant/first speaker → psychologist. */
function speakerLabelToRole(label: string): SpeakerRole {
  if (label === "1") return "psychologist";
  if (label === "2") return "patient";
  return "unknown";
}

/** Group words into segments on speaker change or pause > PAUSE_THRESHOLD_S */
const PAUSE_THRESHOLD_S = 0.6;

function groupWordsToSegments(words: Chirp3Word[]): TranscriptionSegment[] {
  if (words.length === 0) return [];

  const segments: TranscriptionSegment[] = [];
  let segId           = 0;
  let groupWords      = [words[0]!];
  let groupSpeaker    = words[0]!.speakerLabel;
  let groupConfTotal  = words[0]!.confidence;

  const flush = () => {
    const first = groupWords[0]!;
    const last  = groupWords[groupWords.length - 1]!;
    const speakerId = `SPEAKER_0${groupSpeaker}`;
    segments.push({
      id:         segId++,
      start:      first.startSeconds,
      end:        last.endSeconds,
      text:       groupWords.map((w) => w.word).join(" ").trim(),
      speaker:    speakerLabelToRole(groupSpeaker),
      speakerId,
      confidence: groupConfTotal / groupWords.length,
      language:   "es",
    });
    groupWords     = [];
    groupConfTotal = 0;
  };

  for (let i = 1; i < words.length; i++) {
    const word = words[i]!;
    const prev = words[i - 1]!;
    const pause = word.startSeconds - prev.endSeconds;

    const speakerChanged = word.speakerLabel !== groupSpeaker;
    const longPause      = pause >= PAUSE_THRESHOLD_S;

    if (speakerChanged || longPause) {
      flush();
      groupSpeaker = word.speakerLabel;
    }

    groupWords.push(word);
    groupConfTotal += word.confidence;
  }

  if (groupWords.length > 0) flush();

  return segments;
}

function buildDiarizedText(segments: TranscriptionSegment[]): string {
  const lines: string[] = [];
  let lastSpeakerId = "";

  for (const seg of segments) {
    const label = seg.speaker === "psychologist" ? "[Psicólogo/a]" : "[Paciente]";
    if (seg.speakerId !== lastSpeakerId) {
      lines.push(`\n${label}: ${seg.text}`);
      lastSpeakerId = seg.speakerId;
    } else {
      const last = lines[lines.length - 1];
      if (last !== undefined) {
        lines[lines.length - 1] = `${last} ${seg.text}`;
      }
    }
  }

  return lines.join("").trim();
}

// ── Sync recognize (<60 s) ────────────────────────────────────────────────────

async function recognizeSync(
  client:     SpeechClient,
  audioBytes: Buffer,
  language:   string,
): Promise<Chirp3Word[]> {
  const recognizer = `projects/${PROJECT_ID}/locations/${LOCATION}/recognizers/_`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [response] = await (client as any).recognize({
    recognizer,
    config: {
      model:          "chirp_3",
      languageCodes:  [language === "es" ? "es-ES" : language],
      features: {
        enableWordTimeOffsets:    true,
        enableWordConfidence:     true,
        diarizationConfig: {
          minSpeakerCount: 2,
          maxSpeakerCount: 2,
        },
      },
      autoDecodingConfig: {},
    },
    content: audioBytes,
  });

  return extractWords(response);
}

// ── Batch recognize (≥60 s) via GCS ──────────────────────────────────────────

async function recognizeBatch(
  client:     SpeechClient,
  audioBytes: Buffer,
  mimeType:   string,
  language:   string,
  sessionId:  string,
): Promise<Chirp3Word[]> {
  if (!GCS_BUCKET) {
    throw new TranscriptionError(
      "CONFIG_MISSING",
      "GOOGLE_CLOUD_STORAGE_BUCKET is not set — required for audio >60 s",
    );
  }

  const storage    = buildStorageClient();
  const objectName = `transcribe-temp/${sessionId}-${randomUUID()}.audio`;
  const gcsUri     = `gs://${GCS_BUCKET}/${objectName}`;

  // Upload to GCS
  try {
    const bucket = storage.bucket(GCS_BUCKET);
    await bucket.file(objectName).save(audioBytes, {
      metadata: { contentType: mimeType },
    });
    transcribeLogger.info({ sessionId, gcsUri }, "Chirp 3: uploaded to GCS for batch");
  } catch (err) {
    throw new TranscriptionError("GCS_UPLOAD_FAILED", "Failed to upload audio to GCS", err);
  }

  const recognizer = `projects/${PROJECT_ID}/locations/${LOCATION}/recognizers/_`;

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [operation] = await (client as any).batchRecognize({
      recognizer,
      config: {
        model:          "chirp_3",
        languageCodes:  [language === "es" ? "es-ES" : language],
        features: {
          enableWordTimeOffsets: true,
          enableWordConfidence:  true,
          diarizationConfig: {
            minSpeakerCount: 2,
            maxSpeakerCount: 2,
          },
        },
        autoDecodingConfig: {},
      },
      files:          [{ uri: gcsUri }],
      recognitionOutputConfig: { inlineResponseConfig: {} },
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [batchResponse] = await (operation as any).promise();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fileResult = Object.values((batchResponse as any).results ?? {})[0] as any;
    return extractWords(fileResult?.transcript ?? {});
  } catch (err) {
    throw new TranscriptionError("BATCH_FAILED", "Chirp 3 batch recognize failed", err);
  } finally {
    // Privacy Flash — delete temp GCS object immediately
    try {
      await storage.bucket(GCS_BUCKET).file(objectName).delete();
      transcribeLogger.info({ sessionId, gcsUri }, "Chirp 3: temp GCS object deleted");
    } catch (delErr) {
      transcribeLogger.warn({ sessionId, gcsUri, delErr }, "Chirp 3: failed to delete temp GCS object");
    }
  }
}

// ── Parse word-level results from Chirp 3 response ───────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractWords(response: any): Chirp3Word[] {
  const words: Chirp3Word[] = [];
  const results: unknown[] = response?.results ?? [];

  for (const result of results) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const alts = (result as any)?.alternatives ?? [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wordInfos = alts[0]?.words ?? [];
    for (const w of wordInfos) {
      words.push({
        word:         w.word ?? "",
        startSeconds: offsetToSeconds(w.startOffset),
        endSeconds:   offsetToSeconds(w.endOffset),
        confidence:   w.confidence ?? 1.0,
        speakerLabel: String(w.speakerLabel ?? "1"),
      });
    }
  }

  return words;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function transcribeAudio(
  opts: TranscribeAudioOptions,
): Promise<TranscribeAudioResult> {
  const startMs = Date.now();
  const {
    audioBlob,
    sessionId,
    language = "es",
    shouldAnonymize,
  } = opts;

  transcribeLogger.info(
    { sessionId, sizeBytes: audioBlob.size, language },
    "Starting Chirp 3 transcription",
  );

  let audioBuffer: Buffer | null = await audioBlob
    .arrayBuffer()
    .then((ab) => Buffer.from(ab));

  const client = buildSpeechClient();

  try {
    // Estimate duration: assume ~16 kbps compressed webm/opus ≈ 2 kB/s
    // The caller can also provide a hint by embedding it in opts if needed.
    // We use a conservative threshold based on file size (1 MB ≈ 60 s at 128 kbps).
    const estimatedS = audioBlob.size / (16_000 / 8);  // 16 kbps webm/opus
    const useSync    = estimatedS < SYNC_MAX_S;

    transcribeLogger.info(
      { sessionId, estimatedS: Math.round(estimatedS), useSync },
      "Chirp 3: dispatch mode",
    );

    let words: Chirp3Word[];

    if (useSync) {
      words = await recognizeSync(client, audioBuffer!, language);
    } else {
      const mimeType = audioBlob.type.split(";")[0]?.trim() ?? "audio/webm";
      words = await recognizeBatch(client, audioBuffer!, mimeType, language, sessionId);
    }

    if (words.length === 0) {
      throw new TranscriptionError("EMPTY_RESULT", "Chirp 3 returned no words");
    }

    // ── Build structured result ──────────────────────────────────────────────
    const segments     = groupWordsToSegments(words);
    const fullText     = words.map((w) => w.word).join(" ").trim();
    const diarizedText = buildDiarizedText(segments);
    const wordCount    = words.length;
    const speakerCount = new Set(words.map((w) => w.speakerLabel)).size;
    const durationSeconds = words[words.length - 1]?.endSeconds ?? 0;

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

    transcribeLogger.info(
      { sessionId, wordCount, speakerCount, durationSeconds, processingMs },
      "Chirp 3 transcription complete",
    );

    return {
      fullText:        finalFullText,
      diarizedText:    finalDiarizedText,
      segments,
      language,
      durationSeconds,
      wordCount,
      speakerCount,
      whisperModel:    "chirp-3",
      processingMs,
      isAnonymized:    shouldAnonymize,
      anonymizedAt,
    };
  } finally {
    // ⚡ PRIVACY FLASH — zero the in-memory audio buffer
    if (audioBuffer) {
      audioBuffer.fill(0);
      audioBuffer = null;
    }
  }
}
