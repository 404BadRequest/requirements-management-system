import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";

export const EmptyState = ({
  title,
  description,
  icon: Icon = Inbox,
  action,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
  action?: ReactNode;
}) => (
  <div className="flex flex-col items-center justify-center rounded-[2px] border border-dashed border-border bg-muted/20 px-8 py-16 text-center">
    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-[2px] border border-border bg-muted/60">
      <Icon className="h-7 w-7 text-muted-foreground/50" aria-hidden />
    </div>
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">{description}</p>
    {action ? <div className="mt-5">{action}</div> : null}
  </div>
);
