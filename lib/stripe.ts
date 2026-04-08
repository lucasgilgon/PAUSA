import "server-only";

/**
 * lib/stripe.ts
 *
 * Cliente Stripe + helpers para suscripciones de Pausa.
 *
 * Plan:
 *   free    → 10 min (600s) de transcripción total gratis
 *   premium → ilimitado, ~19€/mes
 *
 * Payment Link (test): https://buy.stripe.com/test_6oU5kC9qp7F7cTVcOd4Ja00
 */

import Stripe from "stripe";
import { db } from "@/lib/db";

// ─── Cliente Stripe ────────────────────────────────────────────────────────

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    _stripe = new Stripe(key, { apiVersion: "2026-03-25.dahlia" });
  }
  return _stripe;
}

// ─── Constantes ────────────────────────────────────────────────────────────

export const FREE_SECONDS_LIMIT = 600; // 10 minutos gratis

export const STRIPE_PAYMENT_LINK = "https://buy.stripe.com/test_6oU5kC9qp7F7cTVcOd4Ja00";

// ─── getOrCreateSubscription ──────────────────────────────────────────────

/**
 * Obtiene o crea el registro de suscripción de un psicólogo.
 * Si no existe → crea uno gratuito (free).
 */
export async function getOrCreateSubscription(psychologistId: string) {
  return db.subscription.upsert({
    where:  { psychologistId },
    update: {},
    create: {
      psychologistId,
      plan:              "free",
      status:            "active",
      freeSecondsUsed:   0,
      freeSecondsLimit:  FREE_SECONDS_LIMIT,
    },
  });
}

// ─── checkUsageLimit ──────────────────────────────────────────────────────

export interface UsageStatus {
  isPremium:         boolean;
  freeSecondsUsed:   number;
  freeSecondsLimit:  number;
  freeSecondsLeft:   number;
  freeMinutesLeft:   number;
  hasReachedLimit:   boolean;
  percentUsed:       number;
}

export async function checkUsageLimit(psychologistId: string): Promise<UsageStatus> {
  const sub = await getOrCreateSubscription(psychologistId);
  const isPremium = sub.plan === "premium" && sub.status === "active";

  const freeSecondsLeft = Math.max(0, sub.freeSecondsLimit - sub.freeSecondsUsed);

  return {
    isPremium,
    freeSecondsUsed:  sub.freeSecondsUsed,
    freeSecondsLimit: sub.freeSecondsLimit,
    freeSecondsLeft,
    freeMinutesLeft:  Math.floor(freeSecondsLeft / 60),
    hasReachedLimit:  !isPremium && sub.freeSecondsUsed >= sub.freeSecondsLimit,
    percentUsed:      Math.min(100, Math.round((sub.freeSecondsUsed / sub.freeSecondsLimit) * 100)),
  };
}

// ─── addTranscriptionSeconds ──────────────────────────────────────────────

/**
 * Suma segundos de transcripción al contador del usuario.
 * Solo cuenta si es plan free (los premium no tienen límite).
 */
export async function addTranscriptionSeconds(
  psychologistId: string,
  seconds: number
): Promise<void> {
  if (seconds <= 0) return;

  const sub = await getOrCreateSubscription(psychologistId);
  if (sub.plan === "premium") return; // sin límite

  await db.subscription.update({
    where: { psychologistId },
    data: {
      freeSecondsUsed: {
        increment: Math.ceil(seconds),
      },
    },
  });
}

// ─── markAsPremium ────────────────────────────────────────────────────────

export async function markAsPremium(opts: {
  psychologistId?:     string;
  stripeCustomerId?:   string;
  stripeSubscriptionId: string;
  stripePriceId?:      string;
  currentPeriodEnd?:   Date;
}) {
  const where = opts.psychologistId
    ? { psychologistId: opts.psychologistId }
    : { stripeCustomerId: opts.stripeCustomerId! };

  await db.subscription.upsert({
    where,
    update: {
      plan:                 "premium",
      status:               "active",
      stripeSubscriptionId: opts.stripeSubscriptionId,
      stripePriceId:        opts.stripePriceId,
      currentPeriodEnd:     opts.currentPeriodEnd,
    },
    create: {
      psychologistId:       opts.psychologistId ?? "",
      stripeCustomerId:     opts.stripeCustomerId,
      stripeSubscriptionId: opts.stripeSubscriptionId,
      stripePriceId:        opts.stripePriceId,
      plan:                 "premium",
      status:               "active",
      freeSecondsUsed:      0,
      freeSecondsLimit:     FREE_SECONDS_LIMIT,
      currentPeriodEnd:     opts.currentPeriodEnd,
    },
  });
}
