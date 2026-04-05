/**
 * components/layout/BottomNav.tsx
 *
 * Client Component — necesita usePathname para el estado activo.
 * Muestra punto rojo en Dashboard si hay alertas de riesgo no revisadas.
 * Las alertas de riesgo se sincronizan via el hook useUnacknowledgedRisks.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Mic, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  {
    href:  "/dashboard",
    label: "Inicio",
    icon:  LayoutDashboard,
  },
  {
    href:  "/patients",
    label: "Pacientes",
    icon:  Users,
  },
  {
    href:  "/sessions",
    label: "Sesiones",
    icon:  Mic,
  },
  {
    href:  "/security",
    label: "Seguridad",
    icon:  Shield,
  },
] as const;

interface BottomNavProps {
  /** IDs de alertas no revisadas para mostrar el badge rojo */
  unacknowledgedCount?: number;
}

export function BottomNav({ unacknowledgedCount = 0 }: BottomNavProps) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-app z-nav
                 bg-surface border-t border-border safe-bottom"
      style={{ height: "var(--nav-height)" }}
    >
      <div className="flex h-full">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");

          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1",
                "transition-colors no-select relative",
                isActive ? "text-primary" : "text-text-tertiary hover:text-text-secondary"
              )}
              aria-label={label}
              aria-current={isActive ? "page" : undefined}
            >
              {/* Badge de alerta en Dashboard */}
              {href === "/dashboard" && unacknowledgedCount > 0 && (
                <span
                  className="absolute top-2 right-1/2 translate-x-2.5
                             w-2 h-2 rounded-full bg-error
                             animate-pulse-risk"
                  aria-label={`${unacknowledgedCount} alertas sin revisar`}
                />
              )}

              <Icon
                size={20}
                strokeWidth={isActive ? 2.2 : 1.8}
                className="transition-all"
              />
              <span
                className={cn(
                  "text-2xs transition-all",
                  isActive ? "font-bold" : "font-medium"
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
