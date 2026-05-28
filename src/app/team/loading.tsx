import { AppShellSkeleton } from "@/components/layout/app-shell-skeleton";
import { PageHeader } from "@/components/common/page-header";

export default function TeamLoading() {
  return (
    <AppShellSkeleton>
      <PageHeader
        title="Equipo"
        loading
        description="Cargando capacidad, carga y directorio del equipo…"
        actions={
          <div className="flex gap-2">
            <span className="skeleton-shimmer h-9 w-32 rounded-[2px]" />
          </div>
        }
      />
      <section className="surface-card mb-4 p-[length:var(--density-inset-pad)]">
        <div className="flex flex-wrap gap-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="skeleton-shimmer h-10 w-36 rounded-[2px]" />
          ))}
        </div>
      </section>
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="surface-card p-5">
            <div className="skeleton-shimmer h-3 w-24 rounded-[2px]" />
            <div className="skeleton-shimmer mt-3 h-8 w-16 rounded-[2px]" />
          </div>
        ))}
      </div>
      <section className="surface-card mb-4 p-[length:var(--density-inset-pad)]">
        <div className="skeleton-shimmer h-5 w-56 rounded-[2px]" />
        <div className="skeleton-shimmer mt-4 h-32 w-full rounded-[2px]" />
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
