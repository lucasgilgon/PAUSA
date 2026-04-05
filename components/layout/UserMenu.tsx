/**
 * components/layout/UserMenu.tsx
 *
 * Client Component — dropdown de usuario con SignOut de Clerk.
 * Props: initials (string), userId (string).
 */

"use client";

import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LogOut, Settings, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

interface UserMenuProps {
  initials: string;
  userId:   string;
}

export function UserMenu({ initials }: UserMenuProps) {
  const { signOut } = useClerk();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    router.push("/auth/sign-in");
  };

  return (
    <div className="relative">
      {/* Avatar button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 rounded-full bg-gradient-to-br from-primary to-secondary
                   flex items-center justify-center text-white font-headline
                   text-xs font-bold transition-opacity hover:opacity-85
                   focus:outline-none focus:ring-2 focus:ring-primary/40"
        aria-label="Menú de usuario"
        aria-expanded={open}
      >
        {initials}
      </button>

      {/* Dropdown */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          <div
            className={cn(
              "absolute right-0 top-11 w-52 z-50",
              "bg-surface border border-border rounded-lg shadow-md",
              "animate-slide-in-up"
            )}
          >
            <div className="py-1">
              <button
                onClick={() => { setOpen(false); router.push("/security"); }}
                className="w-full flex items-center gap-3 px-4 py-2.5
                           text-sm text-text-secondary hover:bg-surface-secondary
                           transition-colors"
              >
                <Shield size={15} className="text-primary" />
                Seguridad y RGPD
              </button>

              <button
                onClick={() => { setOpen(false); router.push("/settings"); }}
                className="w-full flex items-center gap-3 px-4 py-2.5
                           text-sm text-text-secondary hover:bg-surface-secondary
                           transition-colors"
              >
                <Settings size={15} className="text-text-tertiary" />
                Configuración
              </button>

              <div className="my-1 border-t border-border" />

              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-4 py-2.5
                           text-sm text-error hover:bg-error/5
                           transition-colors"
              >
                <LogOut size={15} />
                Cerrar sesión
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
