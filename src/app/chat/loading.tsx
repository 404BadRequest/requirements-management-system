import { AppShellSkeleton } from "@/components/layout/app-shell-skeleton";
import { PageHeader } from "@/components/common/page-header";

export default function ChatLoading() {
  return (
    <AppShellSkeleton>
      <PageHeader
        title="Chat interno"
        loading
        description="Cargando conversaciones, presencia y mensajes recientes…"
      />
      <section className="grid gap-4 lg:grid-cols-[310px,minmax(0,1fr)]">
        <article className="surface-card p-3">
          <div className="skeleton-shimmer h-8 w-full rounded-[2px]" />
          <div className="mt-3 space-y-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="skeleton-shimmer h-16 w-full rounded-[2px]" />
            ))}
          </div>
        </article>
        <article className="surface-card p-3">
          <div className="skeleton-shimmer h-10 w-2/5 rounded-[2px]" />
          <div className="mt-3 space-y-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="skeleton-shimmer h-12 w-full rounded-[2px]" />
            ))}
          </div>
        </article>
      </section>
    </AppShellSkeleton>
  );
}
