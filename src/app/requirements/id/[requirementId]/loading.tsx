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
      <section className="surface-card overflow-hidden p-4">
        <div className="flex flex-wrap gap-2">
          <div className="skeleton-shimmer h-6 w-28 rounded-full" />
          <div className="skeleton-shimmer h-6 w-16 rounded-full" />
        </div>
        <div className="skeleton-shimmer mt-4 h-5 w-40 rounded-[2px]" />
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index}>
              <div className="skeleton-shimmer h-3 w-16 rounded-[2px]" />
              <div className="skeleton-shimmer mt-2 h-4 w-24 rounded-[2px]" />
            </div>
          ))}
        </div>
      </section>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(26rem,40%)] xl:items-stretch xl:gap-8">
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
        <div className="surface-card flex min-h-[20rem] flex-col p-4 xl:min-h-full">
          <div className="skeleton-shimmer h-5 w-36 rounded-[2px]" />
          <div className="skeleton-shimmer mt-3 h-4 w-48 rounded-[2px]" />
          <div className="skeleton-shimmer mt-6 flex-1 min-h-[12rem] w-full rounded-[2px]" />
        </div>
      </div>
    </AppShellSkeleton>
  );
}
