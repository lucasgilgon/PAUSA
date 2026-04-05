/**
 * app/api/risk-alerts/[id]/acknowledge/route.ts
 * POST — Marcar alerta de riesgo como revisada.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db }             from "@/lib/db";
import { securityLogger } from "@/lib/logger";
import { apiSuccess, apiError } from "@/lib/utils";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { userId } = await auth();
  if (!userId) return NextResponse.json(apiError("UNAUTHORIZED", "No autenticado"), { status: 401 });

  const { id } = await params;

  const alert = await db.riskAlert.findFirst({
    where: { id, patient: { psychologistId: userId } },
    select: { id: true, acknowledgedAt: true },
  });

  if (!alert) return NextResponse.json(apiError("NOT_FOUND", "Alerta no encontrada"), { status: 404 });

  if (alert.acknowledgedAt) {
    return NextResponse.json(apiSuccess({ id, alreadyAcknowledged: true }));
  }

  await db.riskAlert.update({
    where: { id },
    data:  { acknowledgedAt: new Date(), acknowledgedBy: userId },
  });

  securityLogger.info({ alertId: id, userId }, "Risk alert acknowledged");

  return NextResponse.json(apiSuccess({ id, acknowledgedAt: new Date().toISOString() }));
}
