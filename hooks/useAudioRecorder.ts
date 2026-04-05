/**
 * hooks/useAudioRecorder.ts
 *
 * Hook de grabación de audio con la MediaRecorder API del navegador.
 * Estados: idle → recording → paused → stopped → uploading → done | error
 * Privacidad Flash: el Blob de audio se borra de memoria tras transcripción.
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type RecorderStatus =
  | "idle"
  | "recording"
  | "paused"
  | "stopped"
  | "uploading"
  | "done"
  | "error";

export interface RecorderError {
  code:    "PERMISSION_DENIED" | "NOT_SUPPORTED" | "UPLOAD_FAILED" | "USAGE_LIMIT_REACHED" | "UNKNOWN";
  message: string;
}

export interface TranscriptionResult {
  transcriptionId:  string;
  sessionId:        string;
  fullText:         string;
  diarizedText:     string;
  language:         string;
  durationSeconds:  number;
  wordCount:        number;
  speakerCount:     number;
  isAnonymized:     boolean;
  audioDeletedAt:   string;
}

interface UseAudioRecorderOptions {
  sessionId:     string;
  onTranscribed?: (result: TranscriptionResult) => void;
  onError?:       (err: RecorderError) => void;
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
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  return "";
}

export function useAudioRecorder({
  sessionId,
  onTranscribed,
  onError,
}: UseAudioRecorderOptions) {
  const [status,           setStatus]           = useState<RecorderStatus>("idle");
  const [elapsedSeconds,   setElapsedSeconds]   = useState(0);
  const [waveformData,     setWaveformData]      = useState<number[]>(Array(24).fill(6));
  const [transcription,    setTranscription]     = useState<TranscriptionResult | null>(null);
  const [recorderError,    setRecorderError]     = useState<RecorderError | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef        = useRef<Blob[]>([]);
  const streamRef        = useRef<MediaStream | null>(null);
  const timerRef         = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyserRef      = useRef<AnalyserNode | null>(null);
  const animFrameRef     = useRef<number | null>(null);
  const startTimeRef     = useRef<number>(0);

  useEffect(() => {
    return () => {
      stopTimerAndAnimation();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const stopTimerAndAnimation = useCallback(() => {
    if (timerRef.current)    clearInterval(timerRef.current);
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    timerRef.current    = null;
    animFrameRef.current = null;
  }, []);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now() - elapsedSeconds * 1000;
    timerRef.current = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 500);
  }, [elapsedSeconds]);

  const startWaveformAnimation = useCallback((stream: MediaStream) => {
    const ctx      = new AudioContext();
    const analyser = ctx.createAnalyser();
    const source   = ctx.createMediaStreamSource(stream);
    analyser.fftSize = 64;
    source.connect(analyser);
    analyserRef.current = analyser;

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    const animate = () => {
      analyser.getByteFrequencyData(dataArray);
      const bars = Array.from({ length: 24 }, (_, i) => {
        const idx = Math.floor((i / 24) * dataArray.length);
        const val = dataArray[idx] ?? 0;
        return Math.max(4, Math.min(36, (val / 255) * 36));
      });
      setWaveformData(bars);
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animate();
  }, []);

  const stopWaveformAnimation = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    setWaveformData(Array(24).fill(6));
  }, []);

  const startRecording = useCallback(async () => {
    if (status !== "idle" && status !== "stopped") return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation:   true,
          noiseSuppression:   true,
          sampleRate:         44100,
          channelCount:       1,
        },
      });

      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType   = getSupportedMimeType();
      const recorder   = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onerror = () => {
        const err: RecorderError = { code: "UNKNOWN", message: "Error en la grabación" };
        setRecorderError(err);
        setStatus("error");
        onError?.(err);
      };

      recorder.start(1000);
      setStatus("recording");
      setElapsedSeconds(0);
      startTimer();
      startWaveformAnimation(stream);

    } catch (err) {
      const isDenied =
        err instanceof DOMException &&
        (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");

      const recErr: RecorderError = isDenied
        ? { code: "PERMISSION_DENIED", message: "Permiso de micrófono denegado" }
        : { code: "NOT_SUPPORTED",     message: "El micrófono no está disponible" };

      setRecorderError(recErr);
      setStatus("error");
      onError?.(recErr);
    }
  }, [status, startTimer, startWaveformAnimation, onError]);

  const pauseRecording = useCallback(() => {
    if (status !== "recording" || !mediaRecorderRef.current) return;
    mediaRecorderRef.current.pause();
    stopTimerAndAnimation();
    stopWaveformAnimation();
    setStatus("paused");
  }, [status, stopTimerAndAnimation, stopWaveformAnimation]);

  const resumeRecording = useCallback(() => {
    if (status !== "paused" || !mediaRecorderRef.current || !streamRef.current) return;
    mediaRecorderRef.current.resume();
    setStatus("recording");
    startTimer();
    startWaveformAnimation(streamRef.current);
  }, [status, startTimer, startWaveformAnimation]);

  const stopAndTranscribe = useCallback(async () => {
    if ((status !== "recording" && status !== "paused") || !mediaRecorderRef.current) return;

    stopTimerAndAnimation();
    stopWaveformAnimation();

    await new Promise<void>((resolve) => {
      const recorder = mediaRecorderRef.current!;
      recorder.onstop = () => resolve();
      recorder.stop();
    });

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    setStatus("uploading");

    // Normalizar MIME: "audio/webm;codecs=opus" → "audio/webm"
    // Safari graba en audio/mp4, Chrome en audio/webm — ambos válidos para Whisper
    const rawMime   = mediaRecorderRef.current.mimeType || "audio/webm";
    const mimeType  = rawMime.split(";")[0].trim();   // quita ;codecs=opus etc.
    const ext       = mimeType.includes("mp4") ? "m4a" : mimeType.includes("ogg") ? "ogg" : "webm";
    const audioBlob = new Blob(chunksRef.current, { type: mimeType });

    chunksRef.current = [];

    const formData = new FormData();
    formData.append("sessionId", sessionId);
    formData.append("audio",     audioBlob, `session-${sessionId}.${ext}`);

    try {
      const res = await fetch("/api/transcribe", {
        method: "POST",
        body:   formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: { code?: string; message?: string } };
        const code = err?.error?.code ?? "UPLOAD_FAILED";
        throw Object.assign(new Error(err?.error?.message ?? "Error al transcribir"), { code });
      }

      const json   = await res.json() as { data: TranscriptionResult };
      const result = json.data;

      if (!result.audioDeletedAt) {
        console.error("PRIVACY WARNING: Server did not confirm audio deletion");
      }

      setTranscription(result);
      setStatus("done");
      onTranscribed?.(result);

    } catch (err) {
      const code    = (err as any)?.code ?? "UPLOAD_FAILED";
      const recErr: RecorderError = {
        code,
        message: err instanceof Error ? err.message : "Error al subir el audio",
      };
      setRecorderError(recErr);
      setStatus("error");
      onError?.(recErr);
    }
  }, [status, sessionId, stopTimerAndAnimation, stopWaveformAnimation, onTranscribed, onError]);

  const reset = useCallback(() => {
    stopTimerAndAnimation();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current        = null;
    mediaRecorderRef.current = null;
    chunksRef.current        = [];
    setStatus("idle");
    setElapsedSeconds(0);
    setWaveformData(Array(24).fill(6));
    setTranscription(null);
    setRecorderError(null);
  }, [stopTimerAndAnimation]);

  return {
    status,
    elapsedSeconds,
    waveformData,
    transcription,
    error: recorderError,
    isRecording: status === "recording",
    isPaused:    status === "paused",
    isUploading: status === "uploading",
    isDone:      status === "done",
    startRecording,
    pauseRecording,
    resumeRecording,
    stopAndTranscribe,
    reset,
  };
}
