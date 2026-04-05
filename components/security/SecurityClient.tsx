/**
 * components/security/SecurityClient.tsx
 *
 * Client Component — formulario interactivo de configuración RGPD.
 * Cada toggle hace PATCH /api/security optimísticamente.
 * Props: initialSettings (hidratado desde SSR), complianceScore (0-100).
 */

"use client";

import { useState, useCallback, useTransition } from "react";
import { Lock, Shield, Eye, Clock, AlertTriangle, CheckCircle, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface SettingsState {
  twoFactorEnabled:             boolean;
  sessionTimeoutMinutes:        number;
  flashPrivacyEnabled:          boolean;
  autoAnonymizeTranscriptions:  boolean;
  anonymizePatientNames:        boolean;
  anonymizeDates:               boolean;
  anonymizeLocations:           boolean;
  dataRetentionYears:           number;
  autoDeleteEnabled:            boolean;
  autoDeleteNotifyDays:         number;
  dpaSignedWithAnthropic:       boolean;
  dpaSignedAt?:                 string;
  dpaVersion?:                  string | null;
  keyRotationDays:              number;
  lastKeyRotationAt?:           string;
}

interface SecurityClientProps {
  initialSettings:  SettingsState;
  complianceScore:  number;
}

export function SecurityClient({ initialSettings, complianceScore: initialScore }: SecurityClientProps) {
  const [settings, setSettings] = useState<SettingsState>(initialSettings);
  const [score, setScore]       = useState(initialScore);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [, startTransition]     = useTransition();

  const updateSetting = useCallback(
    async <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
      // Optimistic update
      startTransition(() => {
        setSettings((prev) => ({ ...prev, [key]: value }));
        setSaveError(null);
      });

      try {
        const res = await fetch("/api/security", {
          method:  "PATCH",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ [key]: value }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
          throw new Error(err?.error?.message ?? "Error al guardar");
        }

        const json = await res.json() as { data: { compliance: { score: number } } };
        setScore(json.data.compliance.score);

      } catch (err) {
        // Revertir en caso de error
        startTransition(() => {
          setSettings((prev) => ({ ...prev, [key]: initialSettings[key] }));
          setSaveError(err instanceof Error ? err.message : "Error al guardar la configuración");
        });
      }
    },
    [initialSettings]
  );

  const scoreLevel =
    score >= 85 ? "compliant" :
    score >= 60 ? "partial"   :
    "non_compliant";

  const scoreColor =
    scoreLevel === "compliant"     ? "text-success" :
    scoreLevel === "partial"       ? "text-warning"  :
    "text-error";

  const trackColor =
    scoreLevel === "compliant"     ? "bg-success" :
    scoreLevel === "partial"       ? "bg-warning"  :
    "bg-error";

  return (
    <div className="flex flex-col pb-6">

      {/* ── Cumplimiento RGPD ─────────────────────────────────────────── */}
      <div className="mx-4 mt-3 card">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-bold text-text-primary font-headline">Cumplimiento RGPD</p>
          <span className={cn("font-headline text-2xl font-extrabold", scoreColor)}>
            {score}%
          </span>
        </div>

        {/* Barra de progreso */}
        <div className="h-2 bg-surface-tertiary rounded-full overflow-hidden mb-3">
          <div
            className={cn("h-full rounded-full transition-all duration-500", trackColor)}
            style={{ width: `${score}%` }}
          />
        </div>

        <div className="flex items-center gap-1.5">
          {scoreLevel === "compliant" ? (
            <CheckCircle size={13} className="text-success flex-shrink-0" />
          ) : (
            <AlertTriangle size={13} className="text-warning flex-shrink-0" />
          )}
          <p className="text-xs text-text-secondary">
            {scoreLevel === "compliant"
              ? "Cumplimiento satisfactorio"
              : scoreLevel === "partial"
                ? "Cumplimiento parcial — revisa los puntos pendientes"
                : "Cumplimiento insuficiente — acción requerida"}
          </p>
        </div>
      </div>

      {saveError && (
        <div className="mx-4 mt-2 px-3 py-2 bg-error/10 rounded-lg border border-error/20">
          <p className="text-xs text-error font-medium">{saveError}</p>
        </div>
      )}

      {/* ── Sección: Autenticación ─────────────────────────────────────── */}
      <SettingsSection
        icon={<Lock size={15} className="text-primary" />}
        title="Autenticación y acceso"
        iconBg="bg-primary-lt"
      >
        <ToggleRow
          title="Autenticación de dos factores"
          description="TOTP via app autenticadora (recomendado)"
          checked={settings.twoFactorEnabled}
          onChange={(v) => void updateSetting("twoFactorEnabled", v)}
        />
        <ToggleRow
          title="Cierre automático de sesión"
          description={`Tras ${settings.sessionTimeoutMinutes} min de inactividad`}
          checked={settings.sessionTimeoutMinutes <= 30}
          onChange={(v) => void updateSetting("sessionTimeoutMinutes", v ? 30 : 60)}
        />
      </SettingsSection>

      {/* ── Sección: Privacidad ──────────────────────────────────────────── */}
      <SettingsSection
        icon={<Eye size={15} className="text-secondary" />}
        title="Privacidad de datos"
        iconBg="bg-secondary-lt"
      >
        <ToggleRow
          title="Privacidad Flash — audio"
          description="Eliminar audio del servidor inmediatamente tras transcripción"
          checked={settings.flashPrivacyEnabled}
          onChange={(v) => void updateSetting("flashPrivacyEnabled", v)}
          critical
        />
        <ToggleRow
          title="Auto-anonimización de transcripciones"
          description="Reemplaza nombres por [NOMBRE] en transcripciones"
          checked={settings.autoAnonymizeTranscriptions}
          onChange={(v) => void updateSetting("autoAnonymizeTranscriptions", v)}
        />
        <ToggleRow
          title="Anonimizar nombres de pacientes"
          description="Solo activo si auto-anonimización está habilitada"
          checked={settings.anonymizePatientNames}
          onChange={(v) => void updateSetting("anonymizePatientNames", v)}
          disabled={!settings.autoAnonymizeTranscriptions}
        />
        <ToggleRow
          title="Anonimizar fechas"
          description="Reemplaza fechas por [FECHA] en transcripciones"
          checked={settings.anonymizeDates}
          onChange={(v) => void updateSetting("anonymizeDates", v)}
          disabled={!settings.autoAnonymizeTranscriptions}
        />
      </SettingsSection>

      {/* ── Sección: Retención ──────────────────────────────────────────── */}
      <SettingsSection
        icon={<Clock size={15} className="text-warning" />}
        title="Retención de datos"
        iconBg="bg-warning-lt"
      >
        <ToggleRow
          title="Eliminación automática"
          description={`Datos eliminados tras ${settings.dataRetentionYears} años (RGPD Art. 5.1.e)`}
          checked={settings.autoDeleteEnabled}
          onChange={(v) => void updateSetting("autoDeleteEnabled", v)}
        />
        <ToggleRow
          title="Notificación previa"
          description={`Avisar ${settings.autoDeleteNotifyDays} días antes de eliminación`}
          checked={settings.autoDeleteNotifyDays > 0}
          onChange={(v) => void updateSetting("autoDeleteNotifyDays", v ? 30 : 0)}
          disabled={!settings.autoDeleteEnabled}
        />
      </SettingsSection>

      {/* ── Sección: DPA ──────────────────────────────────────────────────── */}
      <SettingsSection
        icon={<FileText size={15} className="text-error" />}
        title="Acuerdos legales"
        iconBg="bg-error/10"
      >
        <div className="px-4 py-3 border-b border-border">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-text-primary">
                DPA con proveedor de IA
              </p>
              <p className="text-xs text-text-tertiary mt-0.5">
                Acuerdo de procesador de datos requerido por RGPD Art. 28
              </p>
              {settings.dpaSignedWithAnthropic ? (
                <div className="flex items-center gap-1 mt-1.5">
                  <CheckCircle size={12} className="text-success" />
                  <span className="text-2xs text-success font-medium">
                    Firmado{settings.dpaVersion ? ` (v${settings.dpaVersion})` : ""}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-1 mt-1.5">
                  <AlertTriangle size={12} className="text-error" />
                  <span className="text-2xs text-error font-semibold">Pendiente — obligatorio</span>
                </div>
              )}
            </div>
            {!settings.dpaSignedWithAnthropic && (
              <button className="btn btn-danger btn-sm flex-shrink-0">
                Firmar
              </button>
            )}
          </div>
        </div>

        {/* Cifrado — siempre activo, no toggleable */}
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-text-primary">Cifrado AES-256-GCM</p>
              <p className="text-xs text-text-tertiary mt-0.5">
                Siempre activo — todos los datos PII cifrados en reposo
              </p>
            </div>
            <Shield size={16} className="text-primary flex-shrink-0" />
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}

// ─── SettingsSection ──────────────────────────────────────────────────────

interface SettingsSectionProps {
  icon:     React.ReactNode;
  title:    string;
  iconBg:   string;
  children: React.ReactNode;
}

function SettingsSection({ icon, title, iconBg, children }: SettingsSectionProps) {
  return (
    <div className="mx-4 mt-3 card overflow-hidden p-0">
      <div className={cn("flex items-center gap-2.5 px-4 py-2.5 border-b border-border bg-surface-secondary")}>
        <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center", iconBg)}>
          {icon}
        </div>
        <p className="text-sm font-bold text-text-primary font-headline">{title}</p>
      </div>
      {children}
    </div>
  );
}

// ─── ToggleRow ────────────────────────────────────────────────────────────

interface ToggleRowProps {
  title:       string;
  description: string;
  checked:     boolean;
  onChange:    (value: boolean) => void;
  disabled?:   boolean;
  critical?:   boolean;
}

function ToggleRow({
  title, description, checked, onChange, disabled = false, critical = false,
}: ToggleRowProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 border-b border-border last:border-0",
        disabled && "opacity-50"
      )}
    >
      <div className="flex-1 min-w-0">
        <p className={cn(
          "text-sm font-medium",
          critical && !checked ? "text-error" : "text-text-primary"
        )}>
          {critical && !checked && (
            <AlertTriangle size={12} className="inline mr-1 mb-px text-error" />
          )}
          {title}
        </p>
        <p className="text-xs text-text-tertiary mt-0.5">{description}</p>
      </div>

      {/* Toggle */}
      <button
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          "toggle-track relative flex-shrink-0",
          "focus:outline-none focus:ring-2 focus:ring-primary/40",
          disabled && "cursor-not-allowed"
        )}
        data-state={checked ? "checked" : "unchecked"}
      >
        <div className="toggle-thumb" />
      </button>
    </div>
  );
}
