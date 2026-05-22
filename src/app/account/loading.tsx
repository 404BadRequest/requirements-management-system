import { AppShellSkeleton } from "@/components/layout/app-shell-skeleton";
import { PageHeader } from "@/components/common/page-header";

export default function AccountLoading() {
  return (
    <AppShellSkeleton>
      <PageHeader title="Mi cuenta"
        loading
        description="Cargando información de sesión y perfil actual…" />
      <section className="surface-card grid max-w-lg gap-3 p-[length:var(--density-inset-pad)] sm:grid-cols-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index}>
            <div className="skeleton-shimmer h-3 w-24 rounded-[2px]" />
            <div className="skeleton-shimmer mt-2 h-5 w-full rounded-[2px]" />
          </div>
        ))}
      </section>
    </AppShellSkeleton>
  );
}
