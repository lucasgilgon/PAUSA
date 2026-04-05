/**
 * hooks/useWebSpeechRecorder.ts
 *
 * Transcripción en tiempo real usando la Web Speech API del navegador.
 * ✅ Chrome, Edge, Safari 17+
 * ✅ Coste: $0 — corre 100% en el navegador (Hermes del browser)
 * ✅ Sin backend, sin OpenAI, sin nada externo
 * ✅ Español nativo (es-ES)
 *
 * Flujo:
 *   startRecording() → SpeechRecognition corre en tiempo real
 *   stopRecording()  → devuelve el texto completo acumulado
 */

"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type WebSpeechStatus =
  | "idle"
  | "recording"
  | "done"
  | "error"
  | "unsupported";

interface UseWebSpeechOptions {
  language?:     string;   // default "es-ES"
  onTranscribed?: (text: string) => void;
  onError?:       (msg: string) => void;
}

// Detectar soporte antes de renderizar
export function isWebSpeechSupported(): boolean {
  if (typeof window === "undefined") return false;
  return "SpeechRecognition" in window || "webkitSpeechRecognition" in window;
}

export function useWebSpeechRecorder({
  language = "es-ES",
  onTranscribed,
  onError,
}: UseWebSpeechOptions = {}) {
  const [status,         setStatus]         = useState<WebSpeechStatus>("idle");
  const [liveText,       setLiveText]       = useState("");   // texto en tiempo real
  const [finalText,      setFinalText]      = useState("");   // texto final acumulado
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const recognitionRef  = useRef<any>(null);
  const timerRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const accumulatedRef  = useRef("");   // texto final acumulado entre restarts
  const liveTextRef     = useRef("");   // espejo de liveText para callbacks (evita stale closure)

  // Limpiar al desmontar
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      recognitionRef.current?.abort();
    };
  }, []);

  const createRecognition = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const r  = new SR();

    r.continuous      = true;
    r.interimResults  = true;
    r.lang            = language;
    r.maxAlternatives = 1;

    r.onresult = (event: any) => {
      let interimChunk = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript: string = result[0].transcript;
        const confidence: number = result[0].confidence ?? 1;

        if (result.isFinal) {
          // Filtrar resultados de muy baja confianza (ruido / fallo de reconocimiento)
          if (confidence < 0.25) continue;

          // Capitalizar inicio de frase y añadir punto si la frase no termina ya con puntuación
          const trimmed = transcript.trim();
          if (!trimmed) continue;

          const sentence = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
          const withPunct = /[.!?,;]$/.test(sentence) ? sentence : sentence + ".";
          accumulatedRef.current += withPunct + " ";
        } else {
          interimChunk += transcript;
        }
      }
      const displayText = accumulatedRef.current + interimChunk;
      setLiveText(displayText);
      liveTextRef.current = displayText;
    };

    r.onerror = (event: any) => {
      // "aborted" es un error esperado cuando detenemos nosotros — ignorar
      if (event.error === "aborted" || event.error === "no-speech") return;
      setStatus("error");
      onError?.(`Speech error: ${event.error}`);
    };

    // Los navegadores detienen el reconocimiento tras ~60s de silencio.
    // Reiniciamos automáticamente para sesiones largas.
    r.onend = () => {
      if (recognitionRef.current === r) {
        try { r.start(); } catch { /* ya parado */ }
      }
    };

    return r;
  }, [language, onError]);

  const startRecording = useCallback(() => {
    if (!isWebSpeechSupported()) {
      setStatus("unsupported");
      onError?.("Web Speech API no disponible en este navegador");
      return;
    }

    accumulatedRef.current = "";
    liveTextRef.current    = "";
    setLiveText("");
    setFinalText("");
    setElapsedSeconds(0);

    const r = createRecognition();
    recognitionRef.current = r;
    r.start();
    setStatus("recording");

    timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
  }, [createRecognition, onError]);

  const stopRecording = useCallback(() => {
    if (!recognitionRef.current) return;

    // Desconectar handler onend para que no se reinicie
    const r = recognitionRef.current;
    recognitionRef.current = null;
    r.abort();

    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }

    // Usar liveTextRef (incluye interim) o accumulated (solo finales)
    // Esto evita perder texto si el usuario para en medio de una frase
    const text = (liveTextRef.current || accumulatedRef.current).trim();
    setFinalText(text);
    setLiveText(text);
    setStatus("done");

    // Solo llamar onTranscribed si hay texto real
    if (text) {
      onTranscribed?.(text);
    } else {
      onError?.("No se detectó audio. Por favor habla durante la grabación.");
    }
  }, [onTranscribed, onError]);

  const reset = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    accumulatedRef.current = "";
    liveTextRef.current    = "";
    setStatus(isWebSpeechSupported() ? "idle" : "unsupported");
    setLiveText("");
    setFinalText("");
    setElapsedSeconds(0);
  }, []);

  return {
    status,
    liveText,
    finalText,
    elapsedSeconds,
    isSupported:  isWebSpeechSupported(),
    isRecording:  status === "recording",
    isDone:       status === "done",
    startRecording,
    stopRecording,
    reset,
  };
}
