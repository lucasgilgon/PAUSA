/**
 * components/layout/TopBar.tsx
 *
 * Props: userId (Clerk) para mostrar avatar.
 * Arquitectura: Server Component — obtiene datos del usuario en servidor.
 * El avatar muestra iniciales; el menú de perfil es un Client Component anidado.
 */

import { currentUser } from "@clerk/nextjs/server";
import Link from "next/link";
import Image from "next/image";
import { UserMenu } from "@/components/layout/UserMenu";

interface TopBarProps {
  userId: string;
}

export async function TopBar({ userId }: TopBarProps) {
  const user = await currentUser();

  const firstName = user?.firstName ?? "Psicólog@";
  const initials  =
    `${user?.firstName?.charAt(0) ?? ""}${user?.lastName?.charAt(0) ?? ""}`.toUpperCase() || "DG";

  const hour = new Date().getHours();
  const greeting =
    hour < 13 ? "Buenos días" :
    hour < 20 ? "Buenas tardes" :
    "Buenas noches";

  return (
    <header
      className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-app z-topbar
                 bg-surface border-b border-border"
      style={{ height: "var(--topbar-height)" }}
    >
      <div className="flex items-center justify-between h-full px-4">
        {/* Logo + saludo */}
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="hover:opacity-80 transition-opacity">
            <Image src="/logo.svg" alt="Pausa" width={72} height={36} style={{ height: "auto" }} priority />
          </Link>
          <span className="text-xs text-text-tertiary hidden xs:block">
            {greeting}, {firstName}
          </span>
        </div>

        {/* Avatar / user menu */}
        <UserMenu initials={initials} userId={userId} />
      </div>
    </header>
  );
}
