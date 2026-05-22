import { AppShellSkeleton } from "@/components/layout/app-shell-skeleton";
import { PageHeader } from "@/components/common/page-header";

export default function RequirementsKanbanLoading() {
  return (
    <AppShellSkeleton>
      <PageHeader
        title="Kanban de requerimientos"
        loading
        description="Cargando columnas por estado y tarjetas del flujo…"
        actions={<span className="skeleton-shimmer h-9 w-28 rounded-[2px]" />}
      />
      <section className="surface-card p-[length:var(--density-inset-pad)]">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-full max-w-md space-y-2">
            <div className="skeleton-shimmer h-3 w-24 rounded-[2px]" />
            <div className="skeleton-shimmer h-10 w-full rounded-[2px]" />
          </div>
          <div className="skeleton-shimmer h-10 w-32 rounded-[2px]" />
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, colIdx) => (
          <article key={colIdx} className="surface-card p-3">
            <div className="skeleton-shimmer h-6 w-2/3 rounded-[2px]" />
            <div className="mt-3 space-y-2">
              {Array.from({ length: 4 }).map((_, cardIdx) => (
                <div key={cardIdx} className="skeleton-shimmer h-16 w-full rounded-[2px]" />
              ))}
            </div>
          </article>
        ))}
      </section>
    </AppShellSkeleton>
  );
}
