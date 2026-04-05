/**
 * components/patients/NewPatientForm.tsx
 *
 * Formulario completo de creación de paciente.
 * Validación cliente con Zod antes de enviar al servidor.
 * Campos: nombre, apellidos, fecha nacimiento, modalidad terapéutica,
 *         diagnósticos CIE-10, contacto de emergencia, consentimiento RGPD.
 *
 * El servidor cifra todos los campos PII con AES-256-GCM antes de guardar.
 */

"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { ArrowLeft, AlertTriangle, CheckCircle, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Validación cliente ───────────────────────────────────────────────────

const FormSchema = z.object({
  firstName:       z.string().min(1, "Nombre requerido").max(100),
  lastName:        z.string().min(1, "Apellidos requeridos").max(100),
  dateOfBirth:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato: YYYY-MM-DD"),
  therapyModality: z.enum(["TCC", "ACT", "DBT", "EMDR", "psico", "other"]),
  email:           z.string().email("Email inválido").optional().or(z.literal("")),
  phone:           z.string().max(20).optional().or(z.literal("")),
  emergencyName:   z.string().max(100).optional().or(z.literal("")),
  emergencyPhone:  z.string().max(20).optional().or(z.literal("")),
  isAnonymized:    z.boolean(),
  consentGiven:    z.boolean(),
  retentionYears:  z.number().int().min(1).max(10),
});

type FormData = z.infer<typeof FormSchema>;
type FormErrors = Partial<Record<keyof FormData, string>>;

const MODALITIES = [
  { value: "TCC",   label: "TCC — Cognitivo-conductual" },
  { value: "ACT",   label: "ACT — Aceptación y compromiso" },
  { value: "DBT",   label: "DBT — Conductual dialéctica" },
  { value: "EMDR",  label: "EMDR" },
  { value: "psico", label: "Psicoanálisis / Psicodinámica" },
  { value: "other", label: "Otra" },
] as const;

// ─── Component ────────────────────────────────────────────────────────────

