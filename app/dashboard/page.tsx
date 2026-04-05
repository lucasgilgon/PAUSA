/**
 * app/dashboard/page.tsx
 */

import type { Metadata } from "next";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { startOfDay, endOfDay, startOfMonth } from "date-fns";
import { db } from "@/lib/db";
import { decryptPatientPII } from "@/lib/crypto";
import { TopBar } from "@/components/layout/TopBar";
import { BottomNav } from "@/components/layout/BottomNav";
import { RiskAlertBanner } from "@/components/layout/RiskAlertBanner";
import { StatsRow } from "@/components/dashboard/StatsRow";
import { AgendaList } from "@/components/dashboard/AgendaList";
import { NextSessionCard } from "@/components/dashboard/NextSessionCard";
import Link from "next/link";
import { Plus } from "lucide-react";

export const metadata: Metadata = { title: "Inicio — Pausa" };

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/auth/sign-in");

  const now        = new Date();
  const todayStart = startOfDay(now);
  const todayEnd   = endOfDay(now);
  const monthStart = startOfMonth(now);

  const [todaySessions, monthSessions, activePatients, unacknowledgedRisks] = await Promise.all([
    db.session.findMany({
      where: {
        psychologistId: userId,
        scheduledAt: { gte: todayStart, lte: todayEnd },
      },
      include: {
        patient: {
          select: {
            id: true, shortId: true, isAnonymized: true,
            firstName: true, lastName: true, currentRisk: true,
          },
        },
      },
      orderBy: { scheduledAt: "asc" },
    }),
    db.session.count({
      where: { psychologistId: userId, scheduledAt: { gte: monthStart } },
    }),
    db.patient.count({
      where: { psychologistId: userId, status: "active" },
    }),
    db.riskAlert.count({
      where: {
        patient: { psychologistId: userId },
        level: { in: ["high", "critical"] },
        acknowledgedAt: null,
      },
    }),
  ]);

  // Decrypt patient names
  const decryptedSessions = todaySessions.map((s) => ({
    ...s,
    patient: {
      ...s.patient,
      firstName: s.patient.isAnonymized ? s.patient.firstName
        : (() => { try { return decryptPatientPII({ firstName: s.patient.firstName, lastName: s.patient.lastName, dateOfBirth: "2000-01-01" }).firstName; } catch { return s.patient.firstName; } })(),
      lastName: s.patient.isAnonymized ? s.patient.lastName
        : (() => { try { return decryptPatientPII({ firstName: s.patient.firstName, lastName: s.patient.lastName, dateOfBirth: "2000-01-01" }).lastName; } catch { return s.patient.lastName; } })(),
    },
  }));

  const hoursSaved  = Math.round(monthSessions * 0.5);
  const nextSession = decryptedSessions.find(
    (s) => new Date(s.scheduledAt) >= now && s.status !== "cancelled"
  ) ?? null;

  return (
    <div className="min-h-dvh bg-background pb-[var(--bottomnav-height)]">
      <TopBar userId={userId} />
      <RiskAlertBanner psychologistId={userId} />

      <main className="pt-[calc(var(--topbar-height)+0.75rem)] max-w-app mx-auto">
        <StatsRow
          monthSessions={monthSessions}
          activePatients={activePatients}
          hoursSaved={hoursSaved}
        />

        <div className="mt-4">
          <NextSessionCard session={nextSession} unacknowledgedRisks={unacknowledgedRisks} />
        </div>

        <div className="px-4 mt-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-headline font-bold text-text-primary text-sm">
              Agenda de hoy
            </h2>
            <Link
              href="/sessions/new"
              className="flex items-center gap-1 text-xs text-primary font-semibold hover:text-primary-dk transition-colors"
            >
              <Plus size={14} />
              Nueva sesión
            </Link>
          </div>
          <AgendaList sessions={decryptedSessions} now={now.toISOString()} />
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
