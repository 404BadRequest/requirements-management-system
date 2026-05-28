import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type KpiVariant = "default" | "success" | "warning" | "danger" | "info";

const VARIANT_STYLES: Record<
  KpiVariant,
  { bar: string; icon: string; value: string }
> = {
  default: {
    bar: "bg-primary",
    icon: "text-foreground",
    value: "text-foreground",
  },
  success: {
    bar: "bg-emerald-600",
    icon: "text-emerald-700",
    value: "text-foreground",
  },
  warning: {
    bar: "bg-amber-600",
    icon: "text-amber-700",
    value: "text-foreground",
  },
  danger: {
    bar: "bg-red-700",
    icon: "text-red-700",
    value: "text-foreground",
  },
  info: {
    bar: "bg-accent",
    icon: "text-accent",
    value: "text-foreground",
  },
};

export const KpiCard = ({
  label,
  value,
  helper,
  icon: Icon,
  variant = "default",
}: {
  label: string;
  value: string;
  helper?: string;
  icon?: LucideIcon;
  variant?: KpiVariant;
}) => {
  const v = VARIANT_STYLES[variant];
  return (
    <article className="surface-card group relative min-h-[108px] overflow-hidden p-4 transition-all sm:p-4">
      {/* Accent bar top */}
      <div className={cn("absolute inset-x-0 top-0 h-[2px]", v.bar)} aria-hidden />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            {label}
          </p>
          <p className={cn("mt-2.5 text-[1.9rem] font-semibold tabular-nums tracking-tight", v.value)}>
            {value}
          </p>
          {helper ? (
            <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{helper}</p>
          ) : null}
        </div>
        {Icon ? (
          <div
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-[2px] border border-border bg-muted",
              v.icon,
            )}
          >
            <Icon className="h-5 w-5" aria-hidden />
          </div>
        ) : null}
      </div>
    </article>
  );
};
