/**
 * components/dashboard/NextSessionCard.tsx
 *
 * Props:
 * - session: próxima sesión con datos del paciente (puede ser null)
 * - unacknowledgedRisks: número de alertas sin revisar (badge en botón)
 *
 * Arquitectura Server Component: no necesita estado, solo renderiza.
 * El botón "Iniciar sesión" es un link a /sessions/[id].
 */

import Link from "next/link";
import { Mic, Clock, ChevronRight, AlertTriangle } from "lucide-react";
import { formatSessionDate, formatDuration } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { Prisma } from "@prisma/client";

// Tipo inferido del include en la query del dashboard
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

interface NextSessionCardProps {
  session:              SessionWithPatient | null;
  unacknowledgedRisks:  number;
}

function getPatientDisplayName(patient: SessionWithPatient["patient"]): string {
  if (patient.isAnonymized) return `Anon. P-${patient.shortId}`;
  // Los nombres vienen cifrados de DB — en prod se descifran en el API layer.
  // Aquí asumimos que el Server Component recibe datos ya descifrados.
  return `${patient.firstName} ${patient.lastName.charAt(0)}.`;
}

export function NextSessionCard({
  session,
  unacknowledgedRisks,
}: NextSessionCardProps) {

  if (!session) {
    return (
      <div className="mx-4 mt-3 card-surface flex flex-col items-center py-6 gap-2">
        <div className="w-10 h-10 rounded-full bg-surface-tertiary flex items-center justify-center">
          <Clock size={18} className="text-text-tertiary" />
        </div>
        <p className="text-sm font-medium text-text-secondary">
          No hay más sesiones hoy
        </p>
        <Link
          href="/sessions/new"
          className="btn btn-outline btn-sm mt-1"
        >
          Crear sesión
        </Link>
      </div>
    );
  }

  const patient      = session.patient;
  const displayName  = getPatientDisplayName(patient);
  const isHighRisk   = patient.currentRisk === "high" || patient.currentRisk === "critical";
  const minutesUntil = Math.max(
    0,
    Math.round((new Date(session.scheduledAt).getTime() - Date.now()) / 60_000)
  );

  return (
    <div
      className={cn(
        "mx-4 mt-3 rounded-xl p-4 text-white relative overflow-hidden",
        isHighRisk
          ? "bg-error"
          : "bg-primary"
      )}
    >
      {/* Decoración de fondo */}
      <div
        className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 bg-white"
        aria-hidden
      />

      {/* Alerta de riesgo en el paciente */}
      {isHighRisk && (
        <div className="flex items-center gap-1.5 mb-2">
          <AlertTriangle size={12} className="text-white/90" />
          <span className="text-2xs font-bold text-white/90 uppercase tracking-wide">
            Paciente con alerta de riesgo
          </span>
        </div>
      )}

      {/* Label */}
      <p className="text-2xs text-white/70 font-medium mb-1">Próxima sesión</p>

      {/* Nombre del paciente */}
      <h2 className="font-headline text-lg font-bold leading-tight mb-0.5">
        {displayName}
      </h2>

      {/* Metadatos */}
      <p className="text-sm text-white/80">
        {formatSessionDate(session.scheduledAt instanceof Date ? session.scheduledAt.toISOString() : session.scheduledAt)}
        {session.durationMinutes ? ` · ${formatDuration(session.durationMinutes)}` : ""}
        {` · Sesión #${session.sessionNumber}`}
      </p>

      {/* Badge "en X minutos" */}
      {minutesUntil > 0 && minutesUntil < 120 && (
        <span
          className="absolute top-3.5 right-3.5 text-2xs font-bold
                     bg-white/20 border border-white/30 text-white
                     px-2.5 py-1 rounded-full"
        >
          En {minutesUntil} min
        </span>
      )}

      {/* Acciones */}
      <div className="flex gap-2 mt-3">
        <Link
          href={`/sessions/${session.id}`}
          className="flex-1 flex items-center justify-center gap-1.5
                     bg-secondary-container text-secondary-container-foreground
                     font-semibold text-xs rounded-lg py-2.5
                     hover:opacity-90 transition-opacity"
        >
          <Mic size={13} strokeWidth={2.5} />
          Iniciar sesión
        </Link>

        <Link
          href={`/patients/${patient.id}`}
          className="flex-1 flex items-center justify-center gap-1
                     bg-white/15 text-white font-semibold text-xs
                     rounded-lg py-2.5 hover:bg-white/20 transition-colors"
        >
          Ver historial
          <ChevronRight size={12} />
        </Link>
      </div>

      {/* Badge de alertas no revisadas */}
      {unacknowledgedRisks > 0 && (
        <div
          className="mt-2.5 flex items-center gap-1.5 bg-white/10
                     rounded-lg px-3 py-2"
        >
          <AlertTriangle size={12} className="text-white flex-shrink-0" />
          <p className="text-2xs text-white/90">
            <span className="font-bold">{unacknowledgedRisks}</span>{" "}
            {unacknowledgedRisks === 1 ? "alerta sin revisar" : "alertas sin revisar"}
          </p>
          <Link
            href="/dashboard?filter=risks"
            className="ml-auto text-2xs text-white font-bold underline"
          >
            Ver
          </Link>
        </div>
      )}
    </div>
  );
}
