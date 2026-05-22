import { AppShellSkeleton } from "@/components/layout/app-shell-skeleton";
import { PageHeader } from "@/components/common/page-header";

export default function RequirementsLoading() {
  return (
    <AppShellSkeleton>
      <PageHeader
        title="Requerimientos"
        description="Cargando catálogo de requerimientos y responsables…"
        actions={
          <div className="flex flex-wrap gap-2">
            <span className="skeleton-shimmer h-9 w-36 rounded-[2px]" />
            <span className="skeleton-shimmer h-9 w-40 rounded-[2px]" />
            <span className="skeleton-shimmer h-9 w-28 rounded-[2px]" />
          </div>
        }
      />
      <section className="surface-card p-[length:var(--density-inset-pad)]">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-full max-w-md space-y-2">
            <div className="skeleton-shimmer h-3 w-28 rounded-[2px]" />
            <div className="skeleton-shimmer h-10 w-full rounded-[2px]" />
          </div>
          <div className="skeleton-shimmer h-10 w-32 rounded-[2px]" />
        </div>
      </section>
      <section className="data-table-shell p-2">
        <div className="skeleton-shimmer mb-3 h-9 w-full rounded-[2px]" />
        <div className="space-y-2">
          {Array.from({ length: 7 }).map((_, index) => (
            <div key={index} className="skeleton-shimmer h-10 w-full rounded-[2px]" />
          ))}
        </div>
      </section>
    </AppShellSkeleton>
  );
}
