import { AppShellSkeleton } from "@/components/layout/app-shell-skeleton";

export default function TeamMemberLoading() {
  return (
    <AppShellSkeleton>
      <section className="surface-card p-[length:var(--density-inset-pad)]">
        <div className="flex items-start gap-4">
          <div className="skeleton-shimmer h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <div className="skeleton-shimmer h-4 w-24 rounded-[2px]" />
            <div className="skeleton-shimmer h-6 w-48 rounded-[2px]" />
            <div className="skeleton-shimmer h-4 w-64 rounded-[2px]" />
          </div>
        </div>
      </section>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="surface-card p-5">
            <div className="skeleton-shimmer h-3 w-20 rounded-[2px]" />
            <div className="skeleton-shimmer mt-3 h-8 w-16 rounded-[2px]" />
          </div>
        ))}
      </div>
      <section className="surface-card mt-4 p-[length:var(--density-inset-pad)]">
        <div className="skeleton-shimmer h-5 w-40 rounded-[2px]" />
        <div className="skeleton-shimmer mt-4 h-48 w-full rounded-[2px]" />
      </section>
    </AppShellSkeleton>
  );
}
