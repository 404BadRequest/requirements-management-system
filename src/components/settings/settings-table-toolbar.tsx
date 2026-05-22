"use client";

import type { ReactNode } from "react";

export function SettingsTableToolbar({
  title,
  description,
  actionLabel,
  onAction,
  extra,
}: {
  title: string;
  description?: string;
  actionLabel: string;
  onAction?: () => void;
  extra?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 border-b border-border/60 pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
        {description ? <p className="max-w-prose text-xs leading-relaxed text-muted-foreground sm:text-sm">{description}</p> : null}
      </div>
      {(onAction || extra) ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {extra}
          {onAction ? (
            <button type="button" className="btn-primary text-sm" onClick={onAction}>
              {actionLabel}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
