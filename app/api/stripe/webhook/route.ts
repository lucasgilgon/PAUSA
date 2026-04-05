/**
 * app/api/stripe/webhook/route.ts
 *
 * POST /api/stripe/webhook
 * Recibe eventos de Stripe y actualiza el estado de suscripción.
 *
 * Eventos que maneja:
 *   - checkout.session.completed → marcar usuario como premium
 *   - customer.subscription.updated → actualizar estado
 *   - customer.subscription.deleted → degradar a free
 */

import { NextRequest, NextResponse } from "next/server";
import { stripe, markAsPremium, getOrCreateSubscription } from "@/lib/stripe";
import { db } from "@/lib/db";

// Stripe requiere el body RAW (no parseado) para verificar la firma
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body      = await request.text();
  const signature = request.headers.get("stripe-signature") ?? "";
  const secret    = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  let event;
  try {
    event = secret
      ? stripe.webhooks.constructEvent(body, signature, secret)
      : JSON.parse(body); // Modo dev sin firma (ngrok / test)
  } catch (err) {
    console.error("[Stripe] Webhook signature invalid:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  console.log(`[Stripe] Event: ${event.type}`);

  try {
    switch (event.type) {
      // ── Pago completado (Payment Link o Checkout) ────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as any;

        // client_reference_id = psychologistId (Clerk userId)
        // Lo pasamos en la URL del payment link como ?client_reference_id=xxx
        const psychologistId      = session.client_reference_id as string | null;
        const stripeCustomerId    = session.customer as string;
        const stripeSubscriptionId = session.subscription as string;

        if (stripeSubscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
          const sub = subscription as any;
          await markAsPremium({
            psychologistId:      psychologistId ?? undefined,
            stripeCustomerId,
            stripeSubscriptionId,
            stripePriceId:       sub.items?.data[0]?.price?.id,
            currentPeriodEnd:    sub.current_period_end
              ? new Date(sub.current_period_end * 1000)
              : undefined,
          });
        } else {
          // Pago único (por si acaso)
          if (psychologistId) {
            await markAsPremium({
              psychologistId,
              stripeCustomerId,
              stripeSubscriptionId: `one_time_${session.payment_intent}`,
            });
          }
        }
        break;
      }

      // ── Suscripción renovada / actualizada ───────────────────────────
      case "customer.subscription.updated": {
        const sub = event.data.object as any;
        const existing = await db.subscription.findFirst({
          where: { stripeSubscriptionId: sub.id },
        });
        if (existing) {
          await db.subscription.update({
            where: { id: existing.id },
            data: {
              status:            sub.status === "active" ? "active" : sub.status,
              plan:              sub.status === "active" ? "premium" : "free",
              currentPeriodEnd:  new Date(sub.current_period_end * 1000),
              cancelAtPeriodEnd: sub.cancel_at_period_end,
            },
          });
        }
        break;
      }

      // ── Suscripción cancelada ────────────────────────────────────────
      case "customer.subscription.deleted": {
        const sub = event.data.object as any;
        await db.subscription.updateMany({
          where: { stripeSubscriptionId: sub.id },
          data:  { plan: "free", status: "cancelled" },
        });
        break;
      }

      default:
        // Ignorar eventos no manejados
        break;
    }
  } catch (err) {
    console.error(`[Stripe] Error handling ${event.type}:`, err);
    return NextResponse.json({ error: "Handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
