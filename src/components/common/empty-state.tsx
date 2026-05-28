import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

export const EmptyState = ({
  title,
  description,
  icon: Icon = Inbox,
  action,
  compact = false,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: ReactNode;
  compact?: boolean;
}) => (
  <div
    className="flex flex-col items-center justify-center rounded-[2px] border border-dashed border-border bg-muted/20 px-6 py-[length:var(--density-empty-py)] text-center"
  >
    <div
      className={`mb-3 flex items-center justify-center rounded-[2px] border border-border bg-muted/60 ${
        compact ? "h-10 w-10" : "h-11 w-11"
      }`}
    >
      <Icon className={`text-muted-foreground/50 ${compact ? "h-5 w-5" : "h-6 w-6"}`} aria-hidden />
    </div>
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    <p className="mt-1 max-w-sm text-sm leading-snug text-muted-foreground">{description}</p>
    {action ? <div className="mt-4">{action}</div> : null}
  </div>
);
