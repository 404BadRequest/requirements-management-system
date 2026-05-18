import Link from "next/link";
import { Inbox } from "lucide-react";
import { PriorityBadge, statusColor, priorityColor } from "@/components/common/badges";
import { requirementDetailPath } from "@/lib/routes/requirements";
import type { Requirement } from "@/types/domain";

function KanbanCard({ item }: { item: Requirement }) {
  const borderColor = priorityColor(item.priority);
  return (
    <article
      className="group block rounded-[2px] border border-border bg-background transition-all hover:border-border hover:shadow-soft"
      style={{ borderLeftColor: borderColor, borderLeftWidth: "3px" }}
    >
      <div className="px-3 py-2.5 space-y-2">
        <p className="text-sm font-medium leading-snug text-foreground line-clamp-2">
          {item.title}
        </p>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <PriorityBadge priority={item.priority} />
          <Link href={requirementDetailPath(item.id)} className="font-mono text-[10px] text-primary hover:underline truncate max-w-[7rem]">
            {item.id}
          </Link>
        </div>
      </div>
    </article>
  );
}

function ColumnEmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 rounded-[2px] border border-dashed border-border bg-muted/20 px-3 py-6 text-center">
      <Inbox className="h-6 w-6 text-muted-foreground/30" aria-hidden />
      <p className="text-xs text-muted-foreground">Sin requerimientos</p>
    </div>
  );
}

export const RequirementKanbanBoard = ({
  requirements,
  statusColumns,
}: {
  requirements: Requirement[];
  statusColumns: { code: string; label: string }[];
}) => (
  <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [scrollbar-width:thin]">
    {statusColumns.map((status) => {
      const columnItems = requirements.filter((item) => item.status === status.code);
      const color = statusColor(status.code);
      return (
        <section
          key={status.code}
          className="flex min-w-[min(84vw,280px)] max-w-[320px] snap-start flex-1 flex-col rounded-[2px] border border-border bg-card"
          style={{ borderTopColor: color, borderTopWidth: "3px" }}
        >
          {/* Column header */}
          <header className="flex items-center justify-between border-b border-border/50 px-4 py-3">
            <div className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
                aria-hidden
              />
              <h3 className="text-sm font-semibold text-foreground">{status.label}</h3>
            </div>
            <span className="rounded-[2px] border border-border bg-muted px-2 py-0.5 text-[11px] font-mono font-medium text-muted-foreground">
              {columnItems.length}
            </span>
          </header>

          {/* Cards */}
          <div className="flex-1 space-y-2 overflow-y-auto p-3 [scrollbar-width:thin]" style={{ maxHeight: "calc(100vh - 14rem)" }}>
            {columnItems.length === 0 ? (
              <ColumnEmptyState />
            ) : (
              columnItems.map((item) => <KanbanCard key={item.id} item={item} />)
            )}
          </div>
        </section>
      );
    })}
  </div>
);
