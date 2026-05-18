import { PageHeader } from "@/components/common/page-header";
import { RmsLoader } from "@/components/common/rms-loader";

export default function SettingsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-[1760px] space-y-4 px-3 py-4 sm:px-4">
        <PageHeader
          title="Configuración"
          description="Cargando catálogos, personas y parámetros del sistema…"
        />
        <section className="surface-card p-[length:var(--density-inset-pad)]">
          <div className="skeleton-shimmer h-5 w-40 rounded-[2px]" />
          <div className="skeleton-shimmer mt-3 h-3 w-full rounded-[2px]" />
          <div className="skeleton-shimmer mt-2 h-3 w-4/5 rounded-[2px]" />
        </section>
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
      </main>
      <RmsLoader
        title="Cargando configuración..."
        description="Preparando catálogos y parámetros administrativos."
      />
    </div>
  );
}