export function NewPatientForm() {
  const router = useRouter();

  const [form, setForm] = useState<FormData>({
    firstName:       "",
    lastName:        "",
    dateOfBirth:     "",
    therapyModality: "TCC",
    email:           "",
    phone:           "",
    emergencyName:   "",
    emergencyPhone:  "",
    isAnonymized:    false,
    consentGiven:    false,
    retentionYears:  5,
  });

  const [errors,    setErrors]    = useState<FormErrors>({});
  const [diagCodes, setDiagCodes] = useState<string[]>([]);
  const [diagInput, setDiagInput] = useState("");
  const [saving,    setSaving]    = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const setField = useCallback(<K extends keyof FormData>(k: K, v: FormData[K]) => {
    setForm((prev) => ({ ...prev, [k]: v }));
    setErrors((prev) => { const next = { ...prev }; delete next[k]; return next; });
  }, []);

  // Añadir código CIE-10
  const addDiagCode = useCallback(() => {
    const code = diagInput.trim().toUpperCase();
    if (code && !diagCodes.includes(code) && diagCodes.length < 10) {
      setDiagCodes((prev) => [...prev, code]);
      setDiagInput("");
    }
  }, [diagInput, diagCodes]);

  // ─── Submit ───────────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    // Validación local
    const result = FormSchema.safeParse(form);
    if (!result.success) {
      const fieldErrors: FormErrors = {};
      result.error.issues.forEach((issue) => {
        const key = issue.path[0] as keyof FormData;
        fieldErrors[key] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (!form.consentGiven) {
      setErrors({ consentGiven: "El consentimiento del paciente es obligatorio (RGPD)" });
      return;
    }

    setSaving(true);
    setSaveError(null);

    try {
      const res = await fetch("/api/patients", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          diagnosisCodes: diagCodes,
          contact: {
            email:          form.email || undefined,
            phone:          form.phone || undefined,
            emergencyName:  form.emergencyName  || undefined,
            emergencyPhone: form.emergencyPhone || undefined,
          },
          status: "active",
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(err?.error?.message ?? "Error al crear paciente");
      }

      const json = await res.json() as { data: { id: string } };
      router.push(`/patients/${json.data.id}`);

    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Error desconocido");
      setSaving(false);
    }
  }, [form, diagCodes, router]);

  return (
    <div className="flex flex-col pb-8">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-border">
        <button
          onClick={() => router.back()}
          className="btn-icon btn-ghost"
          aria-label="Volver"
        >
          <ArrowLeft size={18} className="text-text-secondary" />
        </button>
        <h1 className="font-headline text-lg font-bold text-text-primary">
          Nuevo paciente
        </h1>
      </div>

      <div className="flex flex-col gap-0 px-4 pt-4">

        {/* ── Datos personales ────────────────────────────────────────── */}
        <SectionTitle>Datos personales</SectionTitle>

        <div className="flex gap-3">
          <Field label="Nombre *" error={errors.firstName} className="flex-1">
            <input
              className={cn("input", errors.firstName && "input--error")}
              value={form.firstName}
              onChange={(e) => setField("firstName", e.target.value)}
              placeholder="Ana"
              autoComplete="given-name"
            />
          </Field>
          <Field label="Apellidos *" error={errors.lastName} className="flex-1">
            <input
              className={cn("input", errors.lastName && "input--error")}
              value={form.lastName}
              onChange={(e) => setField("lastName", e.target.value)}
              placeholder="García López"
              autoComplete="family-name"
            />
          </Field>
        </div>

        <Field label="Fecha de nacimiento *" error={errors.dateOfBirth}>
          <input
            type="date"
            className={cn("input", errors.dateOfBirth && "input--error")}
            value={form.dateOfBirth}
            onChange={(e) => setField("dateOfBirth", e.target.value)}
            max={new Date().toISOString().split("T")[0]}
          />
        </Field>

        {/* ── Anonimización ─────────────────────────────────────────── */}
        <label className="flex items-center gap-3 py-3 border-b border-border cursor-pointer">
          <input
            type="checkbox"
            checked={form.isAnonymized}
            onChange={(e) => setField("isAnonymized", e.target.checked)}
            className="w-4 h-4 accent-primary flex-shrink-0"
          />
          <div>
            <p className="text-sm font-medium text-text-primary">
              Anonimizar automáticamente
            </p>
            <p className="text-xs text-text-tertiary">
              El paciente aparecerá como &ldquo;Anon. P-XXXXXX&rdquo; en la interfaz
            </p>
          </div>
        </label>

        {/* ── Modalidad terapéutica ─────────────────────────────────── */}
        <SectionTitle className="mt-4">Tratamiento</SectionTitle>

        <Field label="Modalidad terapéutica *" error={errors.therapyModality}>
          <select
            className="input"
            value={form.therapyModality}
            onChange={(e) => setField("therapyModality", e.target.value as FormData["therapyModality"])}
          >
            {MODALITIES.map(({ value, label }) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </Field>

        {/* Diagnósticos CIE-10 */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-text-secondary mb-1.5">
            Códigos CIE-10 / DSM-5 (opcional)
          </p>
          <div className="flex gap-2">
            <input
              className="input flex-1 text-sm"
              value={diagInput}
              onChange={(e) => setDiagInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addDiagCode()}
              placeholder="F41.1, F33.0..."
              maxLength={10}
            />
            <button
              onClick={addDiagCode}
              className="btn btn-outline btn-sm px-3"
              type="button"
            >
              <Plus size={14} />
            </button>
          </div>
          {diagCodes.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {diagCodes.map((code) => (
                <span key={code} className="badge badge-neutral gap-1">
                  {code}
                  <button
                    onClick={() => setDiagCodes((p) => p.filter((c) => c !== code))}
                    className="hover:text-error transition-colors"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Contacto ──────────────────────────────────────────────── */}
        <SectionTitle className="mt-2">Contacto (opcional)</SectionTitle>

        <Field label="Email" error={errors.email}>
          <input
            type="email"
            className={cn("input", errors.email && "input--error")}
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            placeholder="paciente@email.com"
            autoComplete="email"
          />
        </Field>

        <Field label="Teléfono">
          <input
            type="tel"
            className="input"
            value={form.phone}
            onChange={(e) => setField("phone", e.target.value)}
            placeholder="+34 600 000 000"
          />
        </Field>

        <div className="flex gap-3">
          <Field label="Contacto emergencia" className="flex-1">
            <input
              className="input"
              value={form.emergencyName}
              onChange={(e) => setField("emergencyName", e.target.value)}
              placeholder="Nombre"
            />
          </Field>
          <Field label="Teléfono emergencia" className="flex-1">
            <input
              type="tel"
              className="input"
              value={form.emergencyPhone}
              onChange={(e) => setField("emergencyPhone", e.target.value)}
              placeholder="+34 600..."
            />
          </Field>
        </div>

        {/* ── RGPD ────────────────────────────────────────────────────── */}
        <SectionTitle className="mt-2">Consentimiento RGPD</SectionTitle>

        {/* Retención */}
        <div className="mb-4">
          <p className="text-xs font-semibold text-text-secondary mb-1.5">
            Retención de datos del paciente
          </p>
          <div className="grid grid-cols-4 gap-1.5">
            {[3, 5, 7, 10].map((years) => (
              <button
                key={years}
                type="button"
                onClick={() => setField("retentionYears", years)}
                className={cn(
                  "py-2 rounded-lg text-xs font-bold border transition-all",
                  form.retentionYears === years
                    ? "bg-primary text-white border-primary"
                    : "bg-surface text-text-secondary border-border"
                )}
              >
                {years} años
              </button>
            ))}
          </div>
        </div>

        {/* Checkbox consentimiento */}
        <label
          className={cn(
            "flex items-start gap-3 cursor-pointer p-3 rounded-lg border mb-4",
            errors.consentGiven
              ? "bg-error/5 border-error"
              : "bg-surface-secondary border-border"
          )}
        >
          <input
            type="checkbox"
            checked={form.consentGiven}
            onChange={(e) => setField("consentGiven", e.target.checked)}
            className="w-4 h-4 accent-primary flex-shrink-0 mt-0.5"
          />
          <div>
            <p className="text-sm font-semibold text-text-primary">
              El paciente ha dado su consentimiento *
            </p>
            <p className="text-xs text-text-tertiary mt-0.5 leading-snug">
              Confirmo que este paciente ha sido informado del tratamiento de sus datos
              y ha dado su consentimiento explícito conforme al RGPD Art. 9.
            </p>
          </div>
        </label>

        {errors.consentGiven && (
          <div className="flex items-center gap-2 mb-3 text-error">
            <AlertTriangle size={13} />
            <p className="text-xs font-medium">{errors.consentGiven}</p>
          </div>
        )}

        {saveError && (
          <div className="flex items-center gap-2 mb-3 p-3 bg-error/10 rounded-lg border border-error/20">
            <AlertTriangle size={13} className="text-error flex-shrink-0" />
            <p className="text-xs text-error">{saveError}</p>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="btn btn-primary w-full gap-2"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Creando paciente...
            </>
          ) : (
            <>
              <CheckCircle size={16} />
              Crear paciente
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Helpers de UI ────────────────────────────────────────────────────────

function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("section-title px-0 pt-0 pb-2", className)}>
      {children}
    </p>
  );
}

function Field({
  label, error, children, className,
}: {
  label: string; error?: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn("mb-3", className)}>
      <label className="block text-xs font-semibold text-text-secondary mb-1">
        {label}
      </label>
      {children}
      {error && (
        <p className="text-2xs text-error mt-1 flex items-center gap-1">
          <AlertTriangle size={10} />
          {error}
        </p>
      )}
    </div>
  );
}
