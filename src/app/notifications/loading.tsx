import { AppShellSkeleton } from "@/components/layout/app-shell-skeleton";
import { PageHeader } from "@/components/common/page-header";

export default function NotificationsLoading() {
  return (
    <AppShellSkeleton>
      <PageHeader title="Avisos" description="Cargando alertas y estados de lectura para tus requerimientos…" />
      <section className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <article key={index} className="surface-card p-4">
            <div className="skeleton-shimmer h-4 w-2/5 rounded-[2px]" />
            <div className="skeleton-shimmer mt-3 h-3 w-full rounded-[2px]" />
            <div className="skeleton-shimmer mt-2 h-3 w-4/5 rounded-[2px]" />
          </article>
        ))}
      </section>
    </AppShellSkeleton>
  );
}
