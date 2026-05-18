import { PageHeader } from "@/components/common/page-header";
import { RmsLoader } from "@/components/common/rms-loader";

export default function TimeEntryDetailLoading() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-[1760px] space-y-4 px-3 py-4 sm:px-4">
        <PageHeader
          title="Ficha de horas"
          description="Cargando detalle de la hora y sus relaciones…"
          actions={<span className="skeleton-shimmer h-9 w-32 rounded-[2px]" />}
        />
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <article key={index} className="surface-card p-4">
              <div className="skeleton-shimmer h-3 w-28 rounded-[2px]" />
              <div className="skeleton-shimmer mt-3 h-6 w-2/3 rounded-[2px]" />
            </article>
          ))}
        </section>
        <section className="surface-card p-4">
          <div className="skeleton-shimmer h-5 w-48 rounded-[2px]" />
          <div className="skeleton-shimmer mt-3 h-24 w-full rounded-[2px]" />
        </section>
      </main>
      <RmsLoader
        title="Cargando horas..."
        description="Preparando horas, categoría, responsable y requerimiento vinculado."
      />
    </div>
  );
}
