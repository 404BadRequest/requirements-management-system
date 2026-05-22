import { AppShellSkeleton } from "@/components/layout/app-shell-skeleton";
import { PageHeader } from "@/components/common/page-header";

export default function BudgetContractDetailLoading() {
  return (
    <AppShellSkeleton>
      <PageHeader
        title="Detalle de contrato"
        loading
        description="Cargando asignaciones y consumo del contrato…"
        actions={
          <span className="skeleton-shimmer h-9 w-32 rounded-[2px]" />
        }
      />
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <article key={i} className="surface-card p-4">
            <div className="skeleton-shimmer h-3 w-24 rounded-[2px]" />
            <div className="skeleton-shimmer mt-3 h-7 w-16 rounded-[2px]" />
          </article>
        ))}
      </section>
      <section className="surface-card p-[length:var(--density-inset-pad)]">
        <div className="skeleton-shimmer mb-3 h-8 w-48 rounded-[2px]" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-10 w-full rounded-[2px]" />
          ))}
        </div>
      </section>
    </AppShellSkeleton>
  );
}
