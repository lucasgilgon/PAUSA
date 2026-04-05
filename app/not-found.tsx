/**
 * app/not-found.tsx — Página 404 global.
 */

import Link from "next/link";
import { Home } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-4 text-center">
      <div className="mb-4">
        <h1 className="font-headline text-2xl font-extrabold text-primary">
          Pau<span className="text-secondary">sa</span>
        </h1>
      </div>
      <h2 className="font-headline text-4xl font-extrabold text-text-primary mb-2">404</h2>
      <p className="text-sm text-text-secondary mb-6">
        Esta página no existe o no tienes acceso.
      </p>
      <Link href="/dashboard" className="btn btn-primary gap-2">
        <Home size={15} />
        Ir al dashboard
      </Link>
    </div>
  );
}
