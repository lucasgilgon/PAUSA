/**
 * components/sessions/SessionsList.tsx
 *
 * Client Component. Lista de sesiones recientes + botón "Nueva sesión".
 * Props: sessions[] (del Server Component), preselectedPatientId opcional.
 */

"use client";

import Link from "next/link";
import { Mic, FileText, Clock, AlertTriangle, Plus } from "lucide-react";
import { cn, formatSessionDate } from "@/lib/utils";

interface SessionItem {
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

interface SessionsListProps {
  sessions:               SessionItem[];
  preselectedPatientId?:  string;
}

const STATUS_CONFIG: Record<string, { label: string; badgeClass: string; icon?: React.ReactNode }> = {
  scheduled:   { label: "Programada",  badgeClass: "badge-neutral" },
  recording:   { label: "En curso",    badgeClass: "badge-active" },
  processing:  { label: "Procesando",  badgeClass: "bg-warning/10 text-warning border border-warning/20" },
  transcribed: { label: "Transcrita",  badgeClass: "bg-secondary-lt text-secondary" },
  generating:  { label: "Generando",   badgeClass: "bg-secondary-lt text-secondary" },
  draft:       { label: "Borrador",    badgeClass: "bg-primary/10 text-primary border border-primary/20" },
  reviewed:    { label: "Revisada",    badgeClass: "badge-success" },
  signed:      { label: "Firmada",     badgeClass: "badge-success" },
  cancelled:   { label: "Cancelada",   badgeClass: "badge-neutral" },
};

export function SessionsList({ sessions, preselectedPatientId }: SessionsListProps) {
  const newSessionHref = preselectedPatientId
    ? `/sessions/new?patientId=${preselectedPatientId}`
    : "/sessions/new";

  return (
    <div className="flex flex-col">
      {/* Header con CTA */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <p className="font-headline text-base font-bold text-text-primary">Sesiones</p>
        <Link href={newSessionHref} className="btn btn-primary btn-sm gap-1">
          <Plus size={13} strokeWidth={2.5} />
          Nueva
        </Link>
      </div>

      {sessions.length === 0 ? (
        <div className="flex flex-col items-center py-12 gap-3">
          <div className="w-12 h-12 rounded-full bg-surface-tertiary flex items-center justify-center">
            <Mic size={20} className="text-text-tertiary" />
          </div>
          <p className="text-sm text-text-secondary">No hay sesiones recientes</p>
          <Link href={newSessionHref} className="btn btn-primary btn-sm">
            <Plus size={14} />
            Crear primera sesión
          </Link>
        </div>
      ) : (
        <div className="flex flex-col">
          {sessions.map((session) => {
            const config   = STATUS_CONFIG[session.status] ?? STATUS_CONFIG["scheduled"]!;
            const highRisk = session.currentRisk === "high" || session.currentRisk === "critical";

            return (
              <Link
                key={session.id}
                href={`/sessions?sessionId=${session.id}`}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 border-b border-border",
                  "hover:bg-surface-secondary transition-colors",
                  highRisk && "border-l-2 border-l-error"
                )}
              >
                {/* Icono */}
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0",
                    session.status === "signed" || session.status === "reviewed"
                      ? "bg-success/10"
                      : session.status === "recording"
                        ? "bg-error/10"
                        : "bg-surface-tertiary"
                  )}
                >
                  {session.status === "draft" || session.status === "signed" || session.status === "reviewed"
                    ? <FileText size={16} className="text-primary" />
                    : session.status === "recording"
                      ? <Mic size={16} className="text-error" />
                      : <Clock size={16} className="text-text-tertiary" />
                  }
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    {highRisk && <AlertTriangle size={11} className="text-error flex-shrink-0" />}
                    <p className={cn(
                      "text-sm font-semibold truncate",
                      highRisk ? "text-error" : "text-text-primary"
                    )}>
                      {session.patientName}
                    </p>
                  </div>
                  <p className="text-xs text-text-tertiary">
                    Sesión #{session.sessionNumber} · {formatSessionDate(session.scheduledAt)}
                  </p>
                </div>

                {/* Badge */}
                <span className={cn("badge text-2xs whitespace-nowrap", config.badgeClass)}>
                  {config.label}
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
