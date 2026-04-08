/**
 * hooks/useTranscription.ts
 *
 * Combina grabación de audio (MediaRecorder) con envío a /api/transcribe
 * (Chirp 3 en backend). Reemplaza el uso directo de useAudioRecorder
 * en componentes que necesiten acceso a la transcripción resultante.
 *
 * Estados: idle → recording → paused → uploading → done | error
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import type { TranscriptionResult } from "@/hooks/useAudioRecorder";

export type { TranscriptionResult } from "@/hooks/useAudioRecorder";

export type TranscriptionStatus =
  | "idle"
  | "recording"
  | "paused"
  | "uploading"
  | "done"
  | "error";

export interface TranscriptionError {
  code:
    | "PERMISSION_DENIED"
    | "NOT_SUPPORTED"
    | "UPLOAD_FAILED"
    | "USAGE_LIMIT_REACHED"
    | "TRANSCRIPTION_FAILED"
    | "UNKNOWN";
  message: string;
}

interface UseTranscriptionOptions {
  sessionId:       string;
  onTranscribed?:  (result: TranscriptionResult) => void;
  onError?:        (err: TranscriptionError) => void;
}

function getSupportedMimeType(): string {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
  ];
  for (const mime of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return "";
}

export function useTranscription({
  sessionId,
  onTranscribed,
  onError,
}: UseTranscriptionOptions) {
  const [status,        setStatus]        = useState<TranscriptionStatus>("idle");
  const [elapsedSecs,   setElapsedSecs]   = useState(0);
  const [waveform,      setWaveform]      = useState<number[]>(Array(24).fill(6));
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null);
  const [error,         setError]         = useState<TranscriptionError | null>(null);

  const recorderRef    = useRef<MediaRecorder | null>(null);
  const chunksRef      = useRef<Blob[]>([]);
  const streamRef      = useRef<MediaStream | null>(null);
  const timerRef       = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef    = useRef<AnalyserNode | null>(null);
  const animFrameRef   = useRef<number | null>(null);
  const startTimeRef   = useRef<number>(0);

  useEffect(() => {
    return () => {
      stopTimerAndViz();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const stopTimerAndViz = useCallback(() => {
    if (timerRef.current)    clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    timerRef.current     = null;
    animFrameRef.current = null;
  }, []);

  const startViz = useCallback((stream: MediaStream) => {
    const ctx      = new AudioContext();
    const analyser = ctx.createAnalyser();
    ctx.createMediaStreamSource(stream).connect(analyser);
    analyser.fftSize = 64;
    analyserRef.current = analyser;
    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteFrequencyData(data);
      setWaveform(
        Array.from({ length: 24 }, (_, i) => {
          const val = data[Math.floor((i / 24) * data.length)] ?? 0;
          return Math.max(4, Math.min(36, (val / 255) * 36));
        }),
      );
      animFrameRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, []);

  const stopViz = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setWaveform(Array(24).fill(6));
  }, []);

  // ── Start recording ──────────────────────────────────────────────────────

  const startRecording = useCallback(async () => {
    if (status !== "idle") return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000, channelCount: 1 },
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType  = getSupportedMimeType();
      const recorder  = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onerror = () => {
        const err: TranscriptionError = { code: "UNKNOWN", message: "Error en la grabación" };
        setError(err);
        setStatus("error");
        onError?.(err);
      };

      recorder.start(1000);
      setStatus("recording");
      setElapsedSecs(0);

      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedSecs(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 500);

      startViz(stream);
    } catch (err) {
      const isDenied = err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
      const recErr: TranscriptionError = isDenied
        ? { code: "PERMISSION_DENIED", message: "Permiso de micrófono denegado" }
        : { code: "NOT_SUPPORTED",     message: "El micrófono no está disponible" };
      setError(recErr);
      setStatus("error");
      onError?.(recErr);
    }
  }, [status, startViz, onError]);

  // ── Pause / Resume ───────────────────────────────────────────────────────

  const pauseRecording = useCallback(() => {
    if (status !== "recording" || !recorderRef.current) return;
    recorderRef.current.pause();
    stopTimerAndViz();
    stopViz();
    setStatus("paused");
  }, [status, stopTimerAndViz, stopViz]);

  const resumeRecording = useCallback(() => {
    if (status !== "paused" || !recorderRef.current || !streamRef.current) return;
    recorderRef.current.resume();
    setStatus("recording");
    startTimeRef.current = Date.now() - elapsedSecs * 1000;
    timerRef.current = setInterval(() => {
      setElapsedSecs(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 500);
    startViz(streamRef.current);
  }, [status, elapsedSecs, startViz]);

  // ── Stop + upload ────────────────────────────────────────────────────────

  const stopAndTranscribe = useCallback(async () => {
    if ((status !== "recording" && status !== "paused") || !recorderRef.current) return;

    stopTimerAndViz();
    stopViz();

    await new Promise<void>((resolve) => {
      const rec = recorderRef.current!;
      rec.onstop = () => resolve();
      rec.stop();
    });

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    setStatus("uploading");

    const rawMime  = recorderRef.current?.mimeType ?? "audio/webm";
    const mimeType = rawMime.split(";")[0]?.trim() ?? "audio/webm";
    const ext      = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm";
    const blob     = new Blob(chunksRef.current, { type: mimeType });
    chunksRef.current = [];

    const form = new FormData();
    form.append("sessionId", sessionId);
    form.append("audio",     blob, `session-${sessionId}.${ext}`);

    try {
      const res = await fetch("/api/transcribe", { method: "POST", body: form });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as {
          error?: { code?: string; message?: string };
        };
        const code = body?.error?.code;
        if (code === "USAGE_LIMIT_REACHED") {
          const err: TranscriptionError = {
            code:    "USAGE_LIMIT_REACHED",
            message: body?.error?.message ?? "Límite de uso alcanzado",
          };
          setError(err);
          setStatus("error");
          onError?.(err);
          return;
        }
        throw Object.assign(
          new Error(body?.error?.message ?? "Error al transcribir"),
          { code: code ?? "UPLOAD_FAILED" },
        );
      }

      const json   = await res.json() as { data: TranscriptionResult };
      const result = json.data;

      if (!result.audioDeletedAt) {
        console.error("PRIVACY WARNING: server did not confirm audio deletion");
      }

      setTranscription(result);
      setStatus("done");
      onTranscribed?.(result);
    } catch (err) {
      const recErr: TranscriptionError = {
        code:    "TRANSCRIPTION_FAILED",
        message: err instanceof Error ? err.message : "Error al procesar el audio",
      };
      setError(recErr);
      setStatus("error");
      onError?.(recErr);
    }
  }, [status, sessionId, stopTimerAndViz, stopViz, onTranscribed, onError]);

  // ── Reset ────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    stopTimerAndViz();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current   = null;
    recorderRef.current = null;
    chunksRef.current   = [];
    setStatus("idle");
    setElapsedSecs(0);
    setWaveform(Array(24).fill(6));
    setTranscription(null);
    setError(null);
  }, [stopTimerAndViz]);

  return {
    status,
    elapsedSecs,
    waveform,
    transcription,
    error,
    isRecording:  status === "recording",
    isPaused:     status === "paused",
    isUploading:  status === "uploading",
    isDone:       status === "done",
    startRecording,
    pauseRecording,
    resumeRecording,
    stopAndTranscribe,
    reset,
  };
}
