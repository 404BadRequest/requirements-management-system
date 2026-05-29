import { AppShellSkeleton } from "@/components/layout/app-shell-skeleton";
import { PageHeader } from "@/components/common/page-header";

export default function ReportsLoading() {
  return (
    <AppShellSkeleton>
      <PageHeader
        title="Reportes"
        loading
        description="Cargando horas por perfil, persona y proyecto…"
        actions={
          <div className="flex flex-wrap gap-2">
            <span className="skeleton-shimmer h-9 w-36 rounded-[2px]" />
            <span className="skeleton-shimmer h-9 w-32 rounded-[2px]" />
          </div>
        }
      />
      <section className="surface-card p-[length:var(--density-inset-pad)]">
        <div className="flex flex-wrap items-end gap-4">
          <div className="w-full max-w-md space-y-2">
            <div className="skeleton-shimmer h-3 w-24 rounded-[2px]" />
            <div className="skeleton-shimmer h-10 w-full rounded-[2px]" />
          </div>
          <div className="w-full max-w-md space-y-2">
            <div className="skeleton-shimmer h-3 w-24 rounded-[2px]" />
            <div className="skeleton-shimmer h-10 w-full rounded-[2px]" />
          </div>
          <div className="w-44 space-y-2">
            <div className="skeleton-shimmer h-3 w-16 rounded-[2px]" />
            <div className="skeleton-shimmer h-10 w-full rounded-[2px]" />
          </div>
          <div className="w-44 space-y-2">
            <div className="skeleton-shimmer h-3 w-16 rounded-[2px]" />
            <div className="skeleton-shimmer h-10 w-full rounded-[2px]" />
          </div>
          <div className="skeleton-shimmer h-10 w-36 rounded-[2px]" />
        </div>
      </section>
      <div className="mb-4 flex flex-wrap gap-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <span key={index} className="skeleton-shimmer h-9 w-28 rounded-[2px]" />
        ))}
      </div>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <article key={index} className="surface-card p-4">
            <div className="skeleton-shimmer h-3 w-32 rounded-[2px]" />
            <div className="skeleton-shimmer mt-3 h-8 w-28 rounded-[2px]" />
          </article>
        ))}
      </section>
      <section className="grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, index) => (
          <article key={index} className="surface-card p-4">
            <div className="skeleton-shimmer h-4 w-40 rounded-[2px]" />
            <div className="skeleton-shimmer mt-4 h-52 w-full rounded-[2px]" />
          </article>
        ))}
      </section>
    </AppShellSkeleton>
  );
}
