/**
 * app/error.tsx — Error boundary global de Next.js.
 * Captura errores de render en Server Components y rutas.
 */

"use client";

import { useEffect } from "react";
import { RefreshCw, Home } from "lucide-react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // En producción aquí iría Sentry / Datadog
    console.error("App error:", error);
  }, [error]);

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-4 text-center">
      <div className="mb-4">
        <h1 className="font-headline text-2xl font-extrabold text-primary">
          Pau<span className="text-secondary">sa</span>
        </h1>
      </div>
      <h2 className="font-headline text-xl font-bold text-text-primary mb-2">
        Algo fue mal
      </h2>
      <p className="text-sm text-text-secondary mb-6 max-w-xs">
        Ha ocurrido un error inesperado. Tus datos están seguros.
      </p>
      <div className="flex gap-3">
        <button onClick={reset} className="btn btn-primary gap-2">
          <RefreshCw size={14} />
          Reintentar
        </button>
        <a href="/dashboard" className="btn btn-outline gap-2">
          <Home size={14} />
          Inicio
        </a>
      </div>
      {process.env.NODE_ENV === "development" && (
        <details className="mt-6 text-left max-w-sm">
          <summary className="text-xs text-text-tertiary cursor-pointer">
            Detalles del error
          </summary>
          <pre className="mt-2 text-2xs text-error bg-error/5 p-3 rounded-lg overflow-auto">
            {error.message}
          </pre>
        </details>
      )}
    </div>
  );
}
