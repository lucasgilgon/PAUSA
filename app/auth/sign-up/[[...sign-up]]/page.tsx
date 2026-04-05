/**
 * app/auth/sign-up/[[...sign-up]]/page.tsx
 * Página de registro — Clerk SignUp component.
 */

import type { Metadata } from "next";
import Image from "next/image";
import { SignUp } from "@clerk/nextjs";

export const metadata: Metadata = { title: "Crear cuenta" };

export default function SignUpPage() {
  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="mb-8 text-center">
        <Image src="/logo.svg" alt="Pausa" width={220} height={110} style={{ height: "auto" }} priority />
        <p className="text-sm text-text-tertiary mt-1">
          Para psicólogos que quieren centrarse en sus pacientes
        </p>
      </div>

      <SignUp
        path="/auth/sign-up"
        routing="path"
        signInUrl="/auth/sign-in"
        forceRedirectUrl="/onboarding"
        appearance={{
          elements: {
            rootBox:           "w-full max-w-sm",
            card:              "shadow-md border border-border rounded-xl",
            headerTitle:       "font-headline font-bold text-text-primary",
            headerSubtitle:    "text-text-secondary text-sm",
            socialButtonsBlockButton: "border border-border hover:bg-surface-secondary transition-colors",
            formButtonPrimary: "bg-primary hover:bg-primary-700 text-white font-semibold",
            footerActionLink:  "text-primary hover:text-primary-dk font-semibold",
          },
        }}
      />

      <p className="mt-6 text-xs text-text-tertiary text-center max-w-xs">
        Al registrarte aceptas procesar datos de pacientes conforme al RGPD.
        Tus datos están cifrados con AES-256.
      </p>
    </div>
  );
}
