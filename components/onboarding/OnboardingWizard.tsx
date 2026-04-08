/**
 * components/onboarding/OnboardingWizard.tsx
 *
 * Wizard de 3 pasos sin librerías externas.
 * Paso 1: Bienvenida + preferencias de nota
 * Paso 2: RGPD — acepta términos, elige retención, entiende DPA
 * Paso 3: Confirmación + ir al dashboard
 */

"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import {
  CheckCircle, Shield, FileText, ChevronRight,
  Lock, Mic, Brain, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { NoteFormat } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────

interface OnboardingData {
  defaultNoteFormat:   NoteFormat;
  retentionYears:      number;
  autoAnonymize:       boolean;
  flashPrivacy:        boolean;
  rgpdConsentAccepted: boolean;
}

const STEPS = ["Bienvenida", "RGPD", "Listo"] as const;

// ─── Component ────────────────────────────────────────────────────────────

export function OnboardingWizard() {
  const router   = useRouter();
  const { user } = useUser();

  const [step, setStep]       = useState(0);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState<string | null>(null);

  const [data, setData] = useState<OnboardingData>({
    defaultNoteFormat:   "SOAP",
    retentionYears:      5,
    autoAnonymize:       true,
    flashPrivacy:        true,
    rgpdConsentAccepted: false,
  });

  const update = useCallback(<K extends keyof OnboardingData>(
    key: K, value: OnboardingData[K]
  ) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ─── Guardar configuración en el servidor ─────────────────────────────
  const handleFinish = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/security", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flashPrivacyEnabled:           data.flashPrivacy,
          autoAnonymizeTranscriptions:   data.autoAnonymize,
          anonymizePatientNames:         data.autoAnonymize,
          dataRetentionYears:            data.retentionYears,
          autoDeleteEnabled:             true,
          twoFactorEnabled:              false,
          sessionTimeoutMinutes:         30,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar configuración");
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
      setSaving(false);
    }
  }, [data, router]);

  const firstName = user?.firstName ?? "Psicólog@";

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="font-headline text-3xl font-extrabold text-primary">
            Pau<span className="text-secondary">sa</span>
          </h1>
        </div>

        {/* Indicador de pasos */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                i < step  ? "bg-success text-white" :
                i === step ? "bg-primary text-white" :
                "bg-surface-tertiary text-text-tertiary"
              )}>
                {i < step ? <CheckCircle size={14} /> : i + 1}
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  "w-8 h-0.5 transition-all",
                  i < step ? "bg-success" : "bg-border"
                )} />
              )}
            </div>
          ))}
        </div>

        {/* ── Paso 0: Bienvenida ─────────────────────────────────────── */}
        {step === 0 && (
          <div className="card animate-slide-in-up">
            <div className="text-center mb-6">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Brain size={28} className="text-primary" />
              </div>
              <h2 className="font-headline text-xl font-bold text-text-primary">
                Hola, {firstName} 👋
              </h2>
              <p className="text-sm text-text-secondary mt-2">
                Configura Pausa en 2 minutos. Empieza eligiendo tu formato de nota preferido.
              </p>
            </div>

            {/* Features */}
            <div className="flex flex-col gap-3 mb-6">
              {[
                { icon: Mic,      text: "Graba sesiones — el audio se elimina tras transcribir" },
                { icon: FileText, text: "Notas SOAP/DAP/BIRP generadas con IA local (Ollama)" },
                { icon: Lock,     text: "Datos cifrados AES-256 · Cumplimiento RGPD" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-secondary-lt flex items-center justify-center flex-shrink-0">
                    <Icon size={15} className="text-secondary" />
                  </div>
                  <p className="text-sm text-text-secondary leading-snug">{text}</p>
                </div>
              ))}
            </div>

            {/* Formato por defecto */}
            <div className="mb-6">
              <p className="text-xs font-bold text-text-tertiary uppercase tracking-wide mb-2">
                Formato de nota por defecto
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(["SOAP", "DAP", "BIRP"] as NoteFormat[]).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => update("defaultNoteFormat", fmt)}
                    className={cn(
                      "py-2.5 rounded-lg text-xs font-bold border transition-all",
                      data.defaultNoteFormat === fmt
                        ? "bg-primary text-white border-primary"
                        : "bg-surface text-text-secondary border-border hover:border-primary/50"
                    )}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
              <p className="text-2xs text-text-tertiary mt-1.5">
                {data.defaultNoteFormat === "SOAP" && "Subjetivo · Objetivo · Análisis · Plan"}
                {data.defaultNoteFormat === "DAP"  && "Datos · Análisis · Plan"}
                {data.defaultNoteFormat === "BIRP" && "Comportamiento · Intervención · Respuesta · Plan"}
              </p>
            </div>

            <button
              onClick={() => setStep(1)}
              className="btn btn-primary w-full gap-2"
            >
              Continuar
              <ChevronRight size={16} />
            </button>
          </div>
        )}

        {/* ── Paso 1: RGPD ──────────────────────────────────────────── */}
        {step === 1 && (
          <div className="card animate-slide-in-up">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Shield size={20} className="text-primary" />
              </div>
              <div>
                <h2 className="font-headline text-lg font-bold text-text-primary">
                  Configuración RGPD
                </h2>
                <p className="text-xs text-text-tertiary">Obligatorio por ley — art. 5, 25 y 32</p>
              </div>
            </div>

            {/* Privacidad Flash */}
            <ToggleOption
              title="Privacidad Flash"
              description="El audio de las sesiones se elimina del servidor inmediatamente tras la transcripción. Recomendado."
              checked={data.flashPrivacy}
              onChange={(v) => update("flashPrivacy", v)}
              critical={!data.flashPrivacy}
            />

            {/* Auto-anonimización */}
            <ToggleOption
              title="Auto-anonimización"
              description="Los nombres de pacientes se reemplazan por [NOMBRE] en las transcripciones automáticamente."
              checked={data.autoAnonymize}
              onChange={(v) => update("autoAnonymize", v)}
            />

            {/* Retención de datos */}
            <div className="mb-4">
              <p className="text-sm font-semibold text-text-primary mb-1">
                Retención de datos
              </p>
              <p className="text-xs text-text-tertiary mb-2">
                Los datos de pacientes se eliminarán automáticamente pasado este tiempo (RGPD Art. 5.1.e).
              </p>
              <div className="grid grid-cols-4 gap-1.5">
                {[3, 5, 7, 10].map((years) => (
                  <button
                    key={years}
                    onClick={() => update("retentionYears", years)}
                    className={cn(
                      "py-2 rounded-lg text-xs font-bold border transition-all",
                      data.retentionYears === years
                        ? "bg-primary text-white border-primary"
                        : "bg-surface text-text-secondary border-border"
                    )}
                  >
                    {years} años
                  </button>
                ))}
              </div>
            </div>

            {/* Consentimiento RGPD */}
            <label className="flex items-start gap-3 cursor-pointer mb-5 p-3 rounded-lg bg-surface-secondary border border-border">
              <input
                type="checkbox"
                checked={data.rgpdConsentAccepted}
                onChange={(e) => update("rgpdConsentAccepted", e.target.checked)}
                className="mt-0.5 accent-primary w-4 h-4 flex-shrink-0"
              />
              <p className="text-xs text-text-secondary leading-relaxed">
                Confirmo que soy psicólogo/a colegiado/a y procesaré datos de pacientes conforme al
                <span className="font-semibold text-primary"> RGPD (UE) 2016/679</span>,
                obteniendo consentimiento explícito de cada paciente antes de grabar.
              </p>
            </label>

            {/* DPA aviso */}
            <div className="flex items-start gap-2 p-3 bg-warning/10 rounded-lg border border-warning/20 mb-5">
              <AlertTriangle size={13} className="text-warning flex-shrink-0 mt-0.5" />
              <p className="text-2xs text-warning leading-relaxed">
                <span className="font-bold">Recuerda:</span> La IA se ejecuta localmente con Ollama — los datos de pacientes
                no salen de tu red. Confirma igualmente el cumplimiento RGPD desde Seguridad → Acuerdos legales.
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(0)}
                className="btn btn-ghost flex-1"
              >
                Atrás
              </button>
              <button
                onClick={() => data.rgpdConsentAccepted && setStep(2)}
                disabled={!data.rgpdConsentAccepted}
                className="btn btn-primary flex-1 gap-2"
              >
                Continuar
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* ── Paso 2: Listo ──────────────────────────────────────────── */}
        {step === 2 && (
          <div className="card animate-slide-in-up text-center">
            <div className="w-16 h-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={32} className="text-success" />
            </div>

            <h2 className="font-headline text-xl font-bold text-text-primary mb-2">
              ¡Todo listo, {firstName}!
            </h2>
            <p className="text-sm text-text-secondary mb-6">
              Pausa está configurado y listo para tu primera sesión.
            </p>

            {/* Resumen configuración */}
            <div className="text-left flex flex-col gap-2 mb-6">
              {[
                { label: "Formato notas",    value: data.defaultNoteFormat },
                { label: "Retención datos",  value: `${data.retentionYears} años` },
                { label: "Privacidad Flash", value: data.flashPrivacy ? "Activada" : "Desactivada" },
                { label: "Auto-anonimización", value: data.autoAnonymize ? "Activada" : "Desactivada" },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-xs text-text-tertiary">{label}</span>
                  <span className="text-xs font-semibold text-text-primary">{value}</span>
                </div>
              ))}
            </div>

            {error && (
              <p className="text-xs text-error mb-3">{error}</p>
            )}

            <button
              onClick={handleFinish}
              disabled={saving}
              className="btn btn-primary w-full gap-2"
            >
              {saving ? "Configurando..." : "Ir al dashboard"}
              {!saving && <ChevronRight size={16} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── ToggleOption ─────────────────────────────────────────────────────────

function ToggleOption({
  title, description, checked, onChange, critical = false,
}: {
  title: string; description: string;
  checked: boolean; onChange: (v: boolean) => void; critical?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 mb-4 pb-4 border-b border-border last:border-0">
      <div className="flex-1">
        <p className={cn("text-sm font-semibold", critical ? "text-error" : "text-text-primary")}>
          {critical && <AlertTriangle size={12} className="inline mr-1 mb-px text-error" />}
          {title}
        </p>
        <p className="text-xs text-text-tertiary mt-0.5 leading-snug">{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className="toggle-track flex-shrink-0 mt-0.5"
        data-state={checked ? "checked" : "unchecked"}
      >
        <div className="toggle-thumb" />
      </button>
    </div>
  );
}
