import { AppShellSkeleton } from "@/components/layout/app-shell-skeleton";
import { PageHeader } from "@/components/common/page-header";

export default function BudgetsLoading() {
  return (
    <AppShellSkeleton>
      <PageHeader
        title="Presupuestos"
        description="Cargando asignaciones, consumo y capacidad por perfil…"
        actions={
          <div className="flex gap-2">
            <span className="skeleton-shimmer h-9 w-40 rounded-[2px]" />
            <span className="skeleton-shimmer h-9 w-32 rounded-[2px]" />
          </div>
        }
      />
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <article key={index} className="surface-card p-4">
            <div className="skeleton-shimmer h-3 w-28 rounded-[2px]" />
            <div className="skeleton-shimmer mt-3 h-7 w-20 rounded-[2px]" />
          </article>
        ))}
      </section>
      <section className="surface-card p-[length:var(--density-inset-pad)]">
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
