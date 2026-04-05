"use client";

/**
 * components/billing/UsageBadge.tsx
 *
 * Muestra el uso de minutos gratuitos en el header.
 * - Plan free: barra de progreso con minutos restantes
 * - Plan premium: badge "Premium"
 */

import { useEffect, useState } from "react";
import { Sparkles, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface UsageData {
  isPremium:        boolean;
  freeSecondsUsed:  number;
  freeSecondsLimit: number;
  freeMinutesLeft:  number;
  percentUsed:      number;
  hasReachedLimit:  boolean;
}

interface UsageBadgeProps {
  onLimitReached?: () => void;
  className?:      string;
}

export function UsageBadge({ onLimitReached, className }: UsageBadgeProps) {
  const [usage, setUsage] = useState<UsageData | null>(null);

  useEffect(() => {
    fetch("/api/subscription/status")
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setUsage(d.data);
          if (d.data.hasReachedLimit) onLimitReached?.();
        }
      })
      .catch(() => null);
  }, [onLimitReached]);

  if (!usage) return null;

  if (usage.isPremium) {
    return (
      <div className={cn(
        "inline-flex items-center gap-1.5 bg-primary/10 border border-primary/20 text-primary rounded-full px-3 py-1",
        className
      )}>
        <Sparkles size={12} />
        <span className="text-xs font-semibold">Premium</span>
      </div>
    );
  }

  const minutesLeft = usage.freeMinutesLeft;
  const isLow       = usage.percentUsed >= 75;
  const isEmpty     = usage.hasReachedLimit;

  return (
    <div className={cn(
      "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs border",
      isEmpty ? "bg-red-50 border-red-200 text-red-700" :
      isLow   ? "bg-amber-50 border-amber-200 text-amber-700" :
                "bg-surface-secondary border-border text-text-secondary",
      className
    )}>
      <Clock size={11} />
      <span className="font-medium">
        {isEmpty
          ? "Límite alcanzado"
          : `${minutesLeft} min gratis`}
      </span>
      {/* Mini barra */}
      <div className="w-10 h-1.5 bg-border rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            isEmpty ? "bg-red-500" :
            isLow   ? "bg-amber-500" :
                      "bg-primary"
          )}
          style={{ width: `${usage.percentUsed}%` }}
        />
      </div>
    </div>
  );
}
