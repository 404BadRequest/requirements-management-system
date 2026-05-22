import { AppShellSkeleton } from "@/components/layout/app-shell-skeleton";
import { PageHeader } from "@/components/common/page-header";

export default function SettingsLoading() {
  return (
    <AppShellSkeleton>
      <PageHeader
        title="Configuración"
        loading
        description="Cargando catálogos, personas y parámetros del sistema…"
      />
      <section className="grid gap-6 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)]">
        <aside className="space-y-2">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index} className="skeleton-shimmer h-9 w-full rounded-[2px]" />
          ))}
        </aside>
        <div className="surface-card p-[length:var(--density-inset-pad)]">
          <div className="skeleton-shimmer h-9 w-2/3 rounded-[2px]" />
          <div className="skeleton-shimmer mt-4 h-10 w-full rounded-[2px]" />
          <div className="skeleton-shimmer mt-2 h-10 w-full rounded-[2px]" />
          <div className="skeleton-shimmer mt-2 h-10 w-full rounded-[2px]" />
        </div>
      </section>
    </AppShellSkeleton>
  );
}
