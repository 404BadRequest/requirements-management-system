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
          ? "gap-5 px-4 pb-6 pt-3 sm:px-5 lg:gap-6 lg:px-6"
          : "gap-8 px-4 pb-10 pt-6 sm:px-6 lg:gap-10 lg:px-8 lg:pb-14",
      )}
    >
      {children}
    </main>
  );
}
