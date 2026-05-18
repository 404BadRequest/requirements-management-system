import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Tarjeta de sección estándar para formularios y listados en Configuración.
 */
export function SettingsSection({
  title,
  description,
  children,
  className,
  padding = true,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  /** Si false, solo borde/cabecera; el contenido controla su padding (p.ej. tablas). */
  padding?: boolean;
}) {
  return (
    <section className={cn("surface-card overflow-hidden shadow-sm", className)}>
      <div className="border-b border-border bg-muted/35 px-5 py-4">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
        {description ? <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{description}</p> : null}
      </div>
      <div className={cn(padding && "p-5")}>{children}</div>
    </section>
  );
}
