/**
 * app/api/transcribe/route.ts
 *
 * POST /api/transcribe — Transcribe audio con Whisper + Privacidad Flash.
 */

export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { db }              from "@/lib/db";
import { transcribeLogger } from "@/lib/logger";
import { writeAudit, extractRequestContext } from "@/lib/audit";
import { transcribeAudio }  from "@/lib/chirp3";
import { apiSuccess, apiError } from "@/lib/utils";
import { checkUsageLimit, addTranscriptionSeconds } from "@/lib/stripe";

const TranscribeRequestSchema = z.object({
  sessionId: z.string().uuid("sessionId debe ser un UUID válido"),
});

const ACCEPTED_MIME_TYPES = new Set([
  "audio/webm", "audio/ogg", "audio/wav",
  "audio/mp4", "audio/mpeg", "audio/x-m4a",
  "audio/aac", "audio/flac",
]);

// Normaliza el MIME quitando parámetros ;codecs=... para comparar
function normalizeMime(mime: string): string {
  return mime.split(";")[0].trim().toLowerCase();
}

const MAX_AUDIO_SIZE_BYTES = 200 * 1024 * 1024;

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(apiError("UNAUTHORIZED", "No autenticado"), { status: 401 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let formData: any;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      apiError("INVALID_FORM", "No se pudo parsear el form data"),
      { status: 400 }
    );
  }

  const sessionIdRaw = formData.get("sessionId");
  const audioFile    = formData.get("audio");

  if (typeof sessionIdRaw !== "string" || !(audioFile instanceof Blob)) {
    return NextResponse.json(
      apiError("MISSING_FIELDS", "Se requieren sessionId y audio"),
      { status: 400 }
    );
  }

  const sessionIdResult = TranscribeRequestSchema.safeParse({ sessionId: sessionIdRaw });
  if (!sessionIdResult.success) {
    return NextResponse.json(
      apiError("INVALID_SESSION_ID", "sessionId inválido"),
      { status: 400 }
    );
  }

  const { sessionId } = sessionIdResult.data;

  // ── Verificar límite de uso (plan free = 10 min) ──────────────────────
  const usage = await checkUsageLimit(userId);
  if (usage.hasReachedLimit) {
    return NextResponse.json(
      apiError("USAGE_LIMIT_REACHED", "Has alcanzado el límite gratuito de 10 minutos. Actualiza a Premium para continuar."),
      { status: 402 }
    );
  }

  if (!ACCEPTED_MIME_TYPES.has(normalizeMime(audioFile.type))) {
    return NextResponse.json(
      apiError("INVALID_AUDIO_TYPE", `Tipo de audio no soportado: ${audioFile.type}`),
      { status: 415 }
    );
  }

  if (audioFile.size > MAX_AUDIO_SIZE_BYTES) {
    return NextResponse.json(
      apiError("AUDIO_TOO_LARGE", "El audio supera el límite de 200 MB"),
      { status: 413 }
    );
  }

  const session = await db.session.findFirst({
    where: {
      id:             sessionId,
      psychologistId: userId,
      status:         { in: ["recording", "processing", "scheduled"] },
    },
    select: { id: true, patientId: true, consentRecorded: true },
  });

  if (!session) {
    return NextResponse.json(
      apiError("SESSION_NOT_FOUND", "Sesión no encontrada o en estado incorrecto"),
      { status: 404 }
    );
  }

  if (!session.consentRecorded) {
    return NextResponse.json(
      apiError("CONSENT_REQUIRED", "El paciente debe haber dado su consentimiento para grabar (RGPD)"),
      { status: 422 }
    );
  }

  const secSettings = await db.securitySettings.findUnique({
    where: { psychologistId: userId },
    select: {
      flashPrivacyEnabled:          true,
      autoAnonymizeTranscriptions:  true,
      anonymizePatientNames:        true,
      anonymizeDates:               true,
      anonymizeLocations:           true,
    },
  });

  const shouldAnonymize = secSettings?.autoAnonymizeTranscriptions ?? true;

  await db.session.update({
    where: { id: sessionId },
    data: {
      status:         "processing",
      startedAt:      new Date(),
      audioSizeBytes: audioFile.size,
      audioMimeType:  audioFile.type,
    },
  });

  transcribeLogger.info({ sessionId, sizeBytes: audioFile.size }, "Starting transcription");

  let transcribeResult;
  try {
    transcribeResult = await transcribeAudio({
      audioBlob:          audioFile,
      sessionId,
      language:           "es",
      shouldAnonymize,
      anonymizeNames:     secSettings?.anonymizePatientNames ?? true,
      anonymizeDates:     secSettings?.anonymizeDates ?? false,
      anonymizeLocations: secSettings?.anonymizeLocations ?? false,
    });
  } catch (err) {
    await db.session.update({ where: { id: sessionId }, data: { status: "recording" } });
    transcribeLogger.error({ err, sessionId }, "Chirp 3 transcription failed");
    return NextResponse.json(
      apiError("TRANSCRIPTION_FAILED", "Error al transcribir el audio. Inténtalo de nuevo."),
      { status: 503 }
    );
  }

  const transcription = await db.transcription.create({
    data: {
      sessionId,
      fullText:        transcribeResult.fullText,
      diarizedText:    transcribeResult.diarizedText,
      language:        transcribeResult.language,
      durationSeconds: transcribeResult.durationSeconds,
      wordCount:       transcribeResult.wordCount,
      speakerCount:    transcribeResult.speakerCount,
      whisperModel:    transcribeResult.whisperModel,
      processingMs:    transcribeResult.processingMs,
      isAnonymized:    transcribeResult.isAnonymized,
      anonymizedAt:    transcribeResult.anonymizedAt ? new Date(transcribeResult.anonymizedAt) : null,
      segments: {
        createMany: {
          data: transcribeResult.segments.map((seg) => ({
            segmentIndex: seg.id,
            startSeconds: seg.start,
            endSeconds:   seg.end,
            text:         seg.text,
            speaker:      seg.speaker,
            speakerId:    seg.speakerId,
            confidence:   seg.confidence,
            language:     seg.language,
          })),
        },
      },
    },
    select: { id: true },
  });

  // ⚡ PRIVACIDAD FLASH
  const audioDeletedAt = new Date();

  await db.session.update({
    where: { id: sessionId },
    data: {
      status:               "transcribed",
      transcriptionId:      transcription.id,
      audioDurationSeconds: transcribeResult.durationSeconds,
      audioStorageKey:      null,
      audioDeletedAt,
      endedAt:              audioDeletedAt,
      durationMinutes:      Math.ceil(transcribeResult.durationSeconds / 60),
    },
  });

  // ── Registrar segundos usados en el plan free ──────────────────────────
  await addTranscriptionSeconds(userId, transcribeResult.durationSeconds);

  await writeAudit({
    psychologistId: userId,
    action:         "session.audio.delete",
    resourceType:   "session",
    resourceId:     sessionId,
    ...extractRequestContext(request),
    metadata: {
      durationSeconds: transcribeResult.durationSeconds,
      wordCount:       transcribeResult.wordCount,
      isAnonymized:    transcribeResult.isAnonymized,
      privacyFlash:    true,
    },
  });

  return NextResponse.json(
    apiSuccess({
      transcriptionId:  transcription.id,
      sessionId,
      fullText:         transcribeResult.fullText,
      diarizedText:     transcribeResult.diarizedText,
      language:         transcribeResult.language,
      durationSeconds:  transcribeResult.durationSeconds,
      wordCount:        transcribeResult.wordCount,
      speakerCount:     transcribeResult.speakerCount,
      isAnonymized:     transcribeResult.isAnonymized,
      audioDeletedAt:   audioDeletedAt.toISOString(),
    }),
    { status: 201 }
  );
}
