import { AppShellSkeleton } from "@/components/layout/app-shell-skeleton";
import { PageHeader } from "@/components/common/page-header";

export default function TeamLoading() {
  return (
    <AppShellSkeleton>
      <PageHeader
        title="Equipo"
        description="Cargando directorio, horas y métricas por persona…"
        actions={
          <div className="flex gap-2">
            <span className="skeleton-shimmer h-9 w-40 rounded-[2px]" />
            <span className="skeleton-shimmer h-9 w-32 rounded-[2px]" />
          </div>
        }
      />
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
