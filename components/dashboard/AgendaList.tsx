/**
 * components/dashboard/AgendaList.tsx
 *
 * Props:
 * - sessions: sesiones del día ordenadas por scheduledAt
 * - now: ISO string del momento actual (para calcular "en curso" / "pasada")
 *
 * Server Component — solo renderiza, sin estado.
 * Los estados visuales (en curso, pasada, alerta) se calculan a partir
 * del status de la sesión y la hora actual.
 */

import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

type SessionWithPatient = Prisma.SessionGetPayload<{
  include: {
    patient: {
      select: {
        id: true; shortId: true; isAnonymized: true;
        firstName: true; lastName: true; currentRisk: true;
      };
    };
  };
}>;

interface AgendaListProps {
  sessions: SessionWithPatient[];
  now:      string;
}

type AgendaState = "done" | "active" | "next" | "upcoming" | "risk" | "cancelled";

function getAgendaState(
  session: SessionWithPatient,
  nowMs: number
): AgendaState {
  if (session.status === "cancelled") return "cancelled";

  const isHighRisk =
    session.patient.currentRisk === "high" ||
    session.patient.currentRisk === "critical";
  if (isHighRisk) return "risk";

  const scheduledMs = new Date(session.scheduledAt).getTime();
  const durationMs  = (session.durationMinutes ?? 50) * 60_000;
  const endMs       = scheduledMs + durationMs;

  if (session.status === "recording") return "active";
  if (nowMs > endMs)                  return "done";
  if (scheduledMs - nowMs < 30 * 60_000) return "next"; // < 30 min
  return "upcoming";
}

const STATE_CONFIG: Record<AgendaState, {
  dotClass:  string;
  tagLabel:  string;
  tagClass:  string;
}> = {
  active:    { dotClass: "bg-primary",    tagLabel: "En curso",    tagClass: "badge-active" },
  next:      { dotClass: "bg-secondary",  tagLabel: "Próxima",     tagClass: "bg-secondary-lt text-secondary" },
  done:      { dotClass: "bg-border-strong", tagLabel: "Realizada",  tagClass: "badge-neutral" },
  upcoming:  { dotClass: "bg-border-strong", tagLabel: "Pendiente",  tagClass: "badge-neutral" },
  risk:      { dotClass: "bg-error",      tagLabel: "⚠ Riesgo",   tagClass: "badge-risk" },
  cancelled: { dotClass: "bg-border",     tagLabel: "Cancelada",   tagClass: "badge-neutral" },
};

function getDisplayName(patient: SessionWithPatient["patient"]): string {
  if (patient.isAnonymized) return `Anon. P-${patient.shortId}`;
  return `${patient.firstName} ${patient.lastName.charAt(0)}.`;
}

export function AgendaList({ sessions, now }: AgendaListProps) {
  const nowMs = new Date(now).getTime();

  if (sessions.length === 0) {
    return (
      <>
        <p className="section-title">Agenda de hoy</p>
        <p className="text-sm text-text-tertiary text-center py-6 px-4">
          No hay sesiones programadas para hoy.
        </p>
      </>
    );
  }

  return (
    <>
      <p className="section-title">Agenda de hoy</p>

      <div className="flex flex-col">
        {sessions.map((session) => {
          const state  = getAgendaState(session, nowMs);
          const config = STATE_CONFIG[state];
          const timeStr = format(new Date(session.scheduledAt), "HH:mm", { locale: es });

          return (
            <Link
              key={session.id}
              href={`/sessions/${session.id}`}
              className="flex items-center gap-3 px-4 py-2.5
                         border-b border-border hover:bg-surface-secondary
                         transition-colors"
            >
              {/* Hora */}
              <span className="font-headline text-xs font-semibold text-text-secondary w-10 flex-shrink-0">
                {timeStr}
              </span>

              {/* Dot de estado */}
              <span
                className={cn(
                  "w-2 h-2 rounded-full flex-shrink-0",
                  config.dotClass,
                  state === "active" && "ring-2 ring-primary/30"
                )}
              />

              {/* Nombre del paciente */}
              <span
                className={cn(
                  "flex-1 text-sm font-medium truncate",
                  state === "risk" ? "text-error" : "text-text-primary"
                )}
              >
                {getDisplayName(session.patient)}
              </span>

              {/* Badge de estado */}
              <span className={cn("badge text-2xs", config.tagClass)}>
                {config.tagLabel}
              </span>
            </Link>
          );
        })}
      </div>
    </>
  );
}
