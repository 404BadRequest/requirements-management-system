"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight, Home } from "lucide-react";

const LABELS: Record<string, string> = {
  dashboard: "Dashboard",
  requirements: "Requerimientos",
  kanban: "Kanban",
  "time-entries": "Horas",
  reports: "Reportes",
  budgets: "Presupuesto",
  team: "Equipo",
  notifications: "Avisos",
  settings: "Configuración",
  account: "Mi cuenta",
  id: "Detalle",
};

function segmentLabel(segment: string): string {
  return LABELS[segment] ?? segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const Breadcrumbs = () => {
  const pathname = usePathname();
  const parts = pathname.split("/").filter(Boolean);

  return (
    <nav aria-label="Migas de pan" className="flex items-center gap-1 text-[11px] text-muted-foreground">
      {parts.length === 0 ? (
        <span className="flex items-center gap-1 font-medium text-foreground">
          <Home className="h-3 w-3" aria-hidden />
          Inicio
        </span>
      ) : (
        <>
          <Link href="/" className="flex items-center gap-1 rounded-[2px] px-1.5 py-0.5 transition-colors hover:bg-muted hover:text-foreground">
            <Home className="h-3 w-3" aria-hidden />
            <span className="hidden sm:inline">Inicio</span>
          </Link>
          {parts.map((segment, i) => {
            const href = "/" + parts.slice(0, i + 1).join("/");
            const isLast = i === parts.length - 1;
            return (
              <span key={`${segment}-${i}`} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3 shrink-0 text-border" aria-hidden />
                {isLast ? (
                  <span className="rounded-[2px] bg-muted px-1.5 py-0.5 font-medium text-foreground">{segmentLabel(segment)}</span>
                ) : (
                  <Link
                    href={href}
                    className="rounded-[2px] px-1.5 py-0.5 transition-colors hover:bg-muted hover:text-foreground"
                  >
                    {segmentLabel(segment)}
                  </Link>
                )}
              </span>
            );
          })}
        </>
      )}
    </nav>
  );
};
