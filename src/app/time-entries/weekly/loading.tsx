import { AppShellSkeleton } from "@/components/layout/app-shell-skeleton";
import { PageHeader } from "@/components/common/page-header";

export default function WeeklyTimesheetLoading() {
  return (
    <AppShellSkeleton>
      <PageHeader
        title="Vista semanal"
        loading
        description="Cargando calendario de horas…"
      />
      {/* Week nav skeleton */}
      <div className="surface-card flex items-center justify-between gap-4 p-3">
        <div className="flex items-center gap-2">
          <span className="skeleton-shimmer h-8 w-8 rounded-[2px]" />
          <span className="skeleton-shimmer h-8 w-16 rounded-[2px]" />
          <span className="skeleton-shimmer h-8 w-8 rounded-[2px]" />
          <span className="skeleton-shimmer ml-2 h-4 w-48 rounded-[2px]" />
        </div>
        <span className="skeleton-shimmer h-8 w-32 rounded-[2px]" />
      </div>
      {/* Calendar skeleton */}
      <div className="surface-card overflow-hidden">
        {/* Day headers */}
        <div className="grid border-b border-border" style={{ gridTemplateColumns: "3.5rem repeat(7, minmax(7rem, 1fr))" }}>
          <div className="border-r border-border/50 bg-muted/20 py-3" />
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="border-l border-border/50 px-2 py-2 text-center">
              <div className="skeleton-shimmer mx-auto mb-1 h-3 w-8 rounded-[2px]" />
              <div className="skeleton-shimmer mx-auto mb-1 h-7 w-7 rounded-[2px]" />
              <div className="skeleton-shimmer mx-auto h-3 w-6 rounded-[2px]" />
            </div>
          ))}
        </div>
        {/* Timeline area */}
        <div className="flex" style={{ height: "320px" }}>
          <div className="w-14 shrink-0 border-r border-border/50 bg-muted/10" />
          {Array.from({ length: 7 }).map((_, i) => (
            <div key={i} className="flex-1 border-l border-border/50 p-2">
              {i < 5 && (
                <div
                  className="skeleton-shimmer w-full rounded-[2px]"
                  style={{ height: `${40 + i * 20}px`, marginTop: `${i * 16}px` }}
                />
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShellSkeleton>
  );
}
