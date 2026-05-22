import type { ReactNode } from "react";

export const PageHeader = ({
  title,
  description,
  eyebrow,
  actions,
  loading = false,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
  /** When true, shows an animated spinner next to the description text. */
  loading?: boolean;
}) => (
  <div className="density-page-header surface-card flex flex-col gap-1 p-[length:var(--density-inset-pad)] sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
    <div className="min-w-0 max-w-3xl space-y-1">
      {eyebrow ? (
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
      ) : null}
      <div className="space-y-1">
        <h1 className="text-[1.15rem] font-semibold tracking-tight text-foreground sm:text-[1.55rem]">{title}</h1>
        {description ? (
          <p className="flex items-center gap-2 text-sm leading-relaxed text-muted-foreground/95">
            {loading ? (
              <span
                className="inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-muted-foreground/25 border-t-muted-foreground/70"
                aria-hidden
              />
            ) : null}
            {description}
          </p>
        ) : null}
      </div>
    </div>
    {actions ? (
      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
    ) : null}
  </div>
);
