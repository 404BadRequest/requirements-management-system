import type { ReactNode } from "react";

/**
 * Lightweight static skeleton that reproduces the AppShell chrome
 * (header bar + main padding) without requiring async session data.
 * Used as the wrapper in all loading.tsx Suspense boundaries so the
 * header and nav are always visible during route transitions.
 */
export function AppShellSkeleton({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      {/* Header skeleton */}
      <header className="sticky top-0 z-30 border-b border-border bg-card shadow-soft">
        <div className="mx-auto flex w-full max-w-[1760px] items-center justify-between gap-3 px-3 py-2.5 sm:px-4">
          {/* Logo + nav skeleton */}
          <div className="flex items-center gap-3">
            <div className="skeleton-shimmer h-9 w-[21rem] rounded-[2px]" />
          </div>
          {/* Right controls skeleton */}
          <div className="flex items-center gap-2">
            <div className="skeleton-shimmer h-8 w-28 rounded-[2px]" />
            <div className="skeleton-shimmer h-8 w-8 rounded-[2px]" />
            <div className="skeleton-shimmer h-8 w-8 rounded-[2px]" />
            <div className="skeleton-shimmer h-8 w-8 rounded-[2px]" />
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto w-full max-w-[1760px] space-y-4 px-[length:var(--density-inset-pad)] py-[length:var(--density-inset-pad)]">
        {children}
      </main>
    </div>
  );
}
