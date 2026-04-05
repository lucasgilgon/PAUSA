/**
 * app/auth/sign-in/[[...sign-in]]/page.tsx
 * Página de inicio de sesión — Clerk SignIn component.
 * El catch-all [[...sign-in]] gestiona el OAuth redirect de Clerk.
 */

import type { Metadata } from "next";
import Image from "next/image";
import { SignIn } from "@clerk/nextjs";

export const metadata: Metadata = { title: "Iniciar sesión" };

export default function SignInPage() {
  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-4 py-12">
      {/* Logo */}
      <div className="mb-8 text-center">
        <Image src="/logo.svg" alt="Pausa" width={220} height={110} style={{ height: "auto" }} priority />
        <p className="text-sm text-text-tertiary mt-1">
          Documentación clínica con IA
        </p>
      </div>

      {/* Clerk SignIn */}
      <SignIn
        path="/auth/sign-in"
        routing="path"
        signUpUrl="/auth/sign-up"
        forceRedirectUrl="/dashboard"
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
        Datos protegidos con AES-256 · Cumplimiento RGPD
      </p>
    </div>
  );
}
