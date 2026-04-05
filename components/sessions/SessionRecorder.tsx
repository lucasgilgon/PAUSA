/**
 * components/sessions/SessionRecorder.tsx
 *
 * Client Component que gestiona el flujo completo de una sesión:
 *   idle → recording → uploading → transcribed → generating → note
 *
 * Props: session (datos precargados desde el Server Component padre).
 * Usa useAudioRecorder para el ciclo de grabación.
 * Llama a /api/notes para generar la nota con Claude tras la transcripción.
 */

"use client";

import { useState, useCallback } from "react";
import { Mic, Pause, Play, AlertTriangle, CheckCircle, Loader2, FileText, Zap } from "lucide-react";
import { cn, formatAudioDuration } from "@/lib/utils";
import { useWebSpeechRecorder, isWebSpeechSupported } from "@/hooks/useWebSpeechRecorder";
import { useAudioRecorder, type TranscriptionResult } from "@/hooks/useAudioRecorder";
import { NoteViewer } from "@/components/notes/NoteViewer";
import { UpgradeModal } from "@/components/billing/UpgradeModal";
import { UsageBadge } from "@/components/billing/UsageBadge";
import type { NoteFormat, NoteContent } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────

interface SessionData {
  id:              string;
  patientId:       string;
  patientName:     string;
  sessionNumber:   number;
  status:          string;
  noteFormat:      string;
  scheduledAt:     string;
  consentRecorded: boolean;
  currentRisk:     string;
  transcription:   { id: string; diarizedText: string; wordCount: number } | null;
  note:            { id: string; status: string; format: string; content: Record<string, string> } | null;
}

interface GeneratedNote {
  noteId:           string;
  content:          NoteContent;
  detectedRiskLevel: string;
  riskAlertCreated:  boolean;
}

interface SessionRecorderProps {
  session: SessionData;
}

// ─── Component ────────────────────────────────────────────────────────────

