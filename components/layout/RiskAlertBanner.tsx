/**
 * components/layout/RiskAlertBanner.tsx
 *
 * Server Component — consulta alertas críticas no revisadas.
 *
 * REGLA CRÍTICA: Las alertas de riesgo (ideación suicida / autolesiones)
 * NUNCA se ocultan, SIEMPRE se muestran al tope, color #a83836, z-70.
 * El psicólogo DEBE revisar y confirmar cada alerta explícitamente.
 */

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { db } from "@/lib/db";

interface RiskAlertBannerProps {
  psychologistId: string;
}

export async function RiskAlertBanner({ psychologistId }: RiskAlertBannerProps) {
  // Alertas high/critical sin revisar
  const unacknowledged = await db.riskAlert.findMany({
    where: {
      patient: { psychologistId },
      level:   { in: ["high", "critical"] },
      acknowledgedAt: null,
    },
    include: {
      patient: {
        select: { shortId: true, isAnonymized: true, id: true },
      },
    },
    orderBy: { detectedAt: "desc" },
    take: 3, // Mostrar máximo 3 en el banner
  });

  if (unacknowledged.length === 0) return null;

  const first = unacknowledged[0]!;
  const isCritical = first.level === "critical";
  const count = unacknowledged.length;

  return (
    <div
      className="risk-alert-banner"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      // z-alert = 70 — siempre encima del resto de la UI
      style={{ zIndex: 70 }}
    >
      {/* Icono */}
      <div
        className="w-8 h-8 rounded-full bg-error flex items-center
                   justify-center flex-shrink-0 mt-0.5"
        style={{
          animation: isCritical ? "pulse-risk 2s ease-in-out infinite" : "none",
        }}
      >
        <AlertTriangle size={14} className="text-white" strokeWidth={2.5} />
      </div>

      {/* Texto */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-error font-headline leading-tight">
          {isCritical ? "⚠ Alerta crítica" : "Alerta de riesgo"} — Paciente P-{first.patient.shortId}
        </p>
        <p className="text-xs text-error/80 mt-0.5 leading-snug">
          {isCritical
            ? "Ideación activa detectada. Protocolo de crisis requerido."
            : `Señales de riesgo detectadas en última sesión.`}
          {count > 1 && ` (+${count - 1} más sin revisar)`}
        </p>

        {/* CTA — obligatorio revisarla */}
        <Link
          href={`/patients/${first.patient.id}?tab=risk`}
          className="inline-block mt-1.5 text-xs font-semibold text-error
                     underline underline-offset-2 hover:no-underline"
        >
          Revisar historial completo →
        </Link>
      </div>
    </div>
  );
}
