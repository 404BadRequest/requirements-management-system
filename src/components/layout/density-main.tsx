"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useUiStore } from "@/store/ui-store";
import { cn } from "@/lib/utils/cn";

export function DensityMain({ children }: { children: ReactNode }) {
  const density = useUiStore((s) => s.density);
  const pathname = usePathname();

  return (
    <main
      id="main-content"
      key={pathname}
      className={cn(
        "route-content-enter mx-auto flex w-full max-w-[1760px] flex-1 flex-col",
        density === "compact"
          ? "gap-3 px-4 pb-5 pt-2 sm:px-5 lg:gap-4 lg:px-6"
          : "gap-4 px-4 pb-6 pt-4 sm:px-5 lg:gap-5 lg:px-6 lg:pb-8",
      )}
    >
      {children}
    </main>
  );
}
