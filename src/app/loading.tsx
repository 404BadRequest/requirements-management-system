import { AppShellSkeleton } from "@/components/layout/app-shell-skeleton";

export default function Loading() {
  return (
    <AppShellSkeleton>
      <div className="space-y-4">
        <div className="skeleton-shimmer h-10 w-64 rounded-[2px]" />
        <div className="skeleton-shimmer h-4 w-96 rounded-[2px]" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="surface-card p-4">
              <div className="skeleton-shimmer h-3 w-24 rounded-[2px]" />
              <div className="skeleton-shimmer mt-3 h-8 w-20 rounded-[2px]" />
            </div>
          ))}
        </div>
      </div>
    </AppShellSkeleton>
  );
}
