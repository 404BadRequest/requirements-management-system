import { PageHeader } from "@/components/common/page-header";
import { RmsLoader } from "@/components/common/rms-loader";

export default function DashboardLoading() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-[1760px] space-y-6 px-3 py-4 sm:px-4">
        <PageHeader title="Dashboard general" description="Cargando indicadores y métricas consolidadas…" />

        <section className="surface-card p-[length:var(--density-inset-pad)]">
          <div className="flex flex-wrap items-end gap-4">
            <div className="w-full max-w-md space-y-2">
              <div className="skeleton-shimmer h-3 w-32 rounded-[2px]" />
              <div className="skeleton-shimmer h-10 w-full rounded-[2px]" />
            </div>
            <div className="skeleton-shimmer h-10 w-32 rounded-[2px]" />
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <article key={index} className="surface-card p-4">
              <div className="skeleton-shimmer h-3 w-28 rounded-[2px]" />
              <div className="skeleton-shimmer mt-3 h-8 w-20 rounded-[2px]" />
              <div className="skeleton-shimmer mt-3 h-3 w-36 rounded-[2px]" />
            </article>
          ))}
        </section>

        <section className="surface-card p-4">
          <div className="skeleton-shimmer h-5 w-52 rounded-[2px]" />
          <div className="skeleton-shimmer mt-3 h-32 w-full rounded-[2px]" />
        </section>

        <section className="grid gap-6 lg:grid-cols-12">
          <div className="skeleton-shimmer h-60 rounded-[2px] lg:col-span-12" />
          <div className="skeleton-shimmer h-56 rounded-[2px] lg:col-span-5" />
          <div className="skeleton-shimmer h-56 rounded-[2px] lg:col-span-7" />
          <div className="skeleton-shimmer h-56 rounded-[2px] lg:col-span-6" />
          <div className="skeleton-shimmer h-56 rounded-[2px] lg:col-span-6" />
          <div className="skeleton-shimmer h-56 rounded-[2px] lg:col-span-12" />
        </section>
      </main>
      <RmsLoader
        title="Cargando dashboard..."
        description="Calculando indicadores, gráficos y distribución de horas para esta vista."
      />
    </div>
  );
}
