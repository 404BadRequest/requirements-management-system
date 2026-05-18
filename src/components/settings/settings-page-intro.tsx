import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Cabecera coherente para cada subsección de Configuración (título + contexto).
 */
export function SettingsPageIntro({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: string;
  description: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <header
      className={cn(
        "density-page-header surface-card p-[length:var(--density-inset-pad)]",
        actions && "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
      )}
    >
      <div className="min-w-0 space-y-2">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">{eyebrow}</p>
        ) : null}
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}
