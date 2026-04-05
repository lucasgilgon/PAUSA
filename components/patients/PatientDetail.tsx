/**
 * components/patients/PatientDetail.tsx
 *
 * Vista de detalle con 3 pestañas:
 * - overview: ficha clínica + próxima sesión
 * - sessions: historial de sesiones
 * - risk: alertas de riesgo (tab resaltado si hay alertas activas)
 */

"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  ArrowLeft, AlertTriangle, Mic, FileText,
  Shield, CheckCircle, Clock, ChevronRight,
  Lock, Calendar,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn, formatSessionDate, formatRelativeTime, riskToLabel, isHighRisk } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────

interface PatientData {
  id:              string;
  shortId:         string;
  displayName:     string;
  fullName:        string;
  initials:        string;
  ageYears?:       number;
  isAnonymized:    boolean;
  status:          string;
  currentRisk:     string;
  therapyModality: string;
  diagnosisCodes:  string[];
  totalSessions:   number;
  lastSessionAt?:  string;
  nextSessionAt?:  string;
  consentGiven:    boolean;
  createdAt:       string;
  dataRetentionUntil?: string;
}

interface SessionItem {
  id:              string;
  sessionNumber:   number;
  status:          string;
  noteFormat:      string;
  scheduledAt:     string;
  durationMinutes?: number;
  hasNote:         boolean;
  noteStatus?:     string;
}

interface RiskAlertItem {
  id:              string;
  level:           string;
  type:            string;
  detectedAt:      string;
  acknowledgedAt?: string;
  autoDetected:    boolean;
  keywords:        string[];
}

interface PatientDetailProps {
  patient:      PatientData;
  sessions:     SessionItem[];
  riskAlerts:   RiskAlertItem[];
  initialTab:   string;
}

type Tab = "overview" | "sessions" | "risk";

// ─── Component ────────────────────────────────────────────────────────────

