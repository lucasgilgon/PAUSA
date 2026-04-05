/**
 * lib/shared/session-flow.ts
 *
 * Máquina de estados del flujo de sesión — portable a web y mobile.
 * NO depende de React, Next.js, ni del DOM.
 * En React Native se usaría exactamente igual.
 *
 * Estados: idle → recording → uploading → transcribed → generating → done
 */

export type SessionFlowState =
  | "idle"
  | "recording"
  | "paused"
  | "uploading"
  | "transcribed"
  | "generating"
  | "done"
  | "error";

export interface SessionFlowTransition {
  from:   SessionFlowState;
  event:  SessionFlowEvent;
  to:     SessionFlowState;
}

export type SessionFlowEvent =
  | "START_RECORDING"
  | "PAUSE_RECORDING"
  | "RESUME_RECORDING"
  | "STOP_RECORDING"
  | "UPLOAD_COMPLETE"
  | "TRANSCRIPTION_READY"
  | "NOTE_GENERATED"
  | "ERROR"
  | "RESET";

// Transiciones válidas — misma lógica en web y mobile
const TRANSITIONS: SessionFlowTransition[] = [
  { from: "idle",        event: "START_RECORDING",     to: "recording"   },
  { from: "recording",   event: "PAUSE_RECORDING",     to: "paused"      },
  { from: "paused",      event: "RESUME_RECORDING",    to: "recording"   },
  { from: "paused",      event: "STOP_RECORDING",      to: "uploading"   },
  { from: "recording",   event: "STOP_RECORDING",      to: "uploading"   },
  { from: "uploading",   event: "UPLOAD_COMPLETE",     to: "transcribed" },
  { from: "transcribed", event: "NOTE_GENERATED",      to: "done"        },
  { from: "transcribed", event: "ERROR",               to: "error"       },
  { from: "uploading",   event: "ERROR",               to: "error"       },
  { from: "recording",   event: "ERROR",               to: "error"       },
  { from: "error",       event: "RESET",               to: "idle"        },
  { from: "done",        event: "RESET",               to: "idle"        },
];

export function transition(
  current: SessionFlowState,
  event:   SessionFlowEvent,
): SessionFlowState {
  const match = TRANSITIONS.find((t) => t.from === current && t.event === event);
  return match ? match.to : current;
}

export function canTransition(
  current: SessionFlowState,
  event:   SessionFlowEvent,
): boolean {
  return TRANSITIONS.some((t) => t.from === current && t.event === event);
}

// Labels de UI — se usan en web Y mobile (solo strings, no JSX)
export const STATE_LABELS: Record<SessionFlowState, string> = {
  idle:        "Listo para grabar",
  recording:   "Grabando...",
  paused:      "Pausado",
  uploading:   "Procesando audio...",
  transcribed: "Transcripción lista",
  generating:  "Generando nota clínica...",
  done:        "Nota lista",
  error:       "Error",
};

export const STATE_IS_LOADING: Record<SessionFlowState, boolean> = {
  idle:        false,
  recording:   false,
  paused:      false,
  uploading:   true,
  transcribed: false,
  generating:  true,
  done:        false,
  error:       false,
};
