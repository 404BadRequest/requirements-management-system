import type { ReactNode } from "react";

export const PageHeader = ({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) => (
  <div className="density-page-header surface-card flex flex-col gap-1 p-[length:var(--density-inset-pad)] sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
    <div className="min-w-0 max-w-3xl space-y-1">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Workspace Overview</p>
      <div className="space-y-1">
        <h1 className="text-[1.15rem] font-semibold tracking-tight text-foreground sm:text-[1.55rem]">{title}</h1>
        {description ? (
          <p className="text-sm leading-relaxed text-muted-foreground/95">{description}</p>
        ) : null}
      </div>
    </div>
    {actions ? (
      <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
    ) : null}
  </div>
);