export function PatientDetail({
  patient, sessions, riskAlerts, initialTab,
}: PatientDetailProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>(
    (initialTab as Tab) ?? "overview"
  );

  const highRisk          = isHighRisk(patient.currentRisk as never);
  const unacknowledgedRisk = riskAlerts.filter((a) => !a.acknowledgedAt);
  const hasActiveRisk     = unacknowledgedRisk.length > 0;

  const handleAcknowledge = useCallback(async (alertId: string) => {
    await fetch(`/api/risk-alerts/${alertId}/acknowledge`, { method: "POST" });
    router.refresh();
  }, [router]);

  return (
    <div className="flex flex-col pb-8">

      {/* ── Header ───────────────────────────────────────────────────── */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-4">
          <button onClick={() => router.back()} className="btn-icon btn-ghost">
            <ArrowLeft size={18} className="text-text-secondary" />
          </button>
          <h1 className="font-headline text-lg font-bold text-text-primary flex-1 truncate">
            {patient.displayName}
          </h1>
          <Link
            href={`/sessions/new?patientId=${patient.id}`}
            className="btn btn-primary btn-sm gap-1.5"
          >
            <Mic size={13} strokeWidth={2.5} />
            Nueva sesión
          </Link>
        </div>

        {/* Risk banner prominente */}
        {hasActiveRisk && (
          <div className="risk-alert-banner mb-3 relative mx-0" role="alert">
            <div className="w-7 h-7 rounded-full bg-error flex items-center justify-center flex-shrink-0">
              <AlertTriangle size={13} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-bold text-error">
                {unacknowledgedRisk.length} alerta{unacknowledgedRisk.length > 1 ? "s" : ""} de riesgo sin revisar
              </p>
              <button
                onClick={() => setActiveTab("risk")}
                className="text-2xs text-error underline mt-0.5"
              >
                Ver alertas →
              </button>
            </div>
          </div>
        )}

        {/* Avatar + stats */}
        <div className="flex items-center gap-4">
          <div className={cn(
            "patient-avatar w-16 h-16 text-lg",
            highRisk ? "patient-avatar--risk" :
            patient.isAnonymized ? "patient-avatar--anon" :
            "patient-avatar--default"
          )}>
            {patient.initials}
          </div>
          <div className="flex-1">
            {!patient.isAnonymized && (
              <p className="text-base font-bold text-text-primary font-headline">
                {patient.fullName}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5 mt-1">
              <span className={cn("badge", highRisk ? "badge-risk" : "badge-active")}>
                {highRisk ? riskToLabel(patient.currentRisk as never) : "Activo"}
              </span>
              <span className="badge badge-neutral">{patient.therapyModality}</span>
              {patient.ageYears && (
                <span className="badge badge-neutral">{patient.ageYears} años</span>
              )}
            </div>
            <div className="enc-badge mt-1.5">
              <Lock size={9} />
              AES-256{patient.isAnonymized ? " · Anónimo" : ""}
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs ─────────────────────────────────────────────────────── */}
      <div className="flex border-b border-border px-4">
        {(["overview", "sessions", "risk"] as Tab[]).map((tab) => {
          const labels: Record<Tab, string> = {
            overview: "Ficha",
            sessions: `Sesiones (${sessions.length})`,
            risk:     hasActiveRisk ? `⚠ Riesgo (${unacknowledgedRisk.length})` : "Riesgo",
          };
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 py-3 text-xs font-semibold border-b-2 transition-colors",
                activeTab === tab
                  ? tab === "risk" && hasActiveRisk
                    ? "border-error text-error"
                    : "border-primary text-primary"
                  : "border-transparent text-text-tertiary hover:text-text-secondary"
              )}
            >
              {labels[tab]}
            </button>
          );
        })}
      </div>

      {/* ── Tab: Overview ────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="px-4 pt-4 flex flex-col gap-3">

          {/* Próxima sesión */}
          {patient.nextSessionAt && (
            <div className="card-surface flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar size={16} className="text-primary" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-text-tertiary">Próxima sesión</p>
                <p className="text-sm font-semibold text-text-primary">
                  {formatSessionDate(patient.nextSessionAt)}
                </p>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <StatCard label="Sesiones totales" value={String(patient.totalSessions)} />
            <StatCard
              label="En tratamiento desde"
              value={new Date(patient.createdAt).getFullYear().toString()}
            />
            {patient.lastSessionAt && (
              <StatCard
                label="Última sesión"
                value={formatRelativeTime(patient.lastSessionAt)}
                fullWidth
              />
            )}
          </div>

          {/* Diagnósticos */}
          {patient.diagnosisCodes.length > 0 && (
            <div className="card">
              <p className="text-xs font-bold text-text-tertiary uppercase tracking-wide mb-2">
                Diagnósticos
              </p>
              <div className="flex flex-wrap gap-1.5">
                {patient.diagnosisCodes.map((code) => (
                  <span key={code} className="badge badge-neutral font-mono">{code}</span>
                ))}
              </div>
            </div>
          )}

          {/* RGPD info */}
          <div className="card">
            <p className="text-xs font-bold text-text-tertiary uppercase tracking-wide mb-3">
              Estado RGPD
            </p>
            <div className="flex flex-col gap-2">
              <RgpdRow
                label="Consentimiento"
                value={patient.consentGiven ? "Obtenido" : "Pendiente"}
                ok={patient.consentGiven}
              />
              {patient.dataRetentionUntil && (
                <RgpdRow
                  label="Retención hasta"
                  value={new Date(patient.dataRetentionUntil).getFullYear().toString()}
                  ok
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Sessions ────────────────────────────────────────────── */}
      {activeTab === "sessions" && (
        <div className="flex flex-col">
          {sessions.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <Mic size={24} className="text-text-tertiary" />
              <p className="text-sm text-text-secondary">Sin sesiones registradas</p>
              <Link
                href={`/sessions/new?patientId=${patient.id}`}
                className="btn btn-primary btn-sm"
              >
                <Mic size={13} /> Primera sesión
              </Link>
            </div>
          ) : (
            sessions.map((session) => (
              <Link
                key={session.id}
                href={`/sessions?sessionId=${session.id}`}
                className="flex items-center gap-3 px-4 py-3 border-b border-border hover:bg-surface-secondary transition-colors"
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
                  session.hasNote ? "bg-success/10 text-success" : "bg-surface-tertiary text-text-tertiary"
                )}>
                  {session.hasNote
                    ? <FileText size={14} />
                    : <span>#{session.sessionNumber}</span>
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary">
                    Sesión #{session.sessionNumber}
                  </p>
                  <p className="text-xs text-text-tertiary">
                    {formatSessionDate(session.scheduledAt)}
                    {session.durationMinutes ? ` · ${session.durationMinutes} min` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {session.hasNote && (
                    <span className="badge badge-success text-2xs">Nota</span>
                  )}
                  <ChevronRight size={14} className="text-text-tertiary" />
                </div>
              </Link>
            ))
          )}
        </div>
      )}

      {/* ── Tab: Risk ────────────────────────────────────────────────── */}
      {activeTab === "risk" && (
        <div className="px-4 pt-4 flex flex-col gap-3">
          {riskAlerts.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-3">
              <Shield size={24} className="text-success" />
              <p className="text-sm text-text-secondary">Sin alertas de riesgo registradas</p>
            </div>
          ) : (
            riskAlerts.map((alert) => {
              const isUnack = !alert.acknowledgedAt;
              const isCrit  = alert.level === "critical";
              return (
                <div
                  key={alert.id}
                  className={cn(
                    "card border",
                    isUnack && isCrit ? "border-error bg-error/5" :
                    isUnack           ? "border-error/40" :
                    "border-border opacity-70"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0",
                      isCrit ? "bg-error text-white" : "bg-error/20 text-error"
                    )}>
                      <AlertTriangle size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn("badge text-2xs", isCrit ? "badge-risk" : "badge-risk")}>
                          {riskToLabel(alert.level as never)}
                        </span>
                        {alert.autoDetected && (
                          <span className="badge badge-ai text-2xs">IA</span>
                        )}
                        {!isUnack && (
                          <span className="badge badge-neutral text-2xs">Revisada</span>
                        )}
                      </div>
                      <p className="text-xs text-text-secondary">
                        {formatRelativeTime(alert.detectedAt)}
                      </p>
                      {alert.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {alert.keywords.slice(0, 4).map((kw) => (
                            <span key={kw} className="text-2xs bg-error/10 text-error px-1.5 py-0.5 rounded">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {isUnack && (
                    <button
                      onClick={() => void handleAcknowledge(alert.id)}
                      className="btn btn-outline btn-sm w-full mt-3 gap-1.5"
                    >
                      <CheckCircle size={13} />
                      Marcar como revisada
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function StatCard({ label, value, fullWidth = false }: {
  label: string; value: string; fullWidth?: boolean;
}) {
  return (
    <div className={cn("card-surface p-3", fullWidth && "col-span-2")}>
      <p className="text-2xs text-text-tertiary">{label}</p>
      <p className="text-sm font-bold text-text-primary mt-0.5">{value}</p>
    </div>
  );
}

function RgpdRow({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-text-tertiary">{label}</span>
      <div className="flex items-center gap-1.5">
        {ok
          ? <CheckCircle size={12} className="text-success" />
          : <AlertTriangle size={12} className="text-warning" />
        }
        <span className="text-xs font-semibold text-text-primary">{value}</span>
      </div>
    </div>
  );
}
