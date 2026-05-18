import { PageHeader } from "@/components/common/page-header";
import { RmsLoader } from "@/components/common/rms-loader";

export default function RequirementDetailLoading() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-[1760px] space-y-4 px-3 py-4 sm:px-4">
        <PageHeader
          title="Detalle de requerimiento"
          description="Cargando historial, actividad e imputaciones relacionadas…"
          actions={<span className="skeleton-shimmer h-9 w-44 rounded-[2px]" />}
        />
        <section className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <article key={index} className="surface-card p-4">
              <div className="skeleton-shimmer h-3 w-24 rounded-[2px]" />
              <div className="skeleton-shimmer mt-3 h-6 w-2/3 rounded-[2px]" />
            </article>
          ))}
        </section>
        <section className="surface-card p-4">
          <div className="skeleton-shimmer h-5 w-40 rounded-[2px]" />
          <div className="space-y-2 pt-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="skeleton-shimmer h-12 w-full rounded-[2px]" />
            ))}
          </div>
        </section>
        <section className="surface-card p-4">
          <div className="skeleton-shimmer h-5 w-52 rounded-[2px]" />
          <div className="skeleton-shimmer mt-3 h-40 w-full rounded-[2px]" />
        </section>
      </main>
      <RmsLoader
        title="Cargando requerimiento..."
        description="Recuperando detalle, comentarios e historial de cambios."
      />
    </div>
  );
}