export function SessionRecorder({ session }: SessionRecorderProps) {
  const [activeTab,       setActiveTab]       = useState<NoteFormat>("SOAP");
  const [generatedNote,   setGeneratedNote]   = useState<GeneratedNote | null>(
    session.note ? {
      noteId:            session.note.id,
      content:           session.note.content as unknown as NoteContent,
      detectedRiskLevel: "none",
      riskAlertCreated:  false,
    } : null
  );
  const [isGenerating,    setIsGenerating]    = useState(false);
  const [generateError,   setGenerateError]   = useState<string | null>(null);
  const [showUpgrade,     setShowUpgrade]     = useState(false);
  const [transcriptionData, setTranscriptionData] = useState<TranscriptionResult | null>(null);

  const isHighRisk    = session.currentRisk === "high" || session.currentRisk === "critical";
  const useSpeechAPI  = isWebSpeechSupported();   // Web Speech disponible → $0

  // ─── Web Speech API (GRATIS — Chrome/Safari) ─────────────────────────
  const speechRecorder = useWebSpeechRecorder({
    language: "es-ES",
    onTranscribed: (text) => {
      void handleGenerateNote(undefined, text);
    },
    onError: (msg) => {
      setGenerateError(msg);
    },
  });

  // ─── Audio recorder (fallback si Web Speech no disponible) ───────────
  const audioRecorder = useAudioRecorder({
    sessionId: session.id,
    onTranscribed: (result) => {
      setTranscriptionData(result);
      void handleGenerateNote(result.transcriptionId);
    },
    onError: (err) => {
      if (err.code === "USAGE_LIMIT_REACHED") {
        setShowUpgrade(true);
      }
    },
  });

  // Usar Web Speech si está disponible, sino audio upload
  const status        = useSpeechAPI ? speechRecorder.status        : audioRecorder.status;
  const elapsedSeconds = useSpeechAPI ? speechRecorder.elapsedSeconds : audioRecorder.elapsedSeconds;
  const waveformData  = audioRecorder.waveformData;
  const isRecording   = useSpeechAPI ? speechRecorder.isRecording   : audioRecorder.isRecording;
  const isPaused      = useSpeechAPI ? false                         : audioRecorder.isPaused;
  const isUploading   = useSpeechAPI ? false                         : audioRecorder.isUploading;
  const transcribeDone = useSpeechAPI ? speechRecorder.isDone        : audioRecorder.isDone;
  const recorderError = useSpeechAPI
    ? (speechRecorder.status === "error" ? "Error en el reconocimiento de voz" : null)
    : audioRecorder.error?.message ?? null;

  const startRecording  = useSpeechAPI ? speechRecorder.startRecording  : audioRecorder.startRecording;
  const pauseRecording  = useSpeechAPI ? () => {}                        : audioRecorder.pauseRecording;
  const resumeRecording = useSpeechAPI ? () => {}                        : audioRecorder.resumeRecording;
  const stopAndTranscribe = useSpeechAPI ? speechRecorder.stopRecording  : audioRecorder.stopAndTranscribe;

  // ─── Generar nota con Claude ──────────────────────────────────────────
  const handleGenerateNote = useCallback(async (
    transcriptionId?: string,
    transcriptionText?: string,
  ) => {
    setIsGenerating(true);
    setGenerateError(null);

    try {
      const res = await fetch("/api/notes", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId:         session.id,
          transcriptionId,
          transcriptionText,
          format:            activeTab,
          regenerate:        !!generatedNote,
        }),
      });

      if (!res.ok) {
        if (res.status === 402) {
          setShowUpgrade(true);
          setIsGenerating(false);
          return;
        }
        const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(err?.error?.message ?? "Error al generar la nota");
      }

      const json = await res.json() as { data: GeneratedNote };
      setGeneratedNote(json.data);
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsGenerating(false);
    }
  }, [session.id, activeTab, generatedNote]);

  const handleRegenerateNote = useCallback(async () => {
    const tid  = transcriptionData?.transcriptionId ?? session.transcription?.id;
    const text = speechRecorder.finalText || undefined;
    if (!tid && !text) return;
    await handleGenerateNote(tid, text);
  }, [transcriptionData, session.transcription, speechRecorder.finalText, handleGenerateNote]);

  // ─── Estado de la grabación para UI ──────────────────────────────────
  const showNote = !!generatedNote || isGenerating;
  const hasTranscription = !!transcriptionData || !!session.transcription;

  return (
    <div className="flex flex-col pb-6">

      {/* ── Modal de upgrade ───────────────────────────────────────────── */}
      <UpgradeModal
        isOpen={showUpgrade}
        onClose={() => setShowUpgrade(false)}
      />

      {/* ── Alerta de riesgo del paciente ───────────────────────────────── */}
      {isHighRisk && (
        <div className="risk-alert-banner" role="alert">
          <div className="w-7 h-7 rounded-full bg-error flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={13} className="text-white" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-xs font-bold text-error">
              Paciente con alerta de riesgo activa
            </p>
            <p className="text-2xs text-error/75 mt-0.5">
              Mantén especial atención durante esta sesión.
            </p>
          </div>
        </div>
      )}

      {/* ── Área de grabación ─────────────────────────────────────────── */}
      <div className="mx-4 mt-3 card-surface">
        {/* Header sesión */}
        <div className="text-center mb-4">
          <p className="font-headline text-base font-bold text-text-primary">
            {session.patientName}
          </p>
          <div className="flex items-center justify-center gap-2 mt-0.5">
            <p className="text-xs text-text-tertiary">
              Sesión #{session.sessionNumber} · {session.noteFormat}
            </p>
            {/* Badge coste $0 */}
            {useSpeechAPI && (
              <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-700 text-2xs font-semibold px-1.5 py-0.5 rounded-full">
                <Zap size={9} />
                Gratis · On-device
              </span>
            )}
          </div>
          {/* Badge uso */}
          <div className="flex justify-center mt-2">
            <UsageBadge onLimitReached={() => setShowUpgrade(true)} />
          </div>
        </div>

        {/* Botón de grabación */}
        <div className="flex justify-center mb-4">
          <RecordButton
            status={status}
            onStart={startRecording}
            onPause={pauseRecording}
            onResume={resumeRecording}
            onStop={stopAndTranscribe}
            disabled={isUploading || !!generatedNote}
          />
        </div>

        {/* Timer */}
        <p className={cn(
          "text-center font-headline text-3xl font-extrabold mb-3 tracking-wider",
          isRecording ? "text-error" : "text-text-primary"
        )}>
          {formatAudioDuration(elapsedSeconds)}
        </p>

        {/* Estado */}
        <RecordingStatus
          status={status}
          isGenerating={isGenerating}
          error={recorderError ?? generateError}
        />

        {/* Waveform */}
        {(isRecording || isPaused) && (
          <div className="flex items-end justify-center gap-0.5 h-10 mt-3">
            {waveformData.map((h, i) => (
              <div
                key={i}
                className={cn(
                  "wave-bar transition-all duration-75",
                  isRecording ? "wave-bar--recording" : ""
                )}
                style={{ height: `${h}px` }}
              />
            ))}
          </div>
        )}

        {/* Texto en tiempo real (Web Speech API) */}
        {useSpeechAPI && isRecording && speechRecorder.liveText && (
          <div className="mt-3 bg-surface-secondary rounded-lg px-3 py-2 max-h-24 overflow-y-auto">
            <p className="text-2xs text-text-secondary leading-relaxed italic">
              {speechRecorder.liveText}
            </p>
          </div>
        )}

        {/* Privacidad Flash — confirmación visual */}
        {(transcribeDone || !!transcriptionData) && (
          <div className="flex items-center gap-2 mt-3 bg-success/10 rounded-lg px-3 py-2">
            <CheckCircle size={13} className="text-success flex-shrink-0" />
            <p className="text-2xs text-success font-medium">
              Audio eliminado del servidor · Privacidad Flash ✓
            </p>
          </div>
        )}
      </div>

      {/* ── Transcripción ────────────────────────────────────────────── */}
      {hasTranscription && !generatedNote && !isGenerating && (
        <div className="mx-4 mt-3">
          <p className="section-title px-0 pt-0">Transcripción</p>
          <div className="card text-xs text-text-secondary leading-relaxed max-h-48 overflow-y-auto">
            {(transcriptionData?.diarizedText ?? session.transcription?.diarizedText ?? "")
              .split("\n")
              .filter(Boolean)
              .map((line, i) => (
                <p key={i} className="mb-1.5">
                  {line.startsWith("[Psicólogo") || line.startsWith("[Paciente") ? (
                    <span className="font-semibold text-primary">{line}</span>
                  ) : line}
                </p>
              ))}
          </div>
        </div>
      )}

      {/* ── Nota generada ────────────────────────────────────────────── */}
      {showNote && (
        <div className="mx-4 mt-3">
          <div className="flex items-center justify-between mb-2">
            <p className="section-title px-0 pt-0">Nota clínica · IA</p>
            {generatedNote && !isGenerating && (
              <button
                onClick={handleRegenerateNote}
                className="text-2xs text-primary font-semibold"
              >
                Regenerar
              </button>
            )}
          </div>

          {/* Tabs formato */}
          <div className="flex gap-1.5 mb-3">
            {(["SOAP", "DAP", "BIRP"] as NoteFormat[]).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setActiveTab(fmt)}
                className={cn(
                  "flex-1 py-2 rounded-lg text-xs font-semibold transition-colors",
                  activeTab === fmt
                    ? "bg-primary text-white"
                    : "bg-surface-secondary text-text-secondary border border-border"
                )}
              >
                {fmt}
              </button>
            ))}
          </div>

          {isGenerating ? (
            <GeneratingState />
          ) : generatedNote ? (
            <>
              {/* Risk alert si se detectó en la nota */}
              {generatedNote.riskAlertCreated && (
                <div className="risk-alert-banner mb-3 mx-0 relative" role="alert">
                  <AlertTriangle size={14} className="text-error flex-shrink-0 mt-0.5" />
                  <p className="text-xs font-bold text-error">
                    Señales de riesgo detectadas en esta sesión. Se ha creado una alerta.
                  </p>
                </div>
              )}

              <NoteViewer
                content={generatedNote.content}
                noteId={generatedNote.noteId}
                sessionId={session.id}
              />
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}

// ─── RecordButton ─────────────────────────────────────────────────────────

interface RecordButtonProps {
  status:   string;
  onStart:  () => void;
  onPause:  () => void;
  onResume: () => void;
  onStop:   () => void;
  disabled: boolean;
}

function RecordButton({ status, onStart, onPause, onResume, onStop, disabled }: RecordButtonProps) {
  const isRecording = status === "recording";
  const isPaused    = status === "paused";
  const isUploading = status === "uploading";

  if (isUploading) {
    return (
      <div className="w-18 h-18 rounded-full bg-primary/20 flex items-center justify-center">
        <Loader2 size={28} className="text-primary animate-spin" />
      </div>
    );
  }

  if (isRecording) {
    return (
      <div className="flex items-center gap-4">
        <button
          onClick={onPause}
          className="w-12 h-12 rounded-full bg-surface border-2 border-border
                     flex items-center justify-center hover:bg-surface-secondary"
          aria-label="Pausar grabación"
        >
          <Pause size={18} className="text-text-secondary" />
        </button>

        <button
          onClick={onStop}
          className="w-18 h-18 rounded-full bg-error flex items-center justify-center
                     shadow-risk animate-pulse-risk no-select"
          style={{ width: 72, height: 72 }}
          aria-label="Detener y transcribir"
        >
          <div className="w-6 h-6 rounded-sm bg-white" />
        </button>
      </div>
    );
  }

  if (isPaused) {
    return (
      <div className="flex items-center gap-4">
        <button
          onClick={onResume}
          className="w-12 h-12 rounded-full bg-primary flex items-center justify-center"
          aria-label="Reanudar grabación"
        >
          <Play size={18} className="text-white" fill="white" />
        </button>

        <button
          onClick={onStop}
          className="w-18 h-18 rounded-full bg-surface border-2 border-error
                     flex items-center justify-center"
          style={{ width: 72, height: 72 }}
          aria-label="Detener y transcribir"
        >
          <div className="w-5 h-5 rounded-sm bg-error" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={onStart}
      disabled={disabled}
      className="rounded-full bg-error flex items-center justify-center
                 hover:bg-error/90 active:scale-95 transition-all no-select
                 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{ width: 72, height: 72, boxShadow: "0 0 0 10px rgba(168,56,54,0.12)" }}
      aria-label="Iniciar grabación"
    >
      <Mic size={28} className="text-white" strokeWidth={2.5} />
    </button>
  );
}

// ─── RecordingStatus ──────────────────────────────────────────────────────

function RecordingStatus({
  status, isGenerating, error,
}: {
  status: string; isGenerating: boolean; error: string | null;
}) {
  if (error) {
    return (
      <p className="text-center text-xs font-medium text-error">{error}</p>
    );
  }

  const labels: Record<string, string> = {
    idle:      "Pulsa para iniciar la grabación",
    recording: "Grabando... Pulsa el cuadrado para terminar",
    paused:    "Grabación en pausa",
    uploading: "Transcribiendo con IA...",
    done:      "Transcripción completada",
    error:     "Error en la grabación",
  };

  if (isGenerating) {
    return (
      <div className="flex items-center justify-center gap-2">
        <Loader2 size={13} className="text-primary animate-spin" />
        <p className="text-xs text-primary font-medium">Generando nota clínica con Claude...</p>
      </div>
    );
  }

  return (
    <p className={cn(
      "text-center text-xs font-medium",
      status === "recording" ? "text-error" :
      status === "done"      ? "text-success" :
      "text-text-tertiary"
    )}>
      {labels[status] ?? ""}
    </p>
  );
}

// ─── GeneratingState ──────────────────────────────────────────────────────

function GeneratingState() {
  return (
    <div className="card-surface flex flex-col items-center py-8 gap-3">
      <div className="w-10 h-10 rounded-full bg-secondary-container-light flex items-center justify-center">
        <FileText size={18} className="text-secondary" />
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-text-primary">Generando nota clínica</p>
        <p className="text-xs text-text-tertiary mt-1">Claude está analizando la transcripción...</p>
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary"
            style={{ animation: `recording-dot 1.2s ${i * 0.2}s ease-in-out infinite` }}
          />
        ))}
      </div>
    </div>
  );
}
