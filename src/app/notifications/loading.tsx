import { PageHeader } from "@/components/common/page-header";
import { RmsLoader } from "@/components/common/rms-loader";

export default function NotificationsLoading() {
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto w-full max-w-[1760px] space-y-4 px-3 py-4 sm:px-4">
        <PageHeader
          title="Avisos"
          description="Cargando alertas y estados de lectura para tus requerimientos…"
        />
        <section className="space-y-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <article key={index} className="surface-card p-4">
              <div className="skeleton-shimmer h-4 w-2/5 rounded-[2px]" />
              <div className="skeleton-shimmer mt-3 h-3 w-full rounded-[2px]" />
              <div className="skeleton-shimmer mt-2 h-3 w-4/5 rounded-[2px]" />
            </article>
          ))}
        </section>
      </main>
      <RmsLoader
        title="Cargando avisos..."
        description="Sincronizando notificaciones y eventos recientes."
      />
    </div>
  );
}
