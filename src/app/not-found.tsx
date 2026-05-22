import Link from "next/link";
import { SearchX, Home } from "lucide-react";

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-4 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-[2px] border border-border bg-muted/50">
        <SearchX className="h-8 w-8 text-muted-foreground" aria-hidden />
      </div>
      <div className="space-y-2">
        <p className="font-mono text-5xl font-bold text-primary">404</p>
        <h1 className="text-xl font-bold text-foreground">Página no encontrada</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          La página que buscas no existe o fue movida. Verifica la URL o regresa al inicio.
        </p>
      </div>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 rounded-[2px] border border-primary bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:opacity-90 no-underline"
      >
        <Home className="h-4 w-4" aria-hidden />
        Ir al Dashboard
      </Link>
    </div>
  );
}
