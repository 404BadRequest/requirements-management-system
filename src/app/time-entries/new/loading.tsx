import { AppShellSkeleton } from "@/components/layout/app-shell-skeleton";
import { PageHeader } from "@/components/common/page-header";

export default function NewTimeEntryLoading() {
  return (
    <AppShellSkeleton>
      <PageHeader
        title="Nueva hora"
        description="Preparando formulario de registro de horas…"
        actions={<span className="skeleton-shimmer h-9 w-32 rounded-[2px]" />}
      />
      <section className="surface-card max-w-3xl p-[length:var(--density-inset-pad)]">
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, index) => (
            <div key={index}>
              <div className="skeleton-shimmer h-3 w-24 rounded-[2px]" />
              <div className="skeleton-shimmer mt-2 h-10 w-full rounded-[2px]" />
            </div>
          ))}
          <div className="skeleton-shimmer h-10 w-44 rounded-[2px]" />
        </div>
      </section>
    </AppShellSkeleton>
  );
}
