"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-[2px] border border-danger/30 bg-danger/10">
        <AlertTriangle className="h-8 w-8 text-danger" aria-hidden />
      </div>
      <div className="space-y-2">
        <h1 className="text-xl font-bold text-foreground">Algo salió mal</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Ocurrió un error inesperado. Puedes intentar recargar la página o volver al inicio.
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-muted-foreground">Código de error: {error.digest}</p>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-[2px] border border-border bg-card px-4 py-2 text-sm font-medium transition hover:bg-muted"
        >
          <RotateCcw className="h-4 w-4" aria-hidden />
          Reintentar
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-[2px] border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 no-underline"
        >
          <Home className="h-4 w-4" aria-hidden />
          Ir al Dashboard
        </Link>
      </div>
    </div>
  );
}
