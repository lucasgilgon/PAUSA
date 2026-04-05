/**
 * app/api/notes/route.ts
 *
 * POST /api/notes — Genera nota con Claude.
 *
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *  REGLA DE COSTE: Claude se llama UNA SOLA VEZ por sesión.
 *  Si la nota ya existe en DB → devolvemos el caché. GRATIS.
 *  Solo si regenerate:true se vuelve a llamar a la API.
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db }                   from "@/lib/db";
import { noteLogger }           from "@/lib/logger";
import { writeAudit, extractRequestContext } from "@/lib/audit";
import { generateClinicalNote, detectRiskSignals } from "@/lib/claude";
import { apiSuccess, apiError, formatZodError, maxRiskLevel } from "@/lib/utils";
import { GenerateNoteRequestSchema, type RiskLevel } from "@/types";
import { checkUsageLimit, addTranscriptionSeconds } from "@/lib/stripe";

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(apiError("UNAUTHORIZED", "No autenticado"), { status: 401 });
  }

  let rawBody: unknown;
  try { rawBody = await request.json(); }
  catch { return NextResponse.json(apiError("INVALID_JSON", "Body inválido"), { status: 400 }); }

  const bodyResult = GenerateNoteRequestSchema.safeParse(rawBody);
  if (!bodyResult.success) {
    noteLogger.warn(
      { errors: bodyResult.error.flatten(), body: rawBody },
      "Note request validation failed"
    );
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "Datos inválidos", formatZodError(bodyResult.error)),
      { status: 422 }
    );
  }

  const { sessionId, transcriptionId, transcriptionText, format, additionalContext, regenerate } = bodyResult.data;

  // ── Verificar límite de uso (solo para texto directo / Web Speech) ─────
  if (transcriptionText && !regenerate) {
    const usage = await checkUsageLimit(userId);
    if (usage.hasReachedLimit) {
      return NextResponse.json(
        apiError("USAGE_LIMIT_REACHED", "Has alcanzado el límite gratuito de 10 minutos. Actualiza a Premium para continuar."),
        { status: 402 }
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const session: any = await db.session.findFirst({
    where: { id: sessionId, psychologistId: userId },
    include: {
      transcription: { include: { segments: true } },
      patient: {
        select: {
          id: true, shortId: true, isAnonymized: true,
          firstName: true, lastName: true, dateOfBirth: true,
          therapyModality: true, diagnosisCodes: true,
          totalSessions: true,
        },
      },
      note: true,
    },
  });

  if (!session) {
    return NextResponse.json(apiError("NOT_FOUND", "Sesión no encontrada"), { status: 404 });
  }

  // Si viene texto directo (Web Speech API / Voice nativo) no necesitamos transcripción en DB
  const hasDirectText = !!transcriptionText?.trim();

  if (!hasDirectText && !session.transcription) {
    return NextResponse.json(apiError("NOT_FOUND", "Transcripción no encontrada"), { status: 404 });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  CACHÉ: Si ya existe nota y no se pide regenerar →
  //  devolver DB sin llamar a Claude. COSTE: $0.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (session.note && !regenerate) {
    noteLogger.info({ sessionId, noteId: session.note.id }, "Note served from cache — no Claude call");
    return NextResponse.json(
      apiSuccess({
        noteId:           session.note.id,
        content:          session.note.content,
        detectedRiskLevel: session.note.detectedRiskLevel,
        riskAlertCreated:  session.note.riskAlertCreated,
        fromCache:         true,  // el cliente puede mostrar "cargado desde caché"
      })
    );
  }

  const patient       = session.patient;
  const transcription = session.transcription;

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  TEXTO DIRECTO (Web Speech API / Voice nativo)
  //  Si viene transcriptionText, creamos o actualizamos
  //  la Transcription en DB con el texto nuevo.
  //  Esto permite que una sesión que ya tenía audio re-use
  //  el flujo de Web Speech sin perder la nueva transcripción.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  let effectiveTranscription = transcription;

  if (hasDirectText) {
    const text      = transcriptionText!.trim();
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    if (transcription) {
      // Ya existe → actualizar con el texto de Web Speech
      const updated = await db.transcription.update({
        where: { id: transcription.id },
        data: {
          fullText:     text,
          diarizedText: text,
          wordCount,
          whisperModel: "web-speech-api",
        },
        include: { segments: true },
      });
      effectiveTranscription = updated;
      noteLogger.info({ sessionId, wordCount }, "Transcription updated from Web Speech API (free)");
    } else {
      // No existe → crear
      const saved = await db.transcription.create({
        data: {
          sessionId,
          fullText:        text,
          diarizedText:    text,
          language:        "es",
          durationSeconds: 0,
          wordCount,
          speakerCount:    1,
          whisperModel:    "web-speech-api",
          processingMs:    0,
          isAnonymized:    false,
          segments:        { create: [] },
        },
        include: { segments: true },
      });

      await db.session.update({
        where: { id: sessionId },
        data:  { transcriptionId: saved.id, status: "transcribed" },
      });

      effectiveTranscription = saved;
      noteLogger.info({ sessionId, wordCount }, "Transcription saved from Web Speech API (free)");
    }

    // Registrar segundos en el plan free (estimación por palabras si no hay duración)
    const wordsPerMinute = 130; // media española hablando
    const estimatedSeconds = effectiveTranscription
      ? Math.ceil((effectiveTranscription.wordCount / wordsPerMinute) * 60)
      : Math.ceil((transcriptionText!.trim().split(/\s+/).length / wordsPerMinute) * 60);
    await addTranscriptionSeconds(userId, estimatedSeconds);
  }

  // Contexto de la sesión anterior (para mejores notas)
  const lastNote = await db.note.findFirst({
    where: {
      patientId: patient.id,
      status:    { in: ["reviewed", "signed"] },
      id:        { not: session.note?.id },
    },
    orderBy: { createdAt: "desc" },
    select:  { content: true },
  });

  await db.session.update({ where: { id: sessionId }, data: { status: "generating" } });

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  LLAMADA A CLAUDE — solo llega aquí si no hay caché
  //  o si el usuario pulsó "Regenerar" explícitamente.
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  noteLogger.info({ sessionId, source: hasDirectText ? "web-speech" : "whisper" }, "Calling Claude API for note generation");

  let generateResult;
  try {
    generateResult = await generateClinicalNote({
      transcription: {
        id:             effectiveTranscription!.id,
        sessionId:      effectiveTranscription!.sessionId,
        segments:       effectiveTranscription!.segments.map((s) => ({
          id:         s.segmentIndex,
          start:      s.startSeconds,
          end:        s.endSeconds,
          text:       s.text,
          speaker:    s.speaker as "psychologist" | "patient" | "unknown",
          speakerId:  s.speakerId,
          confidence: s.confidence,
          language:   s.language,
        })),
        fullText:        effectiveTranscription!.fullText,
        diarizedText:    effectiveTranscription!.diarizedText,
        language:        effectiveTranscription!.language,
        durationSeconds: effectiveTranscription!.durationSeconds,
        wordCount:       effectiveTranscription!.wordCount,
        speakerCount:    effectiveTranscription!.speakerCount,
        whisperModel:    effectiveTranscription!.whisperModel,
        processingMs:    effectiveTranscription!.processingMs,
        isAnonymized:    effectiveTranscription!.isAnonymized,
        anonymizedAt:    effectiveTranscription!.anonymizedAt?.toISOString(),
        createdAt:       effectiveTranscription!.createdAt.toISOString(),
      },
      format,
      additionalContext,
      patientContext: {
        sessionNumber:       session.sessionNumber,
        therapyModality:     patient.therapyModality,
        diagnosisCodes:      patient.diagnosisCodes,
        previousNoteSummary: lastNote
          ? JSON.stringify(lastNote.content).slice(0, 500)
          : undefined,
      },
    });
  } catch (err) {
    await db.session.update({ where: { id: sessionId }, data: { status: "transcribed" } });
    const errMsg = err instanceof Error ? err.message : String(err);
    const errStack = err instanceof Error ? err.stack : undefined;
    noteLogger.error({ err: errMsg, stack: errStack, sessionId }, "Claude note generation failed");
    console.error("[PAUSA] Note generation error:", errMsg, errStack);
    return NextResponse.json(
      apiError("AI_ERROR", `Error al generar la nota: ${errMsg.slice(0, 120)}`),
      { status: 503 }
    );
  }

  // Detección de riesgo (segunda pasada, no fatal)
  const additionalRiskSignals = await detectRiskSignals(
    effectiveTranscription?.diarizedText ?? transcriptionText ?? "", sessionId
  ).catch(() => []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allRiskSignals    = [...generateResult.meta.riskSignals, ...additionalRiskSignals] as any[];
  const detectedRiskLevel = maxRiskLevel(allRiskSignals.map((s) => s.severity as RiskLevel));
  const shouldCreateAlert = detectedRiskLevel === "high" || detectedRiskLevel === "critical";

  if (shouldCreateAlert) {
    const criticalSignal = allRiskSignals.filter((s) => s.severity === detectedRiskLevel).at(0);
    const kw = String(criticalSignal?.keyword ?? "").toLowerCase();
    const alertType =
      kw.includes("autolesion") ? "self_harm" :
      kw.includes("suicid")     ? "suicidal_ideation" : "other";

    await db.riskAlert.create({
      data: {
        patientId:    patient.id,
        sessionId,
        level:        detectedRiskLevel,
        type:         alertType,
        autoDetected: true,
        keywords:     allRiskSignals.map((s) => String(s.keyword)).slice(0, 20),
      },
    });
    await db.patient.update({ where: { id: patient.id }, data: { currentRisk: detectedRiskLevel } });
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  GUARDAR EN DB — próximas lecturas serán GRATIS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  const noteData = {
    sessionId,
    patientId:          patient.id,
    psychologistId:     userId,
    format,
    content:            generateResult.content as never,
    status:             "draft",
    isAIGenerated:      true,
    aiModel:            generateResult.meta.model,
    aiPromptTokens:     generateResult.meta.promptTokens,
    aiCompletionTokens: generateResult.meta.completionTokens,
    aiLatencyMs:        generateResult.meta.latencyMs,
    aiConfidence:       generateResult.meta.confidence,
    aiRiskSignals:      allRiskSignals as never,
    detectedRiskLevel,
    riskAlertCreated:   shouldCreateAlert,
    isAnonymized:       effectiveTranscription?.isAnonymized ?? false,
  };

  let note;
  if (session.note && regenerate) {
    note = await db.note.update({ where: { id: session.note.id }, data: { ...noteData, wasEdited: true } });
  } else {
    note = await db.note.create({ data: noteData });
  }

  await db.session.update({
    where: { id: sessionId },
    data:  { status: "draft", noteId: note.id, detectedRiskLevel },
  });

  await writeAudit({
    psychologistId: userId,
    action:         "session.note.view",
    resourceType:   "note",
    resourceId:     note.id,
    ...extractRequestContext(request),
    metadata: {
      format,
      model:        generateResult.meta.model,
      tokens:       generateResult.meta.totalTokens,
      riskLevel:    detectedRiskLevel,
      alertCreated: shouldCreateAlert,
      fromCache:    false,
    },
  });

  noteLogger.info(
    { sessionId, noteId: note.id, tokens: generateResult.meta.totalTokens },
    "Note generated and cached in DB"
  );

  return NextResponse.json(
    apiSuccess({
      noteId:           note.id,
      content:          generateResult.content,
      meta:             generateResult.meta,
      detectedRiskLevel,
      riskAlertCreated: shouldCreateAlert,
      fromCache:        false,
    }),
    { status: 201 }
  );
}
