import { AppShellSkeleton } from "@/components/layout/app-shell-skeleton";
import { PageHeader } from "@/components/common/page-header";

export default function RequirementDetailLoading() {
  return (
    <AppShellSkeleton>
      <PageHeader
        title="Detalle de requerimiento"
        loading
        description="Cargando historial, actividad y horas relacionadas…"
      />
      <section className="surface-card p-4">
        <div className="flex flex-wrap gap-2">
          <div className="skeleton-shimmer h-6 w-24 rounded-full" />
          <div className="skeleton-shimmer h-6 w-20 rounded-full" />
        </div>
        <div className="skeleton-shimmer mt-4 h-4 w-3/4 max-w-md rounded-[2px]" />
      </section>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_min(22rem,34%)] xl:gap-5">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="surface-card p-4">
                <div className="skeleton-shimmer h-3 w-20 rounded-[2px]" />
                <div className="skeleton-shimmer mt-3 h-7 w-16 rounded-[2px]" />
              </div>
            ))}
          </div>
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="surface-card p-4">
              <div className="skeleton-shimmer h-5 w-40 rounded-[2px]" />
              <div className="skeleton-shimmer mt-4 h-24 w-full rounded-[2px]" />
            </div>
          ))}
        </div>
        <div className="space-y-4">
          <div className="surface-card p-4">
            <div className="skeleton-shimmer h-5 w-48 rounded-[2px]" />
            <div className="skeleton-shimmer mt-4 h-40 w-full rounded-[2px]" />
          </div>
          <div className="surface-card p-4">
            <div className="skeleton-shimmer h-5 w-32 rounded-[2px]" />
            <div className="skeleton-shimmer mt-4 h-28 w-full rounded-[2px]" />
          </div>
        </div>
      </div>
    </AppShellSkeleton>
  );
}
