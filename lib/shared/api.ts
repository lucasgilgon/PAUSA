/**
 * lib/shared/api.ts
 *
 * Cliente de API 100% portable — funciona en Next.js (web) y React Native (mobile).
 * NO usa window, document, localStorage ni ninguna API del navegador.
 * En RN se usaría con fetch nativo (ya disponible) o axios.
 *
 * Arquitectura: todas las llamadas pasan por este módulo.
 * Web:    BASE_URL = '' (same-origin)
 * Mobile: BASE_URL = 'https://api.pausa.app' o túnel de desarrollo
 */

// En Next.js esto viene de env, en RN de react-native-config o similar
const BASE_URL =
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_API_URL
    ? process.env.NEXT_PUBLIC_API_URL
    : "";

// ─── Tipos compartidos ────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?:   T;
  error?:  { code: string; message: string };
}

export interface PaginatedResponse<T> {
  items:      T[];
  total:      number;
  page:       number;
  limit:      number;
  totalPages: number;
  hasMore:    boolean;
}

// ─── Helper base ──────────────────────────────────────────────────────────

async function apiFetch<T>(
  path:    string,
  options: RequestInit = {},
  token?:  string,
): Promise<ApiResponse<T>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string> ?? {}),
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;

  try {
    const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
    const json = await res.json() as ApiResponse<T>;
    return json;
  } catch (err) {
    return {
      success: false,
      error: { code: "NETWORK_ERROR", message: "Error de conexión" },
    };
  }
}

// ─── Patients API ─────────────────────────────────────────────────────────

export const patientsApi = {
  list: (token?: string) =>
    apiFetch<PaginatedResponse<PatientListItem>>("/api/patients", {}, token),

  get: (id: string, token?: string) =>
    apiFetch<PatientDetail>(`/api/patients/${id}`, {}, token),

  create: (data: CreatePatientPayload, token?: string) =>
    apiFetch<{ id: string }>("/api/patients", {
      method: "POST",
      body:   JSON.stringify(data),
    }, token),

  update: (id: string, data: Partial<CreatePatientPayload>, token?: string) =>
    apiFetch<{ id: string }>(`/api/patients/${id}`, {
      method: "PATCH",
      body:   JSON.stringify(data),
    }, token),
};

// ─── Sessions API ─────────────────────────────────────────────────────────

export const sessionsApi = {
  list: (token?: string) =>
    apiFetch<PaginatedResponse<SessionListItem>>("/api/sessions", {}, token),

  get: (id: string, token?: string) =>
    apiFetch<SessionDetail>(`/api/sessions/${id}`, {}, token),

  create: (data: CreateSessionPayload, token?: string) =>
    apiFetch<{ id: string; sessionNumber: number }>("/api/sessions", {
      method: "POST",
      body:   JSON.stringify(data),
    }, token),

  transcribe: (sessionId: string, audioBlob: Blob, token?: string) => {
    const form = new FormData();
    form.append("audio", audioBlob, "session.webm");
    form.append("sessionId", sessionId);
    return fetch(`${BASE_URL}/api/transcribe`, {
      method:  "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body:    form,
    }).then((r) => r.json() as Promise<ApiResponse<TranscriptionResult>>);
  },
};

// ─── Notes API ────────────────────────────────────────────────────────────

export const notesApi = {
  generate: (sessionId: string, token?: string) =>
    apiFetch<NoteResult>("/api/notes", {
      method: "POST",
      body:   JSON.stringify({ sessionId }),
    }, token),

  update: (noteId: string, data: UpdateNotePayload, token?: string) =>
    apiFetch<{ id: string }>(`/api/notes/${noteId}`, {
      method: "PATCH",
      body:   JSON.stringify(data),
    }, token),
};

// ─── Security API ─────────────────────────────────────────────────────────

export const securityApi = {
  get: (token?: string) =>
    apiFetch<SecuritySettings>("/api/security", {}, token),

  update: (data: Partial<SecuritySettings>, token?: string) =>
    apiFetch<SecuritySettings>("/api/security", {
      method: "PATCH",
      body:   JSON.stringify(data),
    }, token),
};

// ─── Risk Alerts API ──────────────────────────────────────────────────────

export const riskAlertsApi = {
  acknowledge: (alertId: string, notes: string, token?: string) =>
    apiFetch(`/api/risk-alerts/${alertId}/acknowledge`, {
      method: "POST",
      body:   JSON.stringify({ notes }),
    }, token),
};

// ─── Types (shared payload types, NO Prisma) ──────────────────────────────

export interface PatientListItem {
  id:              string;
  shortId:         string;
  displayName:     string;
  initials:        string;
  status:          string;
  currentRisk:     string;
  therapyModality: string;
  totalSessions:   number;
  lastSessionAt?:  string;
  nextSessionAt?:  string;
  ageYears?:       number;
}

export interface PatientDetail extends PatientListItem {
  consentGiven:        boolean;
  dataRetentionUntil?: string;
  createdAt:           string;
}

export interface CreatePatientPayload {
  firstName:       string;
  lastName:        string;
  dateOfBirth:     string;
  therapyModality: string;
  consentGiven:    boolean;
  retentionYears?: number;
  email?:          string;
  phone?:          string;
  diagnosisCodes?: string[];
}

export interface SessionListItem {
  id:            string;
  patientId:     string;
  patientName:   string;
  sessionNumber: number;
  status:        string;
  noteFormat:    string;
  scheduledAt:   string;
  currentRisk:   string;
  hasNote:       boolean;
}

export interface SessionDetail extends SessionListItem {
  consentRecorded: boolean;
  transcription:   { id: string; diarizedText: string; wordCount: number } | null;
  note:            { id: string; status: string; content: Record<string, string> } | null;
}

export interface CreateSessionPayload {
  patientId:        string;
  scheduledAt:      string;
  durationMinutes?: number;
  noteFormat?:      string;
  consentRecorded:  boolean;
}

export interface TranscriptionResult {
  transcriptionId: string;
  diarizedText:    string;
  wordCount:       number;
}

export interface NoteResult {
  noteId:            string;
  content:           Record<string, string>;
  detectedRiskLevel: string;
  riskAlertCreated:  boolean;
}

export interface UpdateNotePayload {
  content?:  Record<string, string>;
  action?:   "sign";
}

export interface SecuritySettings {
  twoFactorEnabled:            boolean;
  sessionTimeoutMinutes:       number;
  flashPrivacyEnabled:         boolean;
  autoAnonymizeTranscriptions: boolean;
  dataRetentionYears:          number;
  dpaSignedWithAnthropic:      boolean;
}
