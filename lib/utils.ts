/**
 * lib/utils.ts
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday } from "date-fns";
import { es } from "date-fns/locale";
import type { ApiError } from "@/types";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function formatSessionDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date))     return `Hoy, ${format(date, "HH:mm")}`;
  if (isTomorrow(date))  return `Mañana, ${format(date, "HH:mm")}`;
  if (isYesterday(date)) return `Ayer, ${format(date, "HH:mm")}`;
  return format(date, "d 'de' MMMM, HH:mm", { locale: es });
}

export function formatRelativeTime(dateStr: string): string {
  return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: es });
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export function formatAudioDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export function apiSuccess<T>(data: T) {
  return {
    success: true as const,
    data,
    timestamp: new Date().toISOString(),
  };
}

export function apiError(
  code: string,
  message: string,
  details?: Record<string, unknown>
): { success: false; error: ApiError["error"]; timestamp: string } {
  return {
    success: false as const,
    error: { code, message, ...(details ? { details } : {}) },
    timestamp: new Date().toISOString(),
  };
}

import type { ZodError } from "zod";

export function formatZodError(err: ZodError): Record<string, string[]> {
  return err.flatten().fieldErrors as Record<string, string[]>;
}

import type { RiskLevel } from "@/types";

export const RISK_ORDER: RiskLevel[] = ["none", "low", "moderate", "high", "critical"];

export function riskToLabel(level: RiskLevel): string {
  const labels: Record<RiskLevel, string> = {
    none:     "Sin riesgo",
    low:      "Riesgo bajo",
    moderate: "Riesgo moderado",
    high:     "Riesgo alto",
    critical: "Riesgo crítico",
  };
  return labels[level];
}

export function isHighRisk(level: RiskLevel): boolean {
  return level === "high" || level === "critical";
}

export function maxRiskLevel(levels: RiskLevel[]): RiskLevel {
  return levels.reduce<RiskLevel>((max, level) => {
    return RISK_ORDER.indexOf(level) > RISK_ORDER.indexOf(max) ? level : max;
  }, "none");
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024)        return `${bytes} B`;
  if (bytes < 1024 ** 2)   return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 ** 3)   return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + "…";
}
