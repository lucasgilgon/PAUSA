/**
 * components/sessions/NewSessionForm.tsx
 *
 * Formulario de nueva sesión: seleccionar paciente, fecha/hora,
 * formato de nota, y confirmar consentimiento de grabación.
 * Crea la sesión vía POST /api/sessions y redirige al grabador.
 */

"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle, Mic, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NoteFormat } from "@/types";

interface PatientOption {
  id:            string;
  displayName:   string;
  totalSessions: number;
}

interface NewSessionFormProps {
  patients:              PatientOption[];
  preselectedPatientId?: string;
}

const NOTE_FORMATS: { value: NoteFormat; label: string; description: string }[] = [
  { value: "SOAP",  label: "SOAP",  description: "Subjetivo · Objetivo · Análisis · Plan" },
  { value: "DAP",   label: "DAP",   description: "Datos · Análisis · Plan" },
  { value: "BIRP",  label: "BIRP",  description: "Comportamiento · Intervención · Respuesta · Plan" },
  { value: "free",  label: "Libre", description: "Nota libre sin estructura fija" },
];

export function NewSessionForm({ patients, preselectedPatientId }: NewSessionFormProps) {
  const router = useRouter();

  // Fecha y hora por defecto = ahora + 5 min
  const defaultDateTime = new Date(Date.now() + 5 * 60_000);
  const defaultDate     = defaultDateTime.toISOString().slice(0, 10);
  const defaultTime     = defaultDateTime.toTimeString().slice(0, 5);

  const [patientId,       setPatientId]       = useState(preselectedPatientId ?? "");
  const [date,            setDate]            = useState(defaultDate);
  const [time,            setTime]            = useState(defaultTime);
  const [duration,        setDuration]        = useState(50);
  const [noteFormat,      setNoteFormat]      = useState<NoteFormat>("SOAP");
  const [consentRecorded, setConsentRecorded] = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState<string | null>(null);

  const handleSubmit = useCallback(async () => {
    if (!patientId) { setError("Selecciona un paciente"); return; }
    if (!consentRecorded) { setError("Confirma el consentimiento de grabación"); return; }

    setSaving(true);
    setError(null);

    try {
      const scheduledAt = new Date(`${date}T${time}`).toISOString();

      const res = await fetch("/api/sessions", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          scheduledAt,
          durationMinutes: duration,
          noteFormat,
          consentRecorded,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(err?.error?.message ?? "Error al crear la sesión");
      }

      const json = await res.json() as { data: { id: string } };
      router.push(`/sessions?sessionId=${json.data.id}`);

    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setSaving(false);
    }
  }, [patientId, date, time, duration, noteFormat, consentRecorded, router]);

  const selectedPatient = patients.find((p) => p.id === patientId);

  return (
    <div className="flex flex-col pb-8">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border">
        <button onClick={() => router.back()} className="btn-icon btn-ghost">
          <ArrowLeft size={18} className="text-text-secondary" />
        </button>
        <h1 className="font-headline text-lg font-bold text-text-primary">Nueva sesión</h1>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4">

        {/* Seleccionar paciente */}
        <div>
          <label className="block text-xs font-bold text-text-secondary uppercase tracking-wide mb-2">
            Paciente *
          </label>
          {patients.length === 0 ? (
            <div className="card-surface text-center py-4">
              <p className="text-sm text-text-tertiary">No hay pacientes activos.</p>
              <a href="/patients/new" className="text-xs text-primary font-semibold mt-1 inline-block">
                Añadir paciente →
              </a>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto border border-border rounded-lg">
              {patients.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPatientId(p.id)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 text-left transition-colors",
                    patientId === p.id
                      ? "bg-primary/10 border-l-2 border-l-primary"
                      : "hover:bg-surface-secondary"
                  )}
                >
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                    patientId === p.id ? "bg-primary text-white" : "bg-surface-tertiary text-text-tertiary"
                  )}>
                    {p.displayName.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{p.displayName}</p>
                    <p className="text-2xs text-text-tertiary">{p.totalSessions} sesiones anteriores</p>
                  </div>
                  {patientId === p.id && <CheckCircle size={14} className="text-primary flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Fecha y hora */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wide mb-2">
              Fecha
            </label>
            <input
              type="date"
              className="input"
              value={date}
              min={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          <div className="flex-1">
            <label className="block text-xs font-bold text-text-secondary uppercase tracking-wide mb-2">
              Hora
            </label>
            <input
              type="time"
              className="input"
              value={time}
              onChange={(e) => setTime(e.target.value)}
            />
          </div>
        </div>

        {/* Duración */}
        <div>
          <label className="block text-xs font-bold text-text-secondary uppercase tracking-wide mb-2">
            Duración — {duration} minutos
          </label>
          <div className="grid grid-cols-4 gap-1.5">
            {[30, 45, 50, 60].map((min) => (
              <button
                key={min}
                onClick={() => setDuration(min)}
                className={cn(
                  "py-2 rounded-lg text-xs font-bold border transition-all",
                  duration === min
                    ? "bg-primary text-white border-primary"
                    : "bg-surface text-text-secondary border-border"
                )}
              >
                {min} min
              </button>
            ))}
          </div>
        </div>

        {/* Formato nota */}
        <div>
          <label className="block text-xs font-bold text-text-secondary uppercase tracking-wide mb-2">
            Formato de nota
          </label>
          <div className="flex flex-col gap-1.5">
            {NOTE_FORMATS.map(({ value, label, description }) => (
              <button
                key={value}
                onClick={() => setNoteFormat(value)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left transition-all",
                  noteFormat === value
                    ? "bg-primary/10 border-primary/40"
                    : "bg-surface border-border hover:border-primary/30"
                )}
              >
                <div className={cn(
                  "w-7 h-7 rounded-md flex items-center justify-center text-2xs font-extrabold flex-shrink-0",
                  noteFormat === value ? "bg-primary text-white" : "bg-surface-tertiary text-text-tertiary"
                )}>
                  {label.slice(0, 1)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{label}</p>
                  <p className="text-2xs text-text-tertiary">{description}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Consentimiento grabación */}
        <label className={cn(
          "flex items-start gap-3 cursor-pointer p-3 rounded-lg border",
          error && !consentRecorded
            ? "bg-error/5 border-error"
            : "bg-surface-secondary border-border"
        )}>
          <input
            type="checkbox"
            checked={consentRecorded}
            onChange={(e) => setConsentRecorded(e.target.checked)}
            className="w-4 h-4 accent-primary flex-shrink-0 mt-0.5"
          />
          <div>
            <p className="text-sm font-semibold text-text-primary flex items-center gap-1.5">
              <Mic size={13} className="text-primary" />
              Consentimiento de grabación confirmado *
            </p>
            <p className="text-xs text-text-tertiary mt-0.5 leading-snug">
              El paciente ha sido informado y ha dado su consentimiento explícito
              para grabar esta sesión (RGPD Art. 9).
            </p>
          </div>
        </label>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-error/10 rounded-lg border border-error/20">
            <AlertTriangle size={13} className="text-error flex-shrink-0" />
            <p className="text-xs text-error">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={saving || !patientId || patients.length === 0}
          className="btn btn-primary w-full gap-2"
        >
          {saving ? (
            <><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />Creando...</>
          ) : (
            <><Mic size={15} strokeWidth={2.5} />Crear e ir al grabador</>
          )}
        </button>

        {selectedPatient && (
          <p className="text-2xs text-text-tertiary text-center">
            Sesión #{selectedPatient.totalSessions + 1} para {selectedPatient.displayName}
          </p>
        )}
      </div>
    </div>
  );
}
