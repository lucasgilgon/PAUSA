/**
 * app/api/subscription/status/route.ts
 *
 * GET /api/subscription/status
 * Devuelve el estado de suscripción y uso del psicólogo autenticado.
 */

import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { checkUsageLimit } from "@/lib/stripe";
import { apiSuccess, apiError } from "@/lib/utils";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(apiError("UNAUTHORIZED", "No autenticado"), { status: 401 });
  }

  const usage = await checkUsageLimit(userId);

  return NextResponse.json(apiSuccess(usage));
}
